import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { calcContributionScore, calcRoutingCredits, CONTRIBUTION_MULTIPLIERS } from '@/lib/scoring'

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
    return NextResponse.json(
      { error: 'skill_slug and outcome are required' },
      { status: 400 }
    )
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
    credits_earned: credits,
    reputation_earned: reputation,
    contribution_score: score,
    credit_balance,
    message: result.accepted
      ? `Thanks! +${credits} routing credits earned.`
      : 'Report received but did not meet acceptance threshold. Add more fields for higher scores.',
  })
}
