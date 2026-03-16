import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { calcContributionScore, calcRoutingCredits, CONTRIBUTION_MULTIPLIERS } from '@/lib/scoring'

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(agentId: string): boolean {
  const now = Date.now()
  const windowMs = 60 * 60 * 1000
  const maxRequests = 100
  const record = rateLimitMap.get(agentId)
  if (!record || now > record.resetAt) {
    rateLimitMap.set(agentId, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (record.count >= maxRequests) return false
  record.count++
  return true
}

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { agent_identity_id, contribution_type, payload, proof_type = 'self_reported' } = body

  if (!contribution_type || !payload) {
    return NextResponse.json({ error: 'contribution_type and payload required' }, { status: 400 })
  }

  const validTypes = ['run_telemetry', 'comparative_eval', 'fallback_chain', 'benchmark_package']
  if (!validTypes.includes(contribution_type)) {
    return NextResponse.json({ error: 'Invalid contribution_type' }, { status: 400 })
  }

  const agentKey = agent_identity_id || request.headers.get('x-forwarded-for') || 'anonymous'
  if (!checkRateLimit(agentKey)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Max 100 contributions per hour.' },
      { status: 429, headers: { 'Retry-After': '3600' } }
    )
  }

  // Create anonymous contributor if no agent_identity
  const { data: contrib } = await supabase
    .from('contributors')
    .insert({ contributor_type: 'individual', display_name: agent_identity_id || 'Anonymous' })
    .select('id')
    .single()

  const contributorId = contrib!.id

  const { data: event } = await supabase
    .from('contribution_events')
    .insert({
      contributor_id: contributorId,
      agent_identity_id: agent_identity_id || null,
      contribution_type,
      payload_json: payload,
      proof_type,
      accepted: false,
    })
    .select('id')
    .single()

  if (!event) {
    return NextResponse.json({ error: 'Failed to record contribution' }, { status: 500 })
  }

  // Score
  const validity = estimateValidity(payload, contribution_type)
  const usefulness = estimateUsefulness(payload, contribution_type)
  const overallScore = calcContributionScore({
    validity, usefulness, novelty: 0.7, consistency: 0.8, antiGaming: estimateAntiGaming(payload)
  })
  const accepted = overallScore >= 0.4

  await supabase.from('contribution_events').update({ accepted }).eq('id', event.id)
  await supabase.from('contribution_scores').insert({
    contribution_event_id: event.id,
    validity_score: validity,
    usefulness_score: usefulness,
    novelty_score: 0.7,
    consistency_score: 0.8,
    anti_gaming_score: estimateAntiGaming(payload),
    overall_contribution_score: overallScore,
  })

  const rewards = { routing_credits: 0, economic_credits_usd: 0, reputation_points: 0 }
  if (accepted) {
    const mult = CONTRIBUTION_MULTIPLIERS[contribution_type as keyof typeof CONTRIBUTION_MULTIPLIERS]
    rewards.routing_credits = calcRoutingCredits(10, overallScore, mult)
    rewards.economic_credits_usd = parseFloat((0.01 * overallScore * mult).toFixed(4))
    rewards.reputation_points = Math.round(5 * overallScore * mult)
    await supabase.from('reward_ledgers').insert({
      contributor_id: contributorId,
      contribution_event_id: event.id,
      ...rewards,
      reason: `${contribution_type} accepted`,
    })
  }

  return NextResponse.json({ accepted, contribution_score: parseFloat(overallScore.toFixed(2)), rewards })
}

function estimateValidity(payload: any, type: string): number {
  if (!payload) return 0
  if (type === 'run_telemetry') {
    if (!payload.skill_id || !payload.outcome_status) return 0.2
    if (payload.latency_ms && payload.estimated_cost_usd) return 0.9
    return 0.6
  }
  if (type === 'comparative_eval') return payload.candidates?.length >= 2 ? 0.85 : 0.2
  if (type === 'fallback_chain') return payload.chain?.length >= 2 ? 0.9 : 0.2
  return 0.7
}

function estimateUsefulness(payload: any, type: string): number {
  if (type === 'comparative_eval') return 0.95
  if (type === 'fallback_chain') return 0.9
  if (type === 'benchmark_package') return 1.0
  return Math.min(0.5 + Object.keys(payload || {}).length * 0.04, 0.9)
}

function estimateAntiGaming(payload: any): number {
  if (!payload) return 0
  if (payload.latency_ms === 0 && payload.retries > 0) return 0.1
  if (payload.output_quality_rating === 10 && payload.human_correction_required) return 0.4
  return 0.85
}
