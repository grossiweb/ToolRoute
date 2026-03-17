import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { calcContributionScore, calcRoutingCredits, CONTRIBUTION_MULTIPLIERS } from '@/lib/scoring'

// GET /api/report — Self-documenting guide for telemetry reporting
export async function GET() {
  return NextResponse.json({
    endpoint: 'POST /api/report',
    description: 'Submit execution telemetry after using a recommended MCP server. Earns routing credits.',
    required_fields: {
      skill_slug: 'The MCP server slug that was used (from /api/route recommendation)',
      outcome: 'success | partial_success | failure | aborted',
    },
    optional_fields: {
      latency_ms: 'Execution time in milliseconds (earns more credits)',
      cost_usd: 'Estimated cost of the execution (earns more credits)',
      quality_rating: 'Output quality 0-10 (earns more credits)',
      task_fingerprint: 'Unique identifier for the task type',
      agent_identity_id: 'Your agent UUID from POST /api/agents/register (earns 2x credits, tracks progress)',
    },
    example: {
      skill_slug: 'firecrawl-mcp',
      outcome: 'success',
      latency_ms: 1200,
      cost_usd: 0.003,
      quality_rating: 8,
      agent_identity_id: 'your-uuid-here',
    },
    credit_rewards: {
      basic_report: '3-10 credits (skill_slug + outcome only)',
      detailed_report: '6-10 credits (with latency, cost, quality)',
      registered_agent: '2x credit multiplier when agent_identity_id is provided',
    },
    workflow: {
      step_1: 'POST /api/agents/register to get agent_identity_id',
      step_2: 'POST /api/route to get recommended_skill',
      step_3: 'Execute the recommended MCP server',
      step_4: 'POST /api/report to report outcome and earn credits',
    },
  })
}

export async function POST(request: NextRequest) {
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
    .single()

  if (skill) {
    // Record in outcome_records (feeds score recalculation pipeline)
    // Fire and forget — don't block the response
    supabase.from('outcome_records').insert({
      skill_id: skill.id,
      outcome_status: outcome,
      latency_ms: latency_ms ?? null,
      estimated_cost_usd: cost_usd ?? null,
      output_quality_rating: quality_rating ?? null,
      task_fingerprint: task_fingerprint ?? null,
      proof_type: 'self_reported',
    }).then(() => {})
  }

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
    await supabase.rpc('update_agent_stats', {
      p_agent_id: agent_identity_id,
      p_credits_delta: credits,
      p_rep_delta: Math.floor(credits * 0.5),
    }).catch(() => {}) // Non-blocking — don't fail the response
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

  return NextResponse.json({
    accepted: result.accepted,
    agent_identity_id: agent_identity_id ?? null,
    credits_earned: credits,
    reputation_earned: reputation,
    contribution_score: score,
    credit_balance,
    message: result.accepted
      ? `Thanks! +${credits} routing credits earned.`
      : 'Report received but did not meet acceptance threshold. Add more fields for higher scores.',
  })
}
