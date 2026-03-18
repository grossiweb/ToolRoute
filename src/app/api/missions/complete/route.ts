import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { CONTRIBUTION_MULTIPLIERS, TRUST_TIER_MODIFIERS } from '@/lib/scoring'

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { claim_id, results } = body

  if (!claim_id || !results) {
    return NextResponse.json(
      { error: 'claim_id and results are required' },
      { status: 400 }
    )
  }

  // Validate results structure
  if (!Array.isArray(results) || results.length === 0) {
    return NextResponse.json(
      { error: 'results must be a non-empty array of skill outcome objects' },
      { status: 400 }
    )
  }

  // Fetch the claim
  const { data: claim } = await supabase
    .from('mission_claims')
    .select(`
      id, mission_id, agent_identity_id, status,
      benchmark_missions ( id, title, event_id, task_fingerprint, reward_multiplier ),
      agent_identities ( id, contributor_id, trust_tier )
    `)
    .eq('id', claim_id)
    .single()

  if (!claim) {
    return NextResponse.json({ error: 'Claim not found' }, { status: 404 })
  }

  if (claim.status === 'completed') {
    return NextResponse.json({ error: 'Claim already completed' }, { status: 409 })
  }

  if (claim.status !== 'claimed' && claim.status !== 'in_progress') {
    return NextResponse.json({ error: `Claim status is ${claim.status}, cannot complete` }, { status: 409 })
  }

  const mission = (claim as any).benchmark_missions
  const agent = (claim as any).agent_identities

  // Resolve skill_slug → skill_id for each result (accepts either)
  const resolvedResults = []
  for (const r of results) {
    let skillId = r.skill_id

    // If skill_slug provided but no skill_id, resolve it
    if (!skillId && r.skill_slug) {
      const { data: skill } = await supabase
        .from('skills')
        .select('id')
        .eq('slug', r.skill_slug)
        .single()

      if (!skill) {
        return NextResponse.json(
          { error: `Skill "${r.skill_slug}" not found in catalog. Check the slug and try again.` },
          { status: 400 }
        )
      }
      skillId = skill.id
    }

    if (!skillId) {
      return NextResponse.json(
        { error: 'Each result must include either skill_id (UUID) or skill_slug (string).' },
        { status: 400 }
      )
    }

    resolvedResults.push({ ...r, skill_id: skillId })
  }

  // Process each result into outcome_records
  const outcomeInserts = resolvedResults.map((r: any) => ({
    skill_id: r.skill_id,
    benchmark_profile_id: null, // will be resolved from event
    workflow_slug: r.workflow_slug || null,
    task_fingerprint: mission.task_fingerprint,
    skill_version: r.skill_version || null,
    outcome_status: r.outcome_status || 'success',
    latency_ms: r.latency_ms || null,
    estimated_cost_usd: r.estimated_cost_usd || null,
    retries: r.retries || 0,
    output_quality_rating: r.output_quality_rating || null,
    structured_output_valid: r.structured_output_valid ?? null,
    human_correction_required: r.human_correction_required || false,
    human_correction_minutes: r.human_correction_minutes || null,
    fallback_used_skill_id: r.fallback_used_skill_id || null,
    proof_type: r.proof_type || 'self_reported',
  }))

  const { data: outcomes, error: outcomeError } = await supabase
    .from('outcome_records')
    .insert(outcomeInserts)
    .select('id')

  if (outcomeError) {
    return NextResponse.json({ error: 'Failed to insert outcome records' }, { status: 500 })
  }

  // Calculate rewards
  const isComparative = results.length >= 2
  const baseMultiplier = isComparative
    ? CONTRIBUTION_MULTIPLIERS.comparative_eval
    : CONTRIBUTION_MULTIPLIERS.run_telemetry
  const missionMultiplier = mission.reward_multiplier || 1.0
  const trustMod = TRUST_TIER_MODIFIERS[agent.trust_tier as keyof typeof TRUST_TIER_MODIFIERS] || 1.0

  const routingCredits = Math.round(10 * baseMultiplier * missionMultiplier * trustMod)
  const reputationPoints = Math.round(5 * baseMultiplier * missionMultiplier * trustMod)
  const economicCredits = Math.round(routingCredits * 0.01 * 100) / 100 // $0.01 per routing credit

  // Update claim to completed
  await supabase
    .from('mission_claims')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      results_json: results,
      reward_routing_credits: routingCredits,
      reward_reputation_points: reputationPoints,
    })
    .eq('id', claim_id)

  // Atomically increment completed_count (prevents race conditions)
  await supabase.rpc('increment_mission_completed', { p_mission_id: mission.id })

  // Create reward ledger entry if contributor exists
  if (agent.contributor_id) {
    await supabase
      .from('reward_ledgers')
      .insert({
        contributor_id: agent.contributor_id,
        agent_identity_id: agent.id,
        routing_credits: routingCredits,
        reputation_points: reputationPoints,
        economic_credits_usd: economicCredits,
        reason: `Mission completed: ${mission.title}`,
      })
  }

  return NextResponse.json({
    status: 'completed',
    claim_id,
    outcomes_recorded: outcomes?.length || 0,
    rewards: {
      routing_credits: routingCredits,
      reputation_points: reputationPoints,
      economic_credits_usd: economicCredits,
      multipliers_applied: {
        base: baseMultiplier,
        mission: missionMultiplier,
        trust_tier: trustMod,
      },
    },
    message: isComparative
      ? 'Comparative evaluation recorded — 2.5x bonus applied!'
      : 'Telemetry recorded. Run comparative evals to earn 2.5x rewards.',
    tip: 'Try Workflow Challenges for 3x credits: GET /api/challenges',
  })
}
