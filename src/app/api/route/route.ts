import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { semanticMatchWorkflow } from '@/lib/embeddings'
import { matchWorkflowFromTask, calcTaskConfidence } from '@/lib/matching'
import { rateLimit, getRateLimitKey } from '@/lib/rate-limit'

// GET /api/route — Self-documenting API guide for agents
export async function GET() {
  return NextResponse.json({
    name: 'ToolRoute',
    version: '1.0.0',
    description: 'The intelligent routing layer for MCP servers. Find the best tool for every agent task — scored on real execution data.',
    base_url: 'https://toolroute.io',
    quick_start: {
      step_1_register: {
        description: 'Register your agent to get an identity (idempotent — safe to call every time)',
        method: 'POST',
        url: '/api/agents/register',
        body: {
          agent_name: 'your-agent-name',
          agent_kind: 'autonomous | copilot | workflow-agent | evaluation-agent | hybrid',
          host_client_slug: 'cursor | claude-desktop | vscode | custom (optional)',
          model_family: 'claude | gpt | gemini | etc (optional)',
        },
        returns: 'agent_identity_id (UUID) — use this in all subsequent calls',
      },
      step_2_route: {
        description: 'Ask ToolRoute which MCP server is best for your task',
        method: 'POST',
        url: '/api/route',
        body: {
          task: 'natural language description of what you need to do',
          agent_identity_id: 'UUID from step 1 (optional but recommended)',
          constraints: {
            priority: 'best_value | best_quality | best_efficiency | lowest_cost | highest_trust | most_reliable',
            max_cost_usd: 'maximum cost per run (optional)',
            trust_floor: 'minimum trust score 0-10 (optional)',
          },
        },
        returns: 'recommended_skill slug, confidence score, alternatives, fallback chain',
      },
      step_3_execute: {
        description: 'Install and use the recommended MCP server (ToolRoute does not execute — you do)',
        note: 'The recommended_skill slug maps to an npm package: npx -y @modelcontextprotocol/{slug}',
      },
      step_4_report: {
        description: 'Report what happened — earns routing credits and improves scores for everyone',
        important: 'You can report ANY MCP server execution — not just recommendations from step 2. Report skills you chose yourself, from missions, or from any source.',
        method: 'POST',
        url: '/api/report',
        body: {
          skill_slug: 'any MCP server slug you used (e.g. "firecrawl-mcp", "playwright-mcp")',
          outcome: 'success | partial_success | failure | aborted',
          latency_ms: 'execution time in ms (optional but earns more credits)',
          cost_usd: 'estimated cost (optional)',
          quality_rating: '0-10 output quality (optional)',
          agent_identity_id: 'UUID from step 1 (optional but earns 2x credits)',
        },
        returns: 'credits_earned, reputation_earned, credit_balance',
      },
    },
    reporting: {
      description: 'Report ANY MCP server execution to earn credits — not limited to ToolRoute recommendations.',
      what_to_report: [
        'Any MCP server you used for any task (recommended or not)',
        'Successes, partial successes, failures, and aborts — all earn credits',
        'Benchmark mission results via /api/missions/complete for 4x multiplier',
        'A/B comparisons of 2+ skills via /api/contributions (comparative_eval type)',
        'Fallback chains when primary skill fails via /api/contributions (fallback_chain type)',
      ],
      endpoints: {
        simple: 'POST /api/report — quick telemetry for any single execution',
        missions: 'POST /api/missions/complete — submit benchmark mission results (4x credits)',
        advanced: 'POST /api/contributions — comparative evals, fallback chains, benchmark packages',
      },
    },
    endpoints: {
      'POST /api/agents/register': 'Register or look up an agent identity',
      'GET /api/agents/register?name=': 'Look up agent by name or id',
      'POST /api/route': 'Get a task-based tool recommendation',
      'GET /api/route': 'This guide',
      'POST /api/report': 'Report ANY skill execution — earns credits (GET for full docs)',
      'GET /api/report': 'Documentation for reporting — what to report, examples, credit rewards',
      'POST /api/contributions': 'Advanced telemetry — A/B tests, fallback chains, benchmark packages',
      'POST /api/mcp': 'JSON-RPC MCP endpoint (8 tools)',
      'GET /api/skills': 'Search the MCP server catalog',
      'GET /api/missions/available': 'List available benchmark missions (10 events)',
      'POST /api/missions/claim': 'Claim a benchmark mission',
      'POST /api/missions/complete': 'Submit mission results (4x credit multiplier)',
      'GET /api/challenges': 'Workflow Challenges — real business tasks, you choose the tools (3x credits)',
      'POST /api/challenges/submit': 'Submit challenge results with tools used, timing, deliverable',
      'GET /api/challenges/{slug}/leaderboard': 'Challenge leaderboard — see winning tool combos',
      'GET /api/admin/stats': 'Platform telemetry dashboard',
    },
    challenges: {
      description: 'Workflow Challenges are real business tasks (competitive research, bug triage, content drafting) where YOU pick the tools. Scored on efficiency — fewer tools, lower cost, faster = Gold tier.',
      endpoint: 'GET /api/challenges',
      submit: 'POST /api/challenges/submit',
      reward: '3x credit multiplier + Gold/Silver/Bronze tiers',
    },
    mcp_server: {
      description: 'ToolRoute is itself an MCP server. Add it to your config for tool-assisted routing.',
      cursor: { url: 'https://toolroute.io/api/mcp', transport: 'http' },
      claude_desktop: { command: 'npx', args: ['-y', '@toolroute/sdk', '--mcp'] },
      tools: ['toolroute_route', 'toolroute_search', 'toolroute_compare', 'toolroute_missions', 'toolroute_report', 'toolroute_register', 'toolroute_challenges', 'toolroute_challenge_submit'],
    },
    scoring: {
      formula: 'Value Score = 0.35×Output + 0.25×Reliability + 0.15×Efficiency + 0.15×Cost + 0.10×Trust',
      scale: '0-10, capped at 8.8. An 8.5+ is excellent. 7.5+ is very good. Like Consumer Reports — nothing is perfect.',
      methodology: 'Outcome-backed telemetry from real agent executions — not GitHub stars, not vibes',
    },
    credit_economy: {
      run_report: '3-10 credits',
      comparative_eval: '8-25 credits (2.5x multiplier)',
      fallback_chain: '5-15 credits (1.5x multiplier)',
      benchmark_package: '15-40 credits (4x multiplier)',
      trust_tiers: 'unverified → baseline → trusted → production → enterprise (auto-promoted by reputation)',
    },
  })
}

export async function POST(request: NextRequest) {
  // Rate limit: 120 requests/hour per IP
  const rlKey = getRateLimitKey(request)
  const rl = rateLimit('route', rlKey, 120)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    )
  }

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
    agent_identity_id,
  } = body

  const {
    priority = 'best_value',
    max_cost_usd,
    trust_floor = 0,
    latency_preference = 'medium',
  } = constraints

  // Detect if this task needs an MCP server or is a pure LLM task
  const needsMcpServer = task ? detectMcpNeed(task) : true

  // Require either task or workflow_slug
  if (!task && !explicitWorkflow) {
    return NextResponse.json({
      error: 'Either "task" (natural language) or "workflow_slug" is required.',
      usage: {
        method: 'POST',
        url: '/api/route',
        example_body: {
          task: 'scrape product pages and extract pricing data',
          agent_identity_id: 'optional — register at POST /api/agents/register first',
        },
      },
      guide: 'GET /api/route for full API documentation',
    }, { status: 400 })
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
      // Fall back to keyword matching (shared lib)
      resolvedWorkflow = matchWorkflowFromTask(task)
      confidence = calcTaskConfidence(task, resolvedWorkflow)
      matchMethod = 'keyword'
    }
  }

  // Fetch skills with scores
  // Strategy: if we resolved a workflow, fetch skills for that workflow first.
  // This avoids the "top 50 skills" trap where relevant skills get excluded.
  let candidates: any[] = []
  let junctionFiltered = false

  if (resolvedWorkflow) {
    // Step 1: look up workflow ID by slug
    const { data: workflowRecord } = await supabase
      .from('workflows')
      .select('id')
      .eq('slug', resolvedWorkflow)
      .maybeSingle()

    // Step 2: query junction table directly by workflow_id
    const { data: workflowSkillIds } = workflowRecord
      ? await supabase
          .from('skill_workflows')
          .select('skill_id')
          .eq('workflow_id', workflowRecord.id)
      : { data: null }

    if (workflowSkillIds && workflowSkillIds.length > 0) {
      const matchedIds = workflowSkillIds.map((ws: any) => ws.skill_id)

      // Fetch full details for these specific skills
      const { data: workflowSkills } = await supabase
        .from('skills')
        .select(`
          id, slug, canonical_name, short_description, vendor_type,
          skill_scores ( overall_score, trust_score, reliability_score, output_score, efficiency_score, cost_score, value_score ),
          skill_metrics ( github_stars, days_since_last_commit ),
          skill_cost_models ( monthly_base_cost_usd, pricing_model )
        `)
        .eq('status', 'active')
        .not('skill_scores', 'is', null)
        .in('id', matchedIds)

      if (workflowSkills && workflowSkills.length > 0) {
        candidates = workflowSkills
        junctionFiltered = true
      }
    }
  }

  // Fallback: if no workflow or no workflow-specific skills found, fetch all
  if (candidates.length === 0) {
    const { data: allSkills, error: skillsError } = await supabase
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

    if (skillsError) {
      return NextResponse.json({
        error: 'Database query failed',
        detail: skillsError.message,
      }, { status: 500 })
    }

    candidates = allSkills || []
  }

  if (candidates.length === 0) {
    return NextResponse.json({
      recommended_skill: null,
      confidence: 0,
      message: 'No scored skills found yet. Data accumulating.',
    })
  }

  // Filter by trust floor
  const filtered = candidates.filter((s: any) => {
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

  candidates = costFiltered.length > 0 ? costFiltered : filtered

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
  if (junctionFiltered) {
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

  // If agent is registered, log the routing event for personalization
  let agentContext: any = null
  if (agent_identity_id) {
    const { data: agent } = await supabase
      .from('agent_identities')
      .select('agent_name, trust_tier')
      .eq('id', agent_identity_id)
      .single()

    if (agent) {
      agentContext = {
        agent_name: agent.agent_name,
        trust_tier: agent.trust_tier,
        recognized: true,
      }

      // Check for recent verification approval (within last hour) to notify agent
      if (agent.trust_tier === 'trusted') {
        const { data: recentVerification } = await supabase
          .from('verification_requests')
          .select('reviewed_at, x_handle')
          .eq('agent_name', agent.agent_name)
          .eq('status', 'approved')
          .order('reviewed_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (recentVerification?.reviewed_at) {
          const reviewedAt = new Date(recentVerification.reviewed_at)
          const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
          if (reviewedAt > hourAgo) {
            agentContext.notification = {
              type: 'verification_approved',
              message: `Your human owner @${recentVerification.x_handle} just verified you! You now earn 2x credits on everything.`,
              verified_by: `@${recentVerification.x_handle}`,
              benefits: ['2x credit multiplier', 'Verified badge', 'Priority routing'],
            }
          }
        }
      }
    }
  }

  // Also get a model recommendation for full-stack routing
  let recommendedModel: any = null
  if (task) {
    try {
      const modelBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://toolroute.io')
      const modelRes = await fetch(`${modelBaseUrl}/api/route/model`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, agent_identity_id: agent_identity_id || null }),
      })
      if (modelRes.ok) {
        const md = await modelRes.json()
        recommendedModel = {
          slug: md.model_details?.slug || md.recommended_model,
          provider: md.model_details?.provider,
          tier: md.tier,
          estimated_cost: md.estimated_cost,
          decision_id: md.decision_id,
          reason: `${md.tier} tier — best cost/quality for this task type`,
        }
      }
    } catch {
      // Model routing is optional
    }
  }

  // Determine approach: does this task need an MCP server or just a model?
  const approach = needsMcpServer ? 'mcp_server' : 'direct_llm'

  return NextResponse.json({
    approach,
    ...(approach === 'direct_llm' ? {
      message: 'This task can be handled by your LLM directly — no MCP server needed.',
      recommended_model: recommendedModel,
      recommended_skill: null,
      recommended_skill_name: null,
      cost_insight: recommendedModel
        ? `Use ${recommendedModel.slug} (${recommendedModel.provider}) — ${recommendedModel.tier} tier for best cost/quality ratio on this task type.`
        : 'Use your current model — this is a standard LLM task.',
    } : {
      recommended_skill: top.slug,
      recommended_skill_name: top.canonical_name,
      recommended_model: recommendedModel,
    }),
    confidence: Math.round(adjustedConfidence * 100) / 100,
    reasoning: approach === 'direct_llm'
      ? `Pure LLM task — no external tool access required. ${recommendedModel ? `Recommended: ${recommendedModel.slug} (${recommendedModel.tier} tier).` : 'Use your current model.'}`
      : buildReasoning(top, priority, task, resolvedWorkflow),
    alternatives: approach === 'direct_llm' ? [] : alternatives,
    recommended_combo: approach === 'direct_llm' ? null : combo,
    fallback: approach === 'direct_llm' ? null : fallback,
    scores: approach === 'direct_llm' ? null : top.skill_scores,
    outcome_count: dataBackedOutcomeCount,
    non_mcp_alternative: approach === 'direct_llm' ? null : getNonMcpAlternative(resolvedWorkflow),
    routing_metadata: {
      resolved_workflow: resolvedWorkflow,
      priority_mode: priority,
      candidates_evaluated: candidates.length,
      junction_table_filtered: junctionFiltered,
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
    agent: agentContext,
    ...(agent_identity_id ? {} : {
      register_hint: {
        message: 'Register your agent to earn 2x credits on every report and unlock mission claiming.',
        action: 'POST /api/agents/register',
        body: { agent_name: 'your-agent-name' },
        then: 'Include the returned agent_identity_id in this request and in POST /api/report',
      },
    }),
  })
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

/**
 * Detect whether a task actually needs an MCP server or is a pure LLM task.
 * Pure LLM tasks: writing, code generation, translation, analysis from memory,
 * formatting, brainstorming — anything the model can do without external tools.
 * MCP-required tasks: web search, scraping, API calls, file operations,
 * database queries, sending messages, calendar operations, etc.
 */
function detectMcpNeed(task: string): boolean {
  const lower = task.toLowerCase()

  // Strong signals that an MCP server IS needed (external system access)
  const mcpRequired = [
    // Web access
    'search the web', 'web search', 'scrape', 'crawl', 'fetch url', 'browse',
    'look up online', 'find online', 'google',
    // Database operations
    'run query', 'execute sql', 'insert into', 'update table', 'database',
    'supabase', 'postgres', 'mongodb', 'dynamodb',
    // External service operations
    'send email', 'send slack', 'send message', 'post to', 'publish to',
    'deploy', 'push to github', 'create pr', 'open issue', 'create ticket',
    'schedule meeting', 'add to calendar', 'set reminder',
    // File/system operations
    'upload file', 'download', 'read file from', 'scan repository',
    'monitor', 'check status', 'ping',
    // API calls
    'call api', 'hit endpoint', 'make request', 'webhook',
    // Specific tool mentions
    'figma', 'notion', 'jira', 'confluence', 'salesforce', 'hubspot',
    'stripe', 'shopify', 'zendesk', 'github', 'gitlab',
  ]

  for (const signal of mcpRequired) {
    if (lower.includes(signal)) return true
  }

  // Strong signals that this is a pure LLM task (no external tools needed)
  const llmOnly = [
    // Writing/generation
    'write a', 'draft a', 'compose', 'generate a', 'create a template',
    'write code', 'write python', 'write javascript', 'write sql',
    'write function', 'write class', 'implement a',
    'write unit test', 'write test', 'generate test', 'test case',
    // Analysis from context (not external data)
    'explain', 'summarize this', 'analyze this', 'compare', 'pros and cons',
    'review this code', 'fix this code', 'debug this', 'refactor',
    'translate', 'rewrite', 'improve this', 'edit this',
    'analyze the pros', 'advantages and disadvantages', 'tradeoffs',
    // Formatting/structuring
    'format', 'convert to json', 'parse this', 'extract from this',
    'create csv', 'generate schema', 'outline',
    'create a template', 'generate a template',
    // Planning/brainstorming
    'brainstorm', 'plan for', 'strategy for', 'decision matrix',
    'meeting agenda', 'project plan', 'choosing between',
    'choose between', 'which is better', 'recommend a',
  ]

  for (const signal of llmOnly) {
    if (lower.includes(signal)) return false
  }

  // Default: assume MCP is needed (conservative — better to suggest a tool than miss one)
  return true
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

  // Use maybeSingle + order + limit to avoid error when multiple rows exist for same period
  const { data: existing } = await supabase
    .from('telemetry_rate_tracking')
    .select('id, total_recommendations')
    .gte('period_start', periodStart.toISOString())
    .lt('period_end', periodEnd.toISOString())
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

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
