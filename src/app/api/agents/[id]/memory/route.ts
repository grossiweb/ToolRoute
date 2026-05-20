// GET /api/agents/[id]/memory
//
// Returns an agent's routing memory — both model-side and skill-side
// per-cluster history of past routing decisions and their outcomes.
//
// Summary (no ?cluster=):
//   {
//     agent_identity_id, agent_name,
//     model_memory: { total_calls, distinct_clusters, top_clusters[], window },
//     skill_memory: { total_calls, distinct_clusters, top_clusters[], window },
//   }
//
// Detail (?cluster=<string>):
//   {
//     agent_identity_id, agent_name, cluster,
//     model_memory: RoutingMemory       | null,
//     skill_memory: SkillRoutingMemory  | null,
//   }
//
// Auth:
//   Bearer <agent_identity_id>  — agent fetching its own memory
//   Bearer <ADMIN_SECRET>       — admin override
//
// Soft auth caveat: agent_identity_id flows through register, route,
// report — it's not a strong secret. Use the public_key signing flow
// (see /api/agents/register) if real ownership proof is needed later.

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getRoutingMemory, getSkillRoutingMemory } from '@/lib/routing-memory'

const TOP_CLUSTERS = 20
const SUMMARY_DECISION_WINDOW = 500
const OUTCOMES_WINDOW = 1000

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const agentId = params.id
  if (!agentId) {
    return NextResponse.json({ error: 'Agent id required' }, { status: 400 })
  }

  // Auth: bearer token must equal the agent id OR the admin secret.
  const authHeader = request.headers.get('authorization')
  const adminSecret = process.env.ADMIN_SECRET || process.env.CRON_SECRET
  const expectedAgent = `Bearer ${agentId}`
  const expectedAdmin = adminSecret ? `Bearer ${adminSecret}` : null
  if (authHeader !== expectedAgent && (!expectedAdmin || authHeader !== expectedAdmin)) {
    return NextResponse.json(
      { error: 'Unauthorized', hint: 'Authorization: Bearer <agent_identity_id> or Bearer <admin_secret>' },
      { status: 401 },
    )
  }

  const supabase = createServerSupabaseClient()
  const { searchParams } = new URL(request.url)
  const cluster = searchParams.get('cluster')

  // Confirm the agent exists. This also lets us include agent_name in the
  // response so callers don't need a second lookup.
  const { data: agent, error: agentErr } = await supabase
    .from('agent_identities')
    .select('id, agent_name')
    .eq('id', agentId)
    .maybeSingle()

  if (agentErr) {
    return NextResponse.json({ error: 'Database error', detail: agentErr.message }, { status: 500 })
  }
  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  // ── Detail view ─────────────────────────────────────────────────────
  if (cluster) {
    // Both lookups have hard 200ms timeouts internally — fire in parallel.
    const [model_memory, skill_memory] = await Promise.all([
      getRoutingMemory(supabase, agentId, cluster),
      getSkillRoutingMemory(supabase, agentId, cluster),
    ])
    return NextResponse.json({
      agent_identity_id: agentId,
      agent_name: agent.agent_name,
      cluster,
      model_memory,
      skill_memory,
    })
  }

  // ── Summary view ────────────────────────────────────────────────────
  // Fire the two summary lookups in parallel. Each one is independent.
  const [model_memory, skill_memory] = await Promise.all([
    buildModelSummary(supabase, agentId),
    buildSkillSummary(supabase, agentId),
  ])

  return NextResponse.json({
    agent_identity_id: agentId,
    agent_name: agent.agent_name,
    model_memory,
    skill_memory,
  })
}

// ── Model-side summary ─────────────────────────────────────────────────
// Pulls recent model_routing_decisions, joins to model_outcome_records
// by routing_decision_id (which is how the model side stores the
// linkage), groups by cluster.

async function buildModelSummary(supabase: any, agentId: string) {
  const { data: decisions, error: decErr } = await supabase
    .from('model_routing_decisions')
    .select('id, recommended_model_id, task_cluster, created_at')
    .eq('agent_identity_id', agentId)
    .not('task_cluster', 'is', null)
    .order('created_at', { ascending: false })
    .limit(SUMMARY_DECISION_WINDOW)

  if (decErr) {
    return { error: 'Failed to load model decisions', detail: decErr.message }
  }

  const decisionRows = decisions ?? []
  if (decisionRows.length === 0) {
    return emptySummary()
  }

  const decisionIds = decisionRows.map((d: any) => d.id as string)
  const { data: outcomes, error: outErr } = await supabase
    .from('model_outcome_records')
    .select('routing_decision_id, outcome_status, output_quality_rating, computed_quality, verified_quality')
    .in('routing_decision_id', decisionIds)

  if (outErr) {
    return { error: 'Failed to load model outcomes', detail: outErr.message }
  }

  const outcomesByDecision = new Map<string, any>()
  for (const o of outcomes ?? []) {
    if (!outcomesByDecision.has(o.routing_decision_id)) {
      outcomesByDecision.set(o.routing_decision_id, o)
    }
  }

  type Stats = {
    call_count: number
    success_count: number
    quality_sum: number
    quality_n: number
    most_recent_success_model: string | null
    most_recent_decision_at: string | null
  }
  const byCluster = new Map<string, Stats>()

  for (const d of decisionRows as any[]) {
    const c = d.task_cluster as string
    const s = byCluster.get(c) ?? {
      call_count: 0,
      success_count: 0,
      quality_sum: 0,
      quality_n: 0,
      most_recent_success_model: null,
      most_recent_decision_at: null,
    }
    s.call_count++

    const o = outcomesByDecision.get(d.id)
    if (o) {
      const ok = o.outcome_status === 'success' || o.outcome_status === 'partial_success'
      if (ok) {
        s.success_count++
        // First write wins (DESC order) → most-recent successful pick.
        if (!s.most_recent_success_model) {
          s.most_recent_success_model = d.recommended_model_id as string
          s.most_recent_decision_at = d.created_at as string
        }
      }
      const q = o.verified_quality ?? o.computed_quality ?? o.output_quality_rating
      if (q != null) {
        s.quality_sum += Number(q)
        s.quality_n++
      }
    }
    byCluster.set(c, s)
  }

  const top_clusters = Array.from(byCluster.entries())
    .map(([cluster, s]) => ({
      cluster,
      call_count: s.call_count,
      sample_size: s.call_count,
      success_rate: s.call_count > 0
        ? Math.round((s.success_count / s.call_count) * 100) / 100
        : 0,
      avg_quality: s.quality_n > 0
        ? Math.round((s.quality_sum / s.quality_n) * 10) / 10
        : null,
      historical_model: s.most_recent_success_model,
      last_decision_at: s.most_recent_decision_at,
    }))
    .sort((a, b) => b.call_count - a.call_count)
    .slice(0, TOP_CLUSTERS)

  return {
    total_calls: decisionRows.length,
    distinct_clusters: byCluster.size,
    top_clusters,
    window: SUMMARY_DECISION_WINDOW,
    ...(decisionRows.length === SUMMARY_DECISION_WINDOW
      ? { note: `Stats over most-recent ${SUMMARY_DECISION_WINDOW} decisions; older history excluded.` }
      : {}),
  }
}

// ── Skill-side summary ─────────────────────────────────────────────────
// outcome_records has no routing_decision_id linkage, so we approximate:
//   1. Pull recent skill_routing_decisions for the agent, group by cluster.
//   2. Pull the agent's recent outcomes for any skill referenced in (1).
//   3. Per cluster: collect outcomes whose skill_id was recommended in
//      that cluster's decisions. Stats are computed over those outcomes.
// This isn't perfectly causal (an outcome may not match a specific
// recommendation), but it gives a fair "how have my skills for this
// kind of task performed?" view.

async function buildSkillSummary(supabase: any, agentId: string) {
  const { data: decisions, error: decErr } = await supabase
    .from('skill_routing_decisions')
    .select('recommended_skill_id, recommended_skill_slug, task_cluster, created_at')
    .eq('agent_identity_id', agentId)
    .not('task_cluster', 'is', null)
    .not('recommended_skill_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(SUMMARY_DECISION_WINDOW)

  if (decErr) {
    return { error: 'Failed to load skill decisions', detail: decErr.message }
  }

  const decisionRows = decisions ?? []
  if (decisionRows.length === 0) {
    return emptySummary()
  }

  // For each cluster: track call_count + set of skill_ids referenced +
  // most-recent slug per skill_id (for the historical_skill output).
  type SkillStats = {
    call_count: number
    skill_ids: Set<string>
    skill_slugs: Map<string, string>
    most_recent_decision_at: string | null
  }
  const byCluster = new Map<string, SkillStats>()

  for (const d of decisionRows as any[]) {
    const c = d.task_cluster as string
    const s = byCluster.get(c) ?? {
      call_count: 0,
      skill_ids: new Set<string>(),
      skill_slugs: new Map<string, string>(),
      most_recent_decision_at: null,
    }
    s.call_count++
    s.skill_ids.add(d.recommended_skill_id)
    if (!s.skill_slugs.has(d.recommended_skill_id)) {
      s.skill_slugs.set(d.recommended_skill_id, d.recommended_skill_slug)
    }
    if (!s.most_recent_decision_at) {
      s.most_recent_decision_at = d.created_at
    }
    byCluster.set(c, s)
  }

  // Union of all skill_ids across all clusters → one outcomes query.
  const allSkillIds = Array.from(
    new Set(Array.from(byCluster.values()).flatMap(s => Array.from(s.skill_ids))),
  )
  if (allSkillIds.length === 0) {
    return {
      total_calls: decisionRows.length,
      distinct_clusters: byCluster.size,
      top_clusters: [],
      window: SUMMARY_DECISION_WINDOW,
    }
  }

  const { data: outcomes, error: outErr } = await supabase
    .from('outcome_records')
    .select('skill_id, outcome_status, output_quality_rating, verified_quality, computed_quality, created_at')
    .eq('agent_identity_id', agentId)
    .in('skill_id', allSkillIds)
    .order('created_at', { ascending: false })
    .limit(OUTCOMES_WINDOW)

  if (outErr) {
    return { error: 'Failed to load skill outcomes', detail: outErr.message }
  }

  const outcomesBySkill = new Map<string, any[]>()
  for (const o of outcomes ?? []) {
    const arr = outcomesBySkill.get(o.skill_id) ?? []
    arr.push(o)
    outcomesBySkill.set(o.skill_id, arr)
  }

  const top_clusters = Array.from(byCluster.entries())
    .map(([cluster, s]) => {
      // Outcomes for any skill recommended in this cluster, newest first.
      const clusterOutcomes: any[] = []
      for (const sid of Array.from(s.skill_ids)) {
        clusterOutcomes.push(...(outcomesBySkill.get(sid) ?? []))
      }
      clusterOutcomes.sort((a, b) =>
        String(b.created_at).localeCompare(String(a.created_at)),
      )

      const isOk = (status: string) =>
        status === 'success' || status === 'partial_success'
      const successful = clusterOutcomes.filter(o => isOk(o.outcome_status))
      const sample_size = clusterOutcomes.length
      const success_rate = sample_size > 0
        ? Math.round((successful.length / sample_size) * 100) / 100
        : 0

      const histSkillId = successful[0]?.skill_id as string | undefined
      const historical_skill = histSkillId
        ? s.skill_slugs.get(histSkillId) ?? null
        : null

      const qualities = clusterOutcomes
        .map(o => o.verified_quality ?? o.computed_quality ?? o.output_quality_rating ?? null)
        .filter((q): q is number => q != null)
      const avg_quality = qualities.length > 0
        ? Math.round((qualities.reduce((sum, q) => sum + q, 0) / qualities.length) * 10) / 10
        : null

      return {
        cluster,
        call_count: s.call_count,
        sample_size,
        success_rate,
        avg_quality,
        historical_skill,
        last_decision_at: s.most_recent_decision_at,
      }
    })
    .sort((a, b) => b.call_count - a.call_count)
    .slice(0, TOP_CLUSTERS)

  return {
    total_calls: decisionRows.length,
    distinct_clusters: byCluster.size,
    top_clusters,
    window: SUMMARY_DECISION_WINDOW,
    ...(decisionRows.length === SUMMARY_DECISION_WINDOW
      ? { note: `Stats over most-recent ${SUMMARY_DECISION_WINDOW} decisions; older history excluded.` }
      : {}),
  }
}

function emptySummary() {
  return {
    total_calls: 0,
    distinct_clusters: 0,
    top_clusters: [],
    window: SUMMARY_DECISION_WINDOW,
  }
}
