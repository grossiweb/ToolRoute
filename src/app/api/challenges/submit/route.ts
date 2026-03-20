import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { rateLimit, getRateLimitKey } from '@/lib/rate-limit'
import { notifyAgent } from '@/lib/webhooks'
import {
  calcChallengeEfficiencyScore,
  calcChallengeOverallScore,
  getChallengeTier,
  getChallengeCredits,
  TRUST_TIER_MODIFIERS,
} from '@/lib/scoring'

export async function POST(request: NextRequest) {
  const rlKey = getRateLimitKey(request)
  const rl = rateLimit('challenges-submit', rlKey, 30) // 30 submissions/hour per IP
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded. Max 30 challenge submissions per hour.' }, { status: 429 })
  }

  const supabase = createServerSupabaseClient()

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const {
    challenge_slug,
    agent_identity_id,
    tools_used,
    steps_taken,
    total_latency_ms,
    total_cost_usd,
    deliverable_summary,
    deliverable_json,
    completeness_score: selfCompleteness,
    quality_score: selfQuality,
  } = body

  // ── Validation ──────────────────────────────

  if (!challenge_slug) {
    return NextResponse.json({
      error: 'challenge_slug is required',
      guide: 'GET /api/challenges to browse available challenges',
    }, { status: 400 })
  }

  if (!agent_identity_id) {
    return NextResponse.json({
      error: 'agent_identity_id is required. Register first at POST /api/agents/register.',
      register: { method: 'POST', url: '/api/agents/register', body: { agent_name: 'your-agent-name' } },
    }, { status: 400 })
  }

  if (!tools_used || !Array.isArray(tools_used) || tools_used.length === 0) {
    return NextResponse.json({
      error: 'tools_used is required — array of { skill_slug, step_number, latency_ms?, cost_usd? }',
    }, { status: 400 })
  }

  if (!steps_taken || steps_taken < 1) {
    return NextResponse.json({ error: 'steps_taken must be >= 1' }, { status: 400 })
  }

  // ── Look up challenge ──────────────────────

  const { data: challenge } = await supabase
    .from('workflow_challenges')
    .select('*')
    .eq('slug', challenge_slug)
    .single()

  if (!challenge) {
    return NextResponse.json({
      error: `Challenge "${challenge_slug}" not found`,
      guide: 'GET /api/challenges to browse available challenges',
    }, { status: 404 })
  }

  if (challenge.status !== 'active') {
    return NextResponse.json({ error: 'This challenge is not active' }, { status: 400 })
  }

  if (challenge.submission_count >= challenge.max_submissions) {
    return NextResponse.json({ error: 'This challenge has reached max submissions' }, { status: 400 })
  }

  // ── Look up agent ──────────────────────────

  const { data: agent } = await supabase
    .from('agent_identities')
    .select('id, contributor_id, trust_tier')
    .eq('id', agent_identity_id)
    .single()

  if (!agent) {
    return NextResponse.json({
      error: 'Agent not found. Register at POST /api/agents/register first.',
    }, { status: 404 })
  }

  // ── Check for existing submission ──────────

  const { data: existing } = await supabase
    .from('challenge_submissions')
    .select('id')
    .eq('challenge_id', challenge.id)
    .eq('agent_identity_id', agent_identity_id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({
      error: 'You already submitted to this challenge. One submission per agent per challenge.',
      submission_id: existing.id,
    }, { status: 409 })
  }

  // ── Calculate scores ───────────────────────

  const uniqueTools = new Set(tools_used.map((t: any) => t.skill_slug)).size
  const actualCost = total_cost_usd ?? tools_used.reduce((sum: number, t: any) => sum + (t.cost_usd || 0), 0)
  const actualTime = total_latency_ms ?? tools_used.reduce((sum: number, t: any) => sum + (t.latency_ms || 0), 0)

  const efficiencyScore = calcChallengeEfficiencyScore({
    actualTools: uniqueTools,
    expectedTools: challenge.expected_tools,
    actualCost,
    costCeiling: parseFloat(challenge.cost_ceiling_usd) || 0.10,
    actualTimeMs: actualTime,
    timeLimitMs: (challenge.time_limit_minutes || 30) * 60 * 1000,
    actualSteps: steps_taken,
    expectedSteps: challenge.expected_steps,
  })

  // Use self-reported scores if provided, default to 7.0 (pending review)
  const completeness = Math.min(selfCompleteness ?? 7.0, 10)
  const quality = Math.min(selfQuality ?? 7.0, 10)

  const weights = challenge.evaluation_criteria || { completeness: 0.35, quality: 0.35, efficiency: 0.30 }
  const overallScore = calcChallengeOverallScore({
    completeness,
    quality,
    efficiency: efficiencyScore,
    weights,
  })

  const tier = getChallengeTier(overallScore)

  // ── Calculate rewards ──────────────────────

  const trustMod = TRUST_TIER_MODIFIERS[agent.trust_tier as keyof typeof TRUST_TIER_MODIFIERS] || 1.0
  const { credits, reputation } = getChallengeCredits(
    15, // base reward for challenges (higher than missions)
    overallScore,
    parseFloat(challenge.reward_multiplier) || 3.0,
    trustMod,
  )

  // ── Insert submission ──────────────────────

  const { data: submission, error: insertError } = await supabase
    .from('challenge_submissions')
    .insert({
      challenge_id: challenge.id,
      agent_identity_id,
      status: 'scored',
      tools_used,
      steps_taken,
      total_latency_ms: actualTime,
      total_cost_usd: actualCost,
      deliverable_summary: deliverable_summary || null,
      deliverable_json: deliverable_json || null,
      completeness_score: completeness,
      quality_score: quality,
      efficiency_score: parseFloat(efficiencyScore.toFixed(2)),
      overall_score: parseFloat(overallScore.toFixed(2)),
      tier,
      routing_credits_awarded: credits,
      reputation_points_awarded: reputation,
      scored_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (insertError || !submission) {
    return NextResponse.json({ error: 'Failed to save submission', detail: insertError?.message }, { status: 500 })
  }

  // ── Atomically increment submission count (prevents race conditions) ──

  await supabase.rpc('increment_challenge_submissions', { p_challenge_id: challenge.id })

  // ── Issue rewards ──────────────────────────

  await supabase.from('reward_ledgers').insert({
    contributor_id: agent.contributor_id,
    agent_identity_id,
    routing_credits: credits,
    reputation_points: reputation,
    economic_credits_usd: parseFloat((credits * 0.001).toFixed(4)),
    reason: `challenge:${challenge_slug} ${tier || 'completed'} (score: ${overallScore.toFixed(2)})`,
  })

  // ── Update agent stats ─────────────────────

  supabase.rpc('update_agent_stats', {
    p_agent_id: agent_identity_id,
    p_credits_delta: credits,
    p_rep_delta: reputation,
  }).then(() => {})

  // ── Get rank ───────────────────────────────

  const { count: betterCount } = await supabase
    .from('challenge_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('challenge_id', challenge.id)
    .gt('overall_score', overallScore)

  const rank = (betterCount ?? 0) + 1

  // Notify agent via webhook (fire-and-forget)
  notifyAgent(supabase, agent_identity_id, 'challenge_scored', {
    credits_earned: credits,
    reputation_earned: reputation,
    challenge_title: challenge.title,
    tier,
    score: overallScore,
    rank,
  }).catch(() => {})

  return NextResponse.json({
    submission_id: submission.id,
    challenge: challenge_slug,
    tier,
    rank,
    scores: {
      completeness: parseFloat(completeness.toFixed(2)),
      quality: parseFloat(quality.toFixed(2)),
      efficiency: parseFloat(efficiencyScore.toFixed(2)),
      overall: parseFloat(overallScore.toFixed(2)),
    },
    tools_summary: {
      unique_tools: uniqueTools,
      expected_tools: challenge.expected_tools,
      steps_taken,
      expected_steps: challenge.expected_steps,
      total_cost_usd: actualCost,
      cost_ceiling_usd: parseFloat(challenge.cost_ceiling_usd),
      total_latency_ms: actualTime,
    },
    rewards: {
      routing_credits: credits,
      reputation_points: reputation,
      multiplier_applied: `${challenge.reward_multiplier}x challenge + ${trustMod}x trust tier`,
    },
    message: tier
      ? `${tier.toUpperCase()} tier! +${credits} routing credits earned. Rank #${rank} on this challenge.`
      : `Challenge completed! +${credits} credits earned. Score ${overallScore.toFixed(1)}/10 — aim for 8.5+ for Gold.`,
    leaderboard: `GET /api/challenges/${challenge_slug}/leaderboard`,
  })
}
