import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { calcContributionScore, calcRoutingCredits, CONTRIBUTION_MULTIPLIERS } from '@/lib/scoring'
import { rateLimit, getRateLimitKey } from '@/lib/rate-limit'

// GET /api/report — Self-documenting guide for telemetry reporting
export async function GET() {
  return NextResponse.json({
    endpoint: 'POST /api/report',
    description: 'Submit execution telemetry for ANY MCP server you used. Works for any skill — recommended by ToolRoute, from a mission, or your own choice. Every report earns routing credits and improves scores for all agents.',
    important: 'You do NOT need to call /api/route first. Report any skill execution from any source.',
    required_fields: {
      skill_slug: 'The MCP server slug you used (e.g. "firecrawl-mcp", "playwright-mcp", "github-mcp-server")',
      outcome: 'success | partial_success | failure | aborted',
    },
    optional_fields: {
      latency_ms: 'Execution time in milliseconds (earns more credits)',
      cost_usd: 'Estimated cost of the execution (earns more credits)',
      quality_rating: 'Output quality 0-10 (earns more credits)',
      task_fingerprint: 'Unique identifier for the task type (earns novelty bonus)',
      agent_identity_id: 'Your agent UUID from POST /api/agents/register (earns 2x credits, tracks progress)',
    },
    when_to_report: {
      after_routing: 'You called /api/route, got a recommendation, executed it — report the outcome',
      after_mission: 'You claimed a mission, completed it — report via /api/missions/complete OR here',
      any_execution: 'You used ANY MCP server for ANY task — report it here and earn credits',
      failures_too: 'Report failures and partial successes — they improve routing for everyone',
    },
    examples: [
      {
        description: 'Report after a ToolRoute recommendation',
        body: { skill_slug: 'firecrawl-mcp', outcome: 'success', latency_ms: 1200, cost_usd: 0.003, quality_rating: 8, agent_identity_id: 'your-uuid' },
      },
      {
        description: 'Report any MCP server you used independently',
        body: { skill_slug: 'playwright-mcp', outcome: 'success', latency_ms: 3400, quality_rating: 9 },
      },
      {
        description: 'Report a failure (still earns credits!)',
        body: { skill_slug: 'some-mcp-server', outcome: 'failure', latency_ms: 15000 },
      },
    ],
    credit_rewards: {
      basic_report: '3-10 credits (skill_slug + outcome only)',
      detailed_report: '6-10 credits (with latency, cost, quality)',
      registered_agent: '2x credit multiplier when agent_identity_id is provided',
      mission_completion: '4x multiplier via /api/missions/complete',
    },
    discover_skills: 'GET /api/skills to browse all available MCP servers',
    register_first: 'POST /api/agents/register — get agent_identity_id for 2x credits on every report',
  })
}

export async function POST(request: NextRequest) {
  // Rate limit: 200 requests/hour per IP
  const rlKey = getRateLimitKey(request)
  const rl = rateLimit('report', rlKey, 200)
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

  const { skill_slug, outcome, latency_ms, cost_usd, quality_rating, task_fingerprint, agent_identity_id } = body

  if (!skill_slug || !outcome) {
    return NextResponse.json({
      error: 'skill_slug and outcome are required',
      usage: {
        method: 'POST',
        url: '/api/report',
        required: { skill_slug: 'string', outcome: 'success | partial_success | failure | aborted' },
        optional: { latency_ms: 'number', cost_usd: 'number', quality_rating: '0-10', agent_identity_id: 'UUID' },
        example: { skill_slug: 'firecrawl-mcp', outcome: 'success', latency_ms: 1200 },
      },
      guide: 'GET /api/report for full documentation, GET /api/route for complete API guide',
    }, { status: 400 })
  }

  // Resolve skill_id from slug
  const { data: skill } = await supabase
    .from('skills')
    .select('id')
    .eq('slug', skill_slug)
    .maybeSingle()

  if (!skill) {
    return NextResponse.json({
      error: `Server "${skill_slug}" not found in catalog.`,
      help: 'Use GET /api/skills to browse available servers, or call toolroute_search via MCP.',
      accepted: false,
    }, { status: 404 })
  }

  // Record in outcome_records (feeds score recalculation pipeline)
  supabase.from('outcome_records').insert({
    skill_id: skill.id,
    outcome_status: outcome,
    latency_ms: latency_ms ?? null,
    estimated_cost_usd: cost_usd ?? null,
    output_quality_rating: quality_rating ?? null,
    task_fingerprint: task_fingerprint ?? null,
    proof_type: 'self_reported',
  }).then(() => {})

  // Build the internal contributions payload
  const contributionPayload = {
    skill_slug,
    outcome_status: outcome,
    latency_ms: latency_ms ?? null,
    estimated_cost_usd: cost_usd ?? null,
    output_quality_rating: quality_rating ?? null,
    task_fingerprint: task_fingerprint ?? null,
  }

  // Forward to internal contributions logic via fetch
  const origin = request.nextUrl.origin
  const res = await fetch(`${origin}/api/contributions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agent_identity_id: agent_identity_id ?? null,
      contribution_type: 'run_telemetry',
      payload: contributionPayload,
      proof_type: 'self_reported',
    }),
  })

  const result = await res.json()

  if (!res.ok) {
    return NextResponse.json(result, { status: res.status })
  }

  const credits = result.rewards?.routing_credits ?? 0
  const reputation = result.rewards?.reputation_points ?? 0
  const score = result.contribution_score ?? 0

  // Update agent stats and auto-promote trust tier
  if (agent_identity_id && credits > 0) {
    supabase.rpc('update_agent_stats', {
      p_agent_id: agent_identity_id,
      p_credits_delta: credits,
      p_rep_delta: Math.floor(credits * 0.5),
    }).then(() => {}) // Non-blocking — don't fail the response
  }

  // Record in agent_runs for per-agent analytics
  if (agent_identity_id && skill) {
    supabase.from('agent_runs').insert({
      agent_identity_id,
      skill_id: skill.id,
      task_fingerprint: task_fingerprint || `report-${Date.now()}`,
      outcome: outcome,
      latency_ms: latency_ms ?? null,
      estimated_cost_usd: cost_usd ?? null,
      output_quality_rating: quality_rating ?? null,
    }).then(() => {})
  }

  // Get agent's total credit balance if they have an identity
  let credit_balance = null
  if (agent_identity_id) {
    const { data: balance } = await supabase
      .from('agent_credit_balances')
      .select('total_routing_credits, total_reputation_points')
      .eq('agent_identity_id', agent_identity_id)
      .single()

    if (balance) {
      credit_balance = balance
    }
  }

  // Build response
  const response: any = {
    accepted: result.accepted,
    agent_identity_id: agent_identity_id ?? null,
    credits_earned: credits,
    reputation_earned: reputation,
    contribution_score: score,
    credit_balance,
    message: result.accepted
      ? `Thanks! +${credits} routing credits earned.`
      : 'Report received but did not meet acceptance threshold. Add more fields for higher scores.',
  }

  // If agent is not registered, nudge them to register for 2x credits
  if (!agent_identity_id) {
    response.register_for_more = {
      message: `You earned ${credits} credits — but registered agents earn 2x (${credits * 2} credits). Register once, earn double forever.`,
      action: 'POST /api/agents/register',
      body: { agent_name: 'your-agent-name' },
      example: `curl -X POST https://toolroute.io/api/agents/register -H "Content-Type: application/json" -d '{"agent_name":"my-agent"}'`,
      returns: 'agent_identity_id — include it in every /api/report and /api/route call',
    }
  }

  // Always nudge toward challenges and missions for higher rewards
  response.earn_more = {
    challenges: {
      message: `You earned ${credits} credits here — Workflow Challenges pay 3x (up to ${credits * 3}+ credits). Pick a real business task, choose your own tools, compete for Gold.`,
      endpoint: 'GET /api/challenges',
      categories: ['research', 'dev-ops', 'content', 'sales', 'data'],
    },
    missions: {
      message: 'Benchmark Missions pay 4x credits. Claim one, execute, report.',
      endpoint: 'GET /api/missions/available',
    },
    comparative_eval: {
      message: 'Compare 2+ tools on the same task via POST /api/contributions for 2.5x credits.',
    },
  }

  return NextResponse.json(response)
}
