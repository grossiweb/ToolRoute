import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { semanticMatchWorkflow } from '@/lib/embeddings'

// Task keywords → workflow slug mapping for NL task matching
const TASK_WORKFLOW_MAP: Record<string, string[]> = {
  'research-competitive-intelligence': [
    'research', 'scrape', 'crawl', 'extract', 'competitor', 'pricing',
    'web search', 'find information', 'look up', 'gather data', 'source finding',
  ],
  'developer-workflow-code-management': [
    'code', 'repository', 'repo', 'pull request', 'pr', 'commit', 'branch',
    'github', 'codebase', 'refactor', 'debug', 'deploy', 'ci/cd',
  ],
  'qa-testing-automation': [
    'browser', 'navigate', 'click', 'fill form', 'screenshot', 'test',
    'automate', 'playwright', 'selenium', 'e2e', 'end-to-end',
  ],
  'data-analysis-reporting': [
    'database', 'sql', 'query', 'bigquery', 'postgres', 'analytics',
    'report', 'data analysis', 'dashboard', 'chart', 'aggregate',
  ],
  'sales-research-outreach': [
    'prospect', 'lead', 'crm', 'salesforce', 'hubspot', 'enrich',
    'outreach', 'pipeline', 'sales', 'contact', 'company data',
  ],
  'content-creation-publishing': [
    'content', 'blog', 'article', 'publish', 'cms', 'seo',
    'write', 'draft', 'editorial', 'social media',
  ],
  'customer-support-automation': [
    'support', 'ticket', 'triage', 'issue', 'jira', 'helpdesk',
    'customer', 'escalation', 'incident',
  ],
  'knowledge-management': [
    'notion', 'confluence', 'wiki', 'knowledge base', 'documentation',
    'docs', 'notes', 'workspace',
  ],
  'design-to-code-workflow': [
    'figma', 'design', 'ui', 'component', 'layout', 'mockup',
    'wireframe', 'prototype',
  ],
  'it-devops-platform-operations': [
    'aws', 'cloud', 'infrastructure', 'devops', 'deploy', 'monitor',
    'kubernetes', 'docker', 'terraform',
  ],
}

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const {
    task,
    workflow_slug: explicitWorkflow,
    vertical_slug,
    constraints = {},
  } = body

  const {
    priority = 'best_value',
    max_cost_usd,
    trust_floor = 0,
    latency_preference = 'medium',
  } = constraints

  // Require either task or workflow_slug
  if (!task && !explicitWorkflow) {
    return NextResponse.json(
      { error: 'Either "task" (natural language) or "workflow_slug" is required.' },
      { status: 400 }
    )
  }

  // Resolve workflow from task if not explicitly provided
  let resolvedWorkflow = explicitWorkflow || ''
  let confidence = explicitWorkflow ? 0.95 : 0.5
  let matchMethod: 'explicit' | 'semantic' | 'keyword' = explicitWorkflow ? 'explicit' : 'keyword'

  if (!explicitWorkflow && task) {
    // Try semantic matching first
    const semanticResult = await semanticMatchWorkflow(task)

    if (semanticResult.method === 'semantic' && semanticResult.similarity > 0.3) {
      resolvedWorkflow = semanticResult.workflow
      // Semantic confidence: similarity score maps to 0.65-0.95 range
      confidence = Math.min(0.95, 0.65 + semanticResult.similarity * 0.3)
      matchMethod = 'semantic'
    } else {
      // Fall back to keyword matching
      resolvedWorkflow = matchWorkflowFromTask(task)
      confidence = calcTaskConfidence(task, resolvedWorkflow)
      matchMethod = 'keyword'
    }
  }

  // Fetch skills with scores
  let query = supabase
    .from('skills')
    .select(`
      id, slug, canonical_name, short_description, vendor_type,
      skill_scores ( overall_score, trust_score, reliability_score, output_score, efficiency_score, cost_score, value_score ),
      skill_metrics ( github_stars, days_since_last_commit ),
      skill_cost_models ( monthly_base_cost_usd, pricing_model )
    `)
    .eq('status', 'active')
    .not('skill_scores', 'is', null)
    .limit(50)

  const { data: skills } = await query

  if (!skills || skills.length === 0) {
    return NextResponse.json({
      recommended_skill: null,
      confidence: 0,
      message: 'No scored skills found yet. Data accumulating.',
    })
  }

  // Filter by trust floor
  const filtered = skills.filter((s: any) => {
    const trust = s.skill_scores?.trust_score ?? 0
    return trust >= trust_floor
  })

  // Filter by max cost if specified
  const costFiltered = max_cost_usd != null
    ? filtered.filter((s: any) => {
        const cost = s.skill_cost_models?.monthly_base_cost_usd
        return cost == null || cost <= max_cost_usd
      })
    : filtered

  let candidates = costFiltered.length > 0 ? costFiltered : filtered

  // If we resolved a workflow, filter by junction table (skill_workflows)
  if (resolvedWorkflow) {
    const { data: workflowSkillIds } = await supabase
      .from('skill_workflows')
      .select('skill_id, workflows!inner(slug)')
      .eq('workflows.slug', resolvedWorkflow)

    if (workflowSkillIds && workflowSkillIds.length > 0) {
      const matchedIds = new Set(workflowSkillIds.map((ws: any) => ws.skill_id))
      const workflowFiltered = candidates.filter((s: any) => matchedIds.has(s.id))
      if (workflowFiltered.length > 0) {
        candidates = workflowFiltered
      }
      // If no candidates survive the junction filter, fall back to unfiltered list
    }
  }

  // Sort by priority mode
  const sorted = [...candidates].sort((a: any, b: any) => {
    const sa = a.skill_scores
    const sb = b.skill_scores
    if (!sa || !sb) return 0
    switch (priority) {
      case 'best_quality': return (sb.output_score || 0) - (sa.output_score || 0)
      case 'best_efficiency': return (sb.efficiency_score || 0) - (sa.efficiency_score || 0)
      case 'lowest_cost': return (sb.cost_score || 0) - (sa.cost_score || 0)
      case 'highest_trust': return (sb.trust_score || 0) - (sa.trust_score || 0)
      case 'most_reliable': return (sb.reliability_score || 0) - (sa.reliability_score || 0)
      default: return (sb.value_score || sb.overall_score || 0) - (sa.value_score || sa.overall_score || 0)
    }
  })

  if (sorted.length === 0) {
    return NextResponse.json({
      recommended_skill: null,
      confidence: 0,
      message: 'No skills match your constraints. Try relaxing trust_floor or max_cost_usd.',
    })
  }

  const top = sorted[0] as any
  const alternatives = sorted.slice(1, 4).map((s: any) => s.slug)

  // Fetch outcome count for the recommended skill (more data = higher confidence)
  const { count: outcomeCount } = await supabase
    .from('outcome_records')
    .select('id', { count: 'exact', head: true })
    .eq('skill_id', top.id)

  const dataBackedOutcomeCount = outcomeCount ?? 0

  // Adjust confidence: boost when we have junction-table matches and outcome data
  let adjustedConfidence = confidence
  if (resolvedWorkflow && candidates.length < (costFiltered.length > 0 ? costFiltered : filtered).length) {
    // Junction table narrowed the results — boost confidence
    adjustedConfidence = Math.min(0.97, adjustedConfidence + 0.05)
  }
  if (dataBackedOutcomeCount > 0) {
    // More outcome records = higher confidence, diminishing returns
    const outcomeBoost = Math.min(0.08, Math.log10(dataBackedOutcomeCount + 1) * 0.03)
    adjustedConfidence = Math.min(0.99, adjustedConfidence + outcomeBoost)
  }

  // Recommend combo if available
  const combo = await getRecommendedCombo(supabase, top.slug, alternatives)

  // Determine fallback
  const fallback = alternatives.length > 0 ? alternatives[0] : null

  // Track telemetry rate (increment recommendations)
  trackRecommendation(supabase).catch(() => {})

  return NextResponse.json({
    recommended_skill: top.slug,
    recommended_skill_name: top.canonical_name,
    confidence: Math.round(adjustedConfidence * 100) / 100,
    reasoning: buildReasoning(top, priority, task, resolvedWorkflow),
    alternatives,
    recommended_combo: combo,
    fallback,
    scores: top.skill_scores,
    outcome_count: dataBackedOutcomeCount,
    non_mcp_alternative: getNonMcpAlternative(resolvedWorkflow),
    routing_metadata: {
      resolved_workflow: resolvedWorkflow,
      priority_mode: priority,
      candidates_evaluated: candidates.length,
      junction_table_filtered: resolvedWorkflow ? true : false,
      trust_floor_applied: trust_floor,
      latency_preference: latency_preference,
      match_method: matchMethod,
    },
    wanted_telemetry: {
      report_endpoint: '/api/report',
      reward_multiplier: 1.5,
      comparative_bonus: 2.5,
      estimated_credits: {
        run_report: '+3 to +10 routing credits',
        comparative_eval: '+8 to +25 routing credits',
        fallback_chain: '+5 to +15 routing credits',
        benchmark_package: '+15 to +40 routing credits',
      },
      fields: ['latency_ms', 'cost_usd', 'quality_rating', 'outcome', 'fallback_chain'],
      one_liner: `toolroute.report({ skill: '${top.slug}', outcome: 'success', latency_ms: 2340 })`,
    },
  })
}

function matchWorkflowFromTask(task: string): string {
  if (!task) return 'research-competitive-intelligence'
  const lower = task.toLowerCase()

  let bestMatch = 'research-competitive-intelligence'
  let bestScore = 0

  for (const [workflow, keywords] of Object.entries(TASK_WORKFLOW_MAP)) {
    let score = 0
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        score += kw.length // longer keyword matches are more specific
      }
    }
    if (score > bestScore) {
      bestScore = score
      bestMatch = workflow
    }
  }

  return bestMatch
}

function calcTaskConfidence(task: string, resolvedWorkflow: string): number {
  if (!task) return 0.5
  const lower = task.toLowerCase()
  const keywords = TASK_WORKFLOW_MAP[resolvedWorkflow] || []

  let matchedKeywords = 0
  for (const kw of keywords) {
    if (lower.includes(kw)) matchedKeywords++
  }

  // Base confidence from keyword matches, capped at 0.92
  const keywordConfidence = Math.min(0.92, 0.5 + (matchedKeywords * 0.1))
  return Math.round(keywordConfidence * 100) / 100
}

function buildReasoning(skill: any, priority: string, task: string | undefined, workflow: string): string {
  const scores = skill.skill_scores
  if (!scores) return 'Recommended based on catalog metadata.'

  const valueScore = scores.value_score?.toFixed(1) ?? scores.overall_score?.toFixed(1)
  const parts: string[] = []

  parts.push(`${skill.canonical_name} scores ${valueScore}/10 value.`)

  if (priority !== 'best_value') {
    parts.push(`Selected for ${priority.replace(/_/g, ' ')} priority.`)
  } else {
    parts.push('Highest value score in this category with strong reliability.')
  }

  if (task) {
    parts.push(`Matched to workflow: ${workflow.replace(/-/g, ' ')}.`)
  }

  return parts.join(' ')
}

async function getRecommendedCombo(
  supabase: any,
  topSkillSlug: string,
  alternativeSlugs: string[]
): Promise<string[] | null> {
  // Find combinations that include the top skill
  const { data: combos } = await supabase
    .from('combination_skills')
    .select(`
      combination_id,
      skill:skills ( slug ),
      combinations ( slug, name )
    `)
    .limit(20)

  if (!combos || combos.length === 0) return null

  // Group by combination and find one that includes our top skill
  const comboMap = new Map<string, string[]>()
  for (const c of combos) {
    const comboSlug = (c as any).combinations?.slug
    const skillSlug = (c as any).skill?.slug
    if (!comboSlug || !skillSlug) continue
    if (!comboMap.has(comboSlug)) comboMap.set(comboSlug, [])
    comboMap.get(comboSlug)!.push(skillSlug)
  }

  const keys = Array.from(comboMap.keys())
  for (const key of keys) {
    const skillSlugs = comboMap.get(key)!
    if (skillSlugs.includes(topSkillSlug)) {
      return skillSlugs
    }
  }

  return null
}

function getNonMcpAlternative(workflowSlug: string): object | null {
  const alternatives: Record<string, object> = {
    'developer-workflow-code-management': {
      approach: 'direct_cli',
      example: 'gh issue list --repo owner/repo',
      when_to_prefer: 'Simple read-only queries where speed matters more than LLM reasoning',
      tradeoff: 'No LLM context about results, but 3-5x faster with no token overhead',
    },
    'data-analysis-reporting': {
      approach: 'direct_api',
      example: 'Direct SQL via psql or database client',
      when_to_prefer: 'Structured, deterministic queries where the schema is known',
      tradeoff: 'No natural language interface, but faster and cheaper for batch operations',
    },
    'research-competitive-intelligence': {
      approach: 'direct_api',
      example: 'curl https://api.example.com/search?q=query',
      when_to_prefer: 'Simple deterministic queries where speed matters more than reasoning',
      tradeoff: 'No LLM synthesis, but lower cost and predictable latency',
    },
    'it-devops-platform-operations': {
      approach: 'direct_cli',
      example: 'aws ec2 describe-instances --filters ...',
      when_to_prefer: 'Well-known CLI commands with predictable outputs',
      tradeoff: 'No intelligent interpretation, but zero token cost and sub-second latency',
    },
  }
  return alternatives[workflowSlug] || null
}

async function trackRecommendation(supabase: any) {
  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const periodEnd = new Date(periodStart.getTime() + 24 * 60 * 60 * 1000)

  const { data: existing } = await supabase
    .from('telemetry_rate_tracking')
    .select('id, total_recommendations')
    .gte('period_start', periodStart.toISOString())
    .lt('period_end', periodEnd.toISOString())
    .single()

  if (existing) {
    await supabase.from('telemetry_rate_tracking')
      .update({ total_recommendations: existing.total_recommendations + 1 })
      .eq('id', existing.id)
  } else {
    await supabase.from('telemetry_rate_tracking').insert({
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      total_recommendations: 1,
      total_reported_runs: 0,
      telemetry_rate: 0,
    })
  }
}
