import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { semanticMatchWorkflow } from '@/lib/embeddings'

export const revalidate = 300
export const runtime = 'nodejs'

// Keyword → workflow mapping (mirrors /api/route)
const TASK_KEYWORDS: Record<string, string[]> = {
  'research-competitive-intelligence': ['research', 'scrape', 'crawl', 'extract', 'competitor', 'pricing', 'web search', 'find information', 'look up', 'gather data'],
  'developer-workflow-code-management': ['code', 'repository', 'repo', 'pull request', 'pr', 'commit', 'github', 'codebase', 'refactor', 'debug', 'deploy'],
  'qa-testing-automation': ['browser', 'navigate', 'click', 'fill form', 'screenshot', 'test', 'automate', 'playwright', 'e2e'],
  'data-analysis-reporting': ['database', 'sql', 'query', 'bigquery', 'postgres', 'analytics', 'report', 'data analysis', 'dashboard'],
  'sales-research-outreach': ['prospect', 'lead', 'crm', 'salesforce', 'hubspot', 'enrich', 'outreach', 'pipeline', 'sales'],
  'content-creation-publishing': ['content', 'blog', 'article', 'publish', 'cms', 'seo', 'write', 'draft', 'social media'],
  'customer-support-automation': ['support', 'ticket', 'triage', 'issue', 'jira', 'helpdesk', 'customer'],
  'knowledge-management': ['notion', 'confluence', 'wiki', 'knowledge base', 'documentation', 'docs', 'notes'],
  'design-to-code-workflow': ['figma', 'design', 'ui', 'component', 'layout', 'mockup', 'wireframe'],
  'it-devops-platform-operations': ['aws', 'cloud', 'infrastructure', 'devops', 'kubernetes', 'docker', 'terraform'],
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() })
}

function normalize(score: number | null | undefined): number | null {
  if (score == null) return null
  return score > 10 ? score / 10 : score
}

function matchWorkflow(task: string): string | null {
  const lower = task.toLowerCase()
  let best: string | null = null
  let bestScore = 0
  for (const [wf, kws] of Object.entries(TASK_KEYWORDS)) {
    let score = 0
    for (const kw of kws) {
      if (lower.includes(kw)) score += kw.length
    }
    if (score > bestScore) { bestScore = score; best = wf }
  }
  return best
}

function buildWhy(skill: any, priority: string, workflow: string | null, runnerUp: any): string {
  const scores = skill.skill_scores || {}
  const vs = normalize(scores.value_score ?? scores.overall_score)
  const parts: string[] = []

  parts.push(`${skill.canonical_name} scores ${vs?.toFixed(1) ?? '?'}/10 value.`)

  // Count dimensions where this tool leads
  if (runnerUp) {
    const rScores = runnerUp.skill_scores || {}
    const dims = ['output_score', 'reliability_score', 'efficiency_score', 'cost_score', 'trust_score']
    let wins = 0
    let bestDim = ''
    let bestDelta = 0
    for (const d of dims) {
      const wVal = normalize(scores[d]) ?? 0
      const rVal = normalize(rScores[d]) ?? 0
      if (wVal > rVal + 0.05) {
        wins++
        if (wVal - rVal > bestDelta) {
          bestDelta = wVal - rVal
          bestDim = d.replace('_score', '').replace(/_/g, ' ')
        }
      }
    }
    if (wins > 0) {
      parts.push(`Leads in ${wins}/5 dimensions${bestDim ? `, strongest in ${bestDim} (+${bestDelta.toFixed(1)})` : ''}.`)
    }
  }

  if (priority !== 'best_value') {
    parts.push(`Selected for ${priority.replace(/_/g, ' ')} priority.`)
  }
  if (workflow) {
    parts.push(`Matched to ${workflow.replace(/-/g, ' ')}.`)
  }

  return parts.join(' ')
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const task = searchParams.get('task') || ''
  const explicitWorkflow = searchParams.get('workflow') || ''
  const priority = searchParams.get('priority') || 'best_value'
  const trustFloor = parseFloat(searchParams.get('trust_floor') || '0') || 0
  const limit = Math.min(parseInt(searchParams.get('limit') || '3') || 3, 10)

  if (!task && !explicitWorkflow) {
    return NextResponse.json(
      { error: 'Provide ?task= (natural language) or ?workflow= (slug). Example: /api/recommend?task=scrape+competitor+pricing' },
      { status: 400, headers: corsHeaders() }
    )
  }

  const supabase = createServerSupabaseClient()

  // Resolve workflow
  let resolvedWorkflow = explicitWorkflow || ''
  let confidence = explicitWorkflow ? 0.95 : 0.5
  let matchMethod: 'explicit' | 'semantic' | 'keyword' = explicitWorkflow ? 'explicit' : 'keyword'

  if (!explicitWorkflow && task) {
    const semanticResult = await semanticMatchWorkflow(task)
    if (semanticResult.method === 'semantic' && semanticResult.similarity > 0.3) {
      resolvedWorkflow = semanticResult.workflow
      confidence = Math.min(0.95, 0.65 + semanticResult.similarity * 0.3)
      matchMethod = 'semantic'
    } else {
      resolvedWorkflow = matchWorkflow(task) || ''
      // Keyword confidence
      if (resolvedWorkflow) {
        const lower = task.toLowerCase()
        const kws = TASK_KEYWORDS[resolvedWorkflow] || []
        let matched = 0
        for (const kw of kws) { if (lower.includes(kw)) matched++ }
        confidence = Math.min(0.92, 0.5 + matched * 0.1)
      }
      matchMethod = 'keyword'
    }
  }

  // Fetch skills
  const { data: skills } = await supabase
    .from('skills')
    .select(`
      id, slug, canonical_name, short_description, vendor_type,
      skill_scores ( overall_score, value_score, output_score, reliability_score, efficiency_score, cost_score, trust_score ),
      skill_metrics ( github_stars, days_since_last_commit )
    `)
    .eq('status', 'active')
    .not('skill_scores', 'is', null)
    .limit(50)

  if (!skills || skills.length === 0) {
    return NextResponse.json(
      { recommendation: null, confidence: 0, message: 'No scored servers found yet.' },
      { headers: corsHeaders() }
    )
  }

  // Filter by trust floor
  let candidates = skills.filter((s: any) => {
    const trust = normalize(s.skill_scores?.trust_score) ?? 0
    return trust >= trustFloor
  })

  // Filter by workflow junction table
  if (resolvedWorkflow) {
    const { data: wfSkills } = await supabase
      .from('skill_workflows')
      .select('skill_id, workflows!inner(slug)')
      .eq('workflows.slug', resolvedWorkflow)

    if (wfSkills && wfSkills.length > 0) {
      const matchedIds = new Set(wfSkills.map((ws: any) => ws.skill_id))
      const wfFiltered = candidates.filter((s: any) => matchedIds.has(s.id))
      if (wfFiltered.length > 0) {
        candidates = wfFiltered
        confidence = Math.min(0.97, confidence + 0.05)
      }
    }
  }

  // Sort by priority
  const sorted = [...candidates].sort((a: any, b: any) => {
    const sa = a.skill_scores || {}
    const sb = b.skill_scores || {}
    switch (priority) {
      case 'best_quality': return (normalize(sb.output_score) ?? 0) - (normalize(sa.output_score) ?? 0)
      case 'best_efficiency': return (normalize(sb.efficiency_score) ?? 0) - (normalize(sa.efficiency_score) ?? 0)
      case 'lowest_cost': return (normalize(sb.cost_score) ?? 0) - (normalize(sa.cost_score) ?? 0)
      case 'highest_trust': return (normalize(sb.trust_score) ?? 0) - (normalize(sa.trust_score) ?? 0)
      case 'most_reliable': return (normalize(sb.reliability_score) ?? 0) - (normalize(sa.reliability_score) ?? 0)
      default: return (normalize(sb.value_score ?? sb.overall_score) ?? 0) - (normalize(sa.value_score ?? sa.overall_score) ?? 0)
    }
  })

  if (sorted.length === 0) {
    return NextResponse.json(
      { recommendation: null, confidence: 0, message: 'No servers match your constraints.' },
      { headers: corsHeaders() }
    )
  }

  const top = sorted[0] as any
  const runnerUp = sorted.length > 1 ? sorted[1] as any : null
  const topScores = top.skill_scores || {}

  // Outcome count for confidence boost
  const { count: outcomeCount } = await supabase
    .from('outcome_records')
    .select('id', { count: 'exact', head: true })
    .eq('skill_id', top.id)

  if ((outcomeCount ?? 0) > 0) {
    confidence = Math.min(0.99, confidence + Math.min(0.08, Math.log10((outcomeCount ?? 0) + 1) * 0.03))
  }

  const alts = sorted.slice(1, limit).map((s: any) => ({
    slug: s.slug,
    name: s.canonical_name,
    value_score: normalize(s.skill_scores?.value_score ?? s.skill_scores?.overall_score),
  }))

  // Fire-and-forget telemetry
  trackRecommendation(supabase).catch(() => {})

  const response = {
    recommendation: {
      slug: top.slug,
      name: top.canonical_name,
      value_score: normalize(topScores.value_score ?? topScores.overall_score),
      scores: {
        output: normalize(topScores.output_score),
        reliability: normalize(topScores.reliability_score),
        efficiency: normalize(topScores.efficiency_score),
        cost: normalize(topScores.cost_score),
        trust: normalize(topScores.trust_score),
      },
      why: buildWhy(top, priority, resolvedWorkflow || null, runnerUp),
    },
    alternatives: alts,
    confidence: Math.round(confidence * 100) / 100,
    match_method: matchMethod,
    connect: {
      mcp_endpoint: 'https://toolroute.io/api/mcp',
      detail_url: `https://toolroute.io/mcp-servers/${top.slug}`,
      one_liner: `curl 'https://toolroute.io/api/recommend?task=${encodeURIComponent(task || resolvedWorkflow)}'`,
      report_back: `POST https://toolroute.io/api/report { "skill_slug": "${top.slug}", "outcome": "success", "latency_ms": 1234 }`,
    },
    earn_credits: {
      report_outcome: '+3 to +10 routing credits',
      comparative_eval: '+8 to +25 routing credits',
      benchmark_mission: '+15 to +40 routing credits',
      message: 'Report outcomes to earn credits and improve routing for all agents.',
    },
    meta: {
      candidates_evaluated: candidates.length,
      workflow_resolved: resolvedWorkflow || null,
      priority_mode: priority,
      outcome_count: outcomeCount ?? 0,
    },
  }

  return NextResponse.json(response, { headers: corsHeaders() })
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
