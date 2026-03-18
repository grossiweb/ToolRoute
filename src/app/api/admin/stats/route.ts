import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// GET /api/admin/stats — Platform telemetry dashboard (with debug info)
export async function GET() {
  const supabase = createServerSupabaseClient()

  // Run all queries in parallel — capture errors too
  const [
    agentsResult,
    outcomeResult,
    contributionsResult,
    rewardsResult,
    missionsResult,
    missionClaimsResult,
    agentRunsResult,
    skillsResult,
    contributorsResult,
    telemetryRateResult,
  ] = await Promise.all([
    supabase.from('agent_identities').select('id, agent_name, agent_kind, trust_tier, is_active, created_at'),
    supabase.from('outcome_records').select('id, skill_id, outcome_status, latency_ms, estimated_cost_usd, output_quality_rating, created_at'),
    supabase.from('contribution_events').select('id, contributor_id, agent_identity_id, contribution_type, run_count, accepted, created_at'),
    supabase.from('reward_ledgers').select('id, contributor_id, agent_identity_id, routing_credits, reputation_points, economic_credits_usd, reason, created_at'),
    supabase.from('benchmark_missions').select('id, title, status, max_claims, claimed_count'),
    supabase.from('mission_claims').select('id, mission_id, agent_identity_id, status, claimed_at, completed_at, reward_routing_credits'),
    supabase.from('agent_runs').select('id, agent_identity_id, skill_id, outcome, latency_ms, created_at'),
    supabase.from('skills').select('id, slug, canonical_name').eq('status', 'active'),
    supabase.from('contributors').select('id, contributor_type, display_name, created_at'),
    supabase.from('telemetry_rate_tracking').select('*'),
  ])

  // Collect any query errors for debugging
  const queryErrors: Record<string, string> = {}
  if (agentsResult.error) queryErrors.agent_identities = agentsResult.error.message
  if (outcomeResult.error) queryErrors.outcome_records = outcomeResult.error.message
  if (contributionsResult.error) queryErrors.contribution_events = contributionsResult.error.message
  if (rewardsResult.error) queryErrors.reward_ledgers = rewardsResult.error.message
  if (missionsResult.error) queryErrors.benchmark_missions = missionsResult.error.message
  if (missionClaimsResult.error) queryErrors.benchmark_mission_claims = missionClaimsResult.error.message
  if (agentRunsResult.error) queryErrors.agent_runs = agentRunsResult.error.message
  if (skillsResult.error) queryErrors.skills = skillsResult.error.message
  if (contributorsResult.error) queryErrors.contributors = contributorsResult.error.message
  if (telemetryRateResult.error) queryErrors.telemetry_rate_tracking = telemetryRateResult.error.message

  const agents = agentsResult.data || []
  const outcomes = outcomeResult.data || []
  const contributions = contributionsResult.data || []
  const rewards = rewardsResult.data || []
  const missions = missionsResult.data || []
  const missionClaims = missionClaimsResult.data || []
  const agentRuns = agentRunsResult.data || []
  const skills = skillsResult.data || []
  const contributors = contributorsResult.data || []
  const telemetryRate = telemetryRateResult.data || []

  // Compute summaries
  const totalCredits = rewards.reduce((sum: number, r: any) => sum + (r.routing_credits || 0), 0)
  const totalReputation = rewards.reduce((sum: number, r: any) => sum + (r.reputation_points || 0), 0)

  const outcomeCounts = outcomes.reduce((acc: any, o: any) => {
    acc[o.outcome_status] = (acc[o.outcome_status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const contributionTypes = contributions.reduce((acc: any, c: any) => {
    acc[c.contribution_type] = (acc[c.contribution_type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return NextResponse.json({
    generated_at: new Date().toISOString(),
    query_errors: Object.keys(queryErrors).length > 0 ? queryErrors : null,
    summary: {
      registered_agents: agents.length,
      total_contributors: contributors.length,
      total_outcome_records: outcomes.length,
      total_contributions: contributions.length,
      total_reward_entries: rewards.length,
      total_routing_credits_issued: totalCredits,
      total_reputation_points_issued: totalReputation,
      total_mission_claims: missionClaims.length,
      total_agent_runs: agentRuns.length,
      active_skills_in_catalog: skills.length,
    },
    agents: agents.map((a: any) => ({
      id: a.id,
      name: a.agent_name,
      kind: a.agent_kind,
      trust_tier: a.trust_tier,
      active: a.is_active,
      registered: a.created_at,
    })),
    contributors: contributors.slice(-20).reverse(),
    outcome_breakdown: outcomeCounts,
    contribution_breakdown: contributionTypes,
    recent_outcomes: outcomes.slice(-10).reverse(),
    recent_contributions: contributions.slice(-10).reverse(),
    recent_rewards: rewards.slice(-10).reverse(),
    missions: missions.map((m: any) => ({
      id: m.id,
      title: m.title,
      status: m.status,
      claims: `${m.claimed_count || 0}/${m.max_claims}`,
    })),
    mission_claims: missionClaims,
    agent_runs: agentRuns.slice(-10).reverse(),
    telemetry_rate: telemetryRate,
  })
}
