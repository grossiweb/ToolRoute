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

  // Phase 2 metrics: HEAD-count and aggregate-friendly queries below the
  // main fetch block. ISO `now` is used for the active-notices filter.
  const nowIso = new Date().toISOString()

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
    contributingAgentsResult,
    modelDecisionsCountResult,
    skillDecisionsCountResult,
    decisionPairsResult,
    activeNoticesCountResult,
    skillScoresResult,
  ] = await Promise.all([
    // Agents query now includes project_context + routing_preferences so we
    // can compute the Phase 2 adoption stats (project context, provider
    // constraint) without an extra round trip.
    supabase.from('agent_identities').select('id, agent_name, agent_kind, trust_tier, is_active, project_context, routing_preferences, created_at').eq('is_active', true),
    supabase.from('outcome_records').select('id, skill_id, outcome_status, latency_ms, estimated_cost_usd, output_quality_rating, created_at'),
    supabase.from('contribution_events').select('id, contributor_id, agent_identity_id, contribution_type, run_count, accepted, created_at').order('created_at', { ascending: false }).limit(500),
    supabase.from('reward_ledgers').select('id, contributor_id, agent_identity_id, routing_credits, reputation_points, economic_credits_usd, reason, created_at').order('created_at', { ascending: false }).limit(100),
    supabase.from('benchmark_missions').select('id, title, status, max_claims, claimed_count'),
    supabase.from('mission_claims').select('id, mission_id, agent_identity_id, status, claimed_at, completed_at, reward_routing_credits'),
    supabase.from('agent_runs').select('id, agent_identity_id, skill_id, outcome, latency_ms, created_at'),
    supabase.from('skills').select('id, slug, canonical_name').eq('status', 'active'),
    supabase.from('contributors').select('id, contributor_type, display_name, created_at'),
    supabase.from('telemetry_rate_tracking').select('*'),
    supabase.from('model_routing_decisions').select('id, task_snippet, resolved_tier, recommended_alias, confidence, agent_identity_id, created_at').order('created_at', { ascending: false }).limit(500),
    supabase.from('model_outcome_records').select('id, model_id, agent_identity_id, outcome_status, latency_ms, output_quality_rating, estimated_cost_usd, created_at').order('created_at', { ascending: false }).limit(20),
    supabase.from('workflow_challenges').select('id, title, slug, category, submission_count, status'),
    supabase.from('challenge_submissions').select('id, challenge_id, agent_identity_id, tier, overall_score, scored_at, agent_identities(agent_name), workflow_challenges(title, slug)').order('scored_at', { ascending: false }).limit(20),
    // Dedicated unbounded query for distinct contributing-agent count. The
    // contributionsResult above limits to 500 for the recent-events list,
    // which would undercount distinct agents once we exceed that window.
    supabase.from('contribution_events').select('agent_identity_id').not('agent_identity_id', 'is', null),
    // Recursive-loop metrics: HEAD counts where we just want a total, and a
    // bounded (agent_identity_id, task_cluster) fetch we'll dedupe in JS
    // for both memory_active_pairs and task_cluster_distribution.
    supabase.from('model_routing_decisions').select('*', { count: 'exact', head: true }),
    supabase.from('skill_routing_decisions').select('*', { count: 'exact', head: true }),
    supabase.from('model_routing_decisions')
      .select('agent_identity_id, task_cluster')
      .not('agent_identity_id', 'is', null)
      .not('task_cluster', 'is', null)
      .range(0, 19999),
    supabase.from('migration_notices').select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`),
    supabase.from('skill_scores').select('skill_id, score_version, updated_at').range(0, 999),
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
  if (contributingAgentsResult.error) queryErrors.contributing_agents = contributingAgentsResult.error.message
  if (modelDecisionsCountResult.error) queryErrors.model_decisions_count = modelDecisionsCountResult.error.message
  if (skillDecisionsCountResult.error) queryErrors.skill_decisions_count = skillDecisionsCountResult.error.message
  if (decisionPairsResult.error) queryErrors.decision_pairs = decisionPairsResult.error.message
  if (activeNoticesCountResult.error) queryErrors.active_notices_count = activeNoticesCountResult.error.message
  if (skillScoresResult.error) queryErrors.skill_scores = skillScoresResult.error.message

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
  const contributingAgentsRaw = contributingAgentsResult.data || []

  // Contributing agents = distinct agent_identity_ids in contribution_events
  // restricted to currently-active agents. Bounded above by registered_agents
  // by construction.
  const activeAgentIds = new Set(agents.map((a: any) => a.id))
  const contributingAgents = new Set(
    contributingAgentsRaw
      .map((r: any) => r.agent_identity_id)
      .filter((id: string) => id && activeAgentIds.has(id))
  ).size

  // Skills with outcome data = distinct skill_ids appearing in outcome_records.
  // Reuses the already-loaded outcomes array — no extra query.
  const skillsWithOutcomeData = new Set(
    outcomes.map((o: any) => o.skill_id).filter(Boolean)
  ).size

  // ── Recursive-loop metrics ────────────────────────────────────────────
  const decisionPairs = decisionPairsResult.data || []
  const skillScores = skillScoresResult.data || []

  // Distinct (agent, cluster) combos. Capped at the 20k row fetch above —
  // currently safe (12.5k rows total), revisit if model_routing_decisions
  // exceeds 20k and exact accuracy matters more than one query.
  const memoryActivePairs = new Set(
    decisionPairs.map((r: any) => `${r.agent_identity_id}|${r.task_cluster}`)
  ).size

  // Top 8 task clusters by all-time count.
  const clusterCounts: Record<string, number> = {}
  for (const r of decisionPairs) {
    if (r.task_cluster) clusterCounts[r.task_cluster] = (clusterCounts[r.task_cluster] || 0) + 1
  }
  const taskClusterDistribution = Object.entries(clusterCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([cluster, count]) => ({ cluster, count }))

  // Phase 2 adoption stats — computed from the agents array (which now
  // includes project_context + routing_preferences).
  const agentsWithProjectContext = agents.filter((a: any) => {
    const pc = a.project_context
    return pc && typeof pc === 'object' && !Array.isArray(pc) && Object.keys(pc).length > 0
  }).length
  const agentsWithProviderConstraint = agents.filter((a: any) => {
    const providers = a.routing_preferences?.available_providers
    return Array.isArray(providers) && providers.length > 0
  }).length

  // Score version distribution + last recalc timestamp.
  const scoreVersionCounts: Record<string, number> = {}
  let lastScoreRecalcAt: string | null = null
  for (const s of skillScores) {
    const v = s.score_version || 'unknown'
    scoreVersionCounts[v] = (scoreVersionCounts[v] || 0) + 1
    if (s.updated_at && (!lastScoreRecalcAt || s.updated_at > lastScoreRecalcAt)) {
      lastScoreRecalcAt = s.updated_at
    }
  }

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
  // Human-verified = completed the tweet verification flow (trust_tier promoted above baseline)
  const verifiedAgents = agents.filter((a: any) => a.trust_tier === 'trusted' || a.trust_tier === 'production' || a.trust_tier === 'enterprise').length
  const humanVerifiedAgents = agents.filter((a: any) => a.trust_tier === 'trusted' || a.trust_tier === 'production' || a.trust_tier === 'enterprise').length

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
      human_verified_agents: humanVerifiedAgents,
      agents_with_project_context: agentsWithProjectContext,
      agents_with_provider_constraint: agentsWithProviderConstraint,
      trust_tier_breakdown: trustTierBreakdown,
      top_skills: topSkills,
    },
    recursive_loop: {
      model_routing_decisions_total: modelDecisionsCountResult.count ?? 0,
      skill_routing_decisions_total: skillDecisionsCountResult.count ?? 0,
      memory_active_pairs: memoryActivePairs,
      active_migration_notices: activeNoticesCountResult.count ?? 0,
      task_cluster_distribution: taskClusterDistribution,
      score_version_distribution: scoreVersionCounts,
      last_score_recalc_at: lastScoreRecalcAt,
    },
    summary: {
      registered_agents: agents.length,
      contributing_agents: contributingAgents,
      total_contributor_entities: contributors.length,
      total_outcome_records: outcomes.length,
      total_contributions: contributions.length,
      total_reward_entries: rewards.length,
      total_routing_credits_issued: totalCredits,
      total_reputation_points_issued: totalReputation,
      total_mission_claims: missionClaims.length,
      total_agent_runs: agentRuns.length,
      total_skills_in_catalog: skills.length,
      skills_with_outcome_data: skillsWithOutcomeData,
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
    recent_contributions: contributions.slice(0, 10),
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
      // 7-day tier distribution — reflects current routing behavior post-migration
      tier_distribution: modelDecisions
        .filter((d: any) => d.created_at && (now - new Date(d.created_at).getTime()) < ms7d)
        .reduce((acc: any, d: any) => {
          acc[d.resolved_tier] = (acc[d.resolved_tier] || 0) + 1
          return acc
        }, {} as Record<string, number>),
      // All-time tier distribution — includes pre-migration history, for reference
      tier_distribution_all_time: modelDecisions.reduce((acc: any, d: any) => {
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
