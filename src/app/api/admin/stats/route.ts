import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// GET /api/admin/stats — Platform telemetry dashboard (protected)
export async function GET(request: Request) {
  // Auth check — requires ADMIN_SECRET or CRON_SECRET
  const authHeader = request.headers.get('authorization')
  const adminSecret = process.env.ADMIN_SECRET || process.env.CRON_SECRET
  if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
    modelDecisionsResult,
    modelOutcomesResult,
    challengesResult,
    challengeSubmissionsResult,
  ] = await Promise.all([
    supabase.from('agent_identities').select('id, agent_name, agent_kind, trust_tier, is_active, created_at').eq('is_active', true),
    supabase.from('outcome_records').select('id, skill_id, outcome_status, latency_ms, estimated_cost_usd, output_quality_rating, created_at'),
    supabase.from('contribution_events').select('id, contributor_id, agent_identity_id, contribution_type, run_count, accepted, created_at'),
    supabase.from('reward_ledgers').select('id, contributor_id, agent_identity_id, routing_credits, reputation_points, economic_credits_usd, reason, created_at').order('created_at', { ascending: false }).limit(100),
    supabase.from('benchmark_missions').select('id, title, status, max_claims, claimed_count'),
    supabase.from('mission_claims').select('id, mission_id, agent_identity_id, status, claimed_at, completed_at, reward_routing_credits'),
    supabase.from('agent_runs').select('id, agent_identity_id, skill_id, outcome, latency_ms, created_at'),
    supabase.from('skills').select('id, slug, canonical_name').eq('status', 'active'),
    supabase.from('contributors').select('id, contributor_type, display_name, created_at'),
    supabase.from('telemetry_rate_tracking').select('*'),
    supabase.from('model_routing_decisions').select('id, task_snippet, resolved_tier, recommended_alias, confidence, agent_identity_id, created_at').order('created_at', { ascending: false }).limit(20),
    supabase.from('model_outcome_records').select('id, model_id, agent_identity_id, outcome_status, latency_ms, output_quality_rating, estimated_cost_usd, created_at').order('created_at', { ascending: false }).limit(20),
    supabase.from('workflow_challenges').select('id, title, slug, category, submission_count, status'),
    supabase.from('challenge_submissions').select('id, challenge_id, agent_identity_id, tier, overall_score, scored_at, agent_identities(agent_name), workflow_challenges(title, slug)').order('scored_at', { ascending: false }).limit(20),
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
  if (modelDecisionsResult.error) queryErrors.model_routing_decisions = modelDecisionsResult.error.message
  if (modelOutcomesResult.error) queryErrors.model_outcome_records = modelOutcomesResult.error.message
  if (challengesResult.error) queryErrors.workflow_challenges = challengesResult.error.message
  if (challengeSubmissionsResult.error) queryErrors.challenge_submissions = challengeSubmissionsResult.error.message

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
  const modelDecisions = modelDecisionsResult.data || []
  const modelOutcomes = modelOutcomesResult.data || []
  const challenges = challengesResult.data || []
  const challengeSubmissions = challengeSubmissionsResult.data || []

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

  // Growth metrics
  const now = Date.now()
  const ms7d = 7 * 24 * 60 * 60 * 1000
  const ms30d = 30 * 24 * 60 * 60 * 1000
  const newAgents7d = agents.filter((a: any) => a.created_at && (now - new Date(a.created_at).getTime()) < ms7d).length
  const newAgents30d = agents.filter((a: any) => a.created_at && (now - new Date(a.created_at).getTime()) < ms30d).length
  // Active = any agent who made a routing call, model decision, or contribution in the last 7 days
  const activeAgentIds7d = new Set([
    ...contributions
      .filter((c: any) => c.created_at && (now - new Date(c.created_at).getTime()) < ms7d && c.agent_identity_id)
      .map((c: any) => c.agent_identity_id),
    ...modelDecisions
      .filter((d: any) => d.created_at && (now - new Date(d.created_at).getTime()) < ms7d && d.agent_identity_id)
      .map((d: any) => d.agent_identity_id),
    ...modelOutcomes
      .filter((o: any) => o.created_at && (now - new Date(o.created_at).getTime()) < ms7d && (o as any).agent_identity_id)
      .map((o: any) => (o as any).agent_identity_id),
  ])
  const activeAgents7d = activeAgentIds7d.size
  const acceptedContributions = contributions.filter((c: any) => c.accepted).length
  const acceptanceRate = contributions.length > 0 ? Math.round((acceptedContributions / contributions.length) * 100) : 0
  const qualityRatings = outcomes.map((o: any) => o.output_quality_rating).filter((r: any) => r != null)
  const avgQualityRating = qualityRatings.length > 0
    ? Math.round((qualityRatings.reduce((s: number, r: number) => s + r, 0) / qualityRatings.length) * 10) / 10
    : null
  const trustTierBreakdown = agents.reduce((acc: any, a: any) => {
    const t = a.trust_tier || 'unverified'
    acc[t] = (acc[t] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const verifiedAgents = agents.filter((a: any) => a.trust_tier === 'trusted' || a.trust_tier === 'production' || a.trust_tier === 'enterprise').length

  // Platform-wide telemetry rate
  const totalRecs = telemetryRate.reduce((s: number, t: any) => s + (t.total_recommendations || 0), 0)
  const totalReported = telemetryRate.reduce((s: number, t: any) => s + (t.total_reported_runs || 0), 0)
  const platformTelemetryRate = totalRecs > 0 ? Math.round((totalReported / totalRecs) * 100) : 0

  // Top skills by outcome count
  const skillUsage: Record<string, number> = {}
  outcomes.forEach((o: any) => {
    if (o.skill_id) skillUsage[o.skill_id] = (skillUsage[o.skill_id] || 0) + 1
  })
  const topSkills = Object.entries(skillUsage)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([skillId, count]) => {
      const skill = skills.find((s: any) => s.id === skillId)
      return { slug: skill?.slug || skillId, name: skill?.canonical_name || skillId, count }
    })

  return NextResponse.json({
    generated_at: new Date().toISOString(),
    query_errors: Object.keys(queryErrors).length > 0 ? queryErrors : null,
    growth: {
      new_agents_7d: newAgents7d,
      new_agents_30d: newAgents30d,
      active_agents_7d: activeAgents7d,
      retention_rate_pct: agents.length > 0 ? Math.round((activeAgents7d / agents.length) * 100) : 0,
      platform_telemetry_rate_pct: platformTelemetryRate,
      acceptance_rate_pct: acceptanceRate,
      avg_quality_rating: avgQualityRating,
      verified_agents: verifiedAgents,
      trust_tier_breakdown: trustTierBreakdown,
      top_skills: topSkills,
    },
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
      model_routing_decisions: modelDecisions.length,
      model_outcome_reports: modelOutcomes.length,
      workflow_challenges: challenges.length,
      challenge_submissions: challengeSubmissions.length,
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
    recent_rewards: rewards.slice(0, 10),
    missions: missions.map((m: any) => ({
      id: m.id,
      title: m.title,
      status: m.status,
      claims: `${m.claimed_count || 0}/${m.max_claims}`,
    })),
    mission_claims: missionClaims,
    agent_runs: agentRuns.slice(-10).reverse(),
    telemetry_rate: telemetryRate,

    // Model routing
    model_routing: {
      total_decisions: modelDecisions.length,
      total_outcomes: modelOutcomes.length,
      tier_distribution: modelDecisions.reduce((acc: any, d: any) => {
        acc[d.resolved_tier] = (acc[d.resolved_tier] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      recent_decisions: modelDecisions.slice(0, 10),
      recent_outcomes: modelOutcomes.slice(0, 10),
    },

    // Challenges
    challenges: {
      total: challenges.length,
      by_category: challenges.reduce((acc: any, c: any) => {
        acc[c.category] = (acc[c.category] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      total_submissions: challengeSubmissions.length,
      tier_breakdown: challengeSubmissions.reduce((acc: any, s: any) => {
        const t = (s.tier || 'unscored').toLowerCase()
        acc[t] = (acc[t] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      recent_submissions: challengeSubmissions.slice(0, 10).map((s: any) => ({
        id: s.id,
        challenge: (s.workflow_challenges as any)?.title || 'Unknown',
        agent: (s.agent_identities as any)?.agent_name || 'Unknown',
        tier: s.tier,
        score: s.overall_score,
        scored_at: s.scored_at,
      })),
    },
  })
}
