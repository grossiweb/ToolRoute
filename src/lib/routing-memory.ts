// Recursive intelligence loop, phase 1.
//
// Given an agent + a task_cluster, return the agent's historical outcomes
// for the same cluster — what model worked, how often, how well.
//
// Hard guarantees for callers:
//   - Never throws (any error → null).
//   - Hard 200ms timeout (configurable). The routing endpoint must NOT
//     block its own response on this lookup.
//   - Returns null when sample_size < MIN_SAMPLES (3) so the handler can
//     just do `if (memory) { ... }` and rely on success_rate threshold.

import type { SupabaseClient } from '@supabase/supabase-js'

export interface RoutingMemory {
  historical_model: string | null
  success_rate: number
  sample_size: number
  avg_quality: number | null
}

export const MIN_SAMPLES = 3
const DEFAULT_TIMEOUT_MS = 200

export async function getRoutingMemory(
  supabase: SupabaseClient,
  agentIdentityId: string,
  taskCluster: string,
  limit = 5,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<RoutingMemory | null> {
  if (!agentIdentityId || !taskCluster) return null

  try {
    const work = lookup(supabase, agentIdentityId, taskCluster, limit)
    const timer = new Promise<null>(resolve => setTimeout(() => resolve(null), timeoutMs))
    return await Promise.race([work, timer])
  } catch {
    return null
  }
}

async function lookup(
  supabase: SupabaseClient,
  agentIdentityId: string,
  taskCluster: string,
  limit: number,
): Promise<RoutingMemory | null> {
  // 1. Find the most-recent decisions for (agent, cluster). Overfetch
  // because some decisions may lack outcome records (agent didn't report).
  const { data: decisions, error: dErr } = await supabase
    .from('model_routing_decisions')
    .select('id, recommended_model_id, created_at')
    .eq('agent_identity_id', agentIdentityId)
    .eq('task_cluster', taskCluster)
    .order('created_at', { ascending: false })
    .limit(limit * 4)
  if (dErr || !decisions || decisions.length === 0) return null

  const decisionIds = (decisions as any[]).map(d => d.id)

  // 2. Pull outcomes for those decisions. No outcome_status filter — we
  // need failures too so success_rate is meaningful (not always 1.0).
  const { data: outcomes, error: oErr } = await supabase
    .from('model_outcome_records')
    .select('routing_decision_id, outcome_status, output_quality_rating, computed_quality, verified_quality')
    .in('routing_decision_id', decisionIds)
  if (oErr || !outcomes || outcomes.length === 0) return null

  // 3. Pair each outcome with its decision; order by decision recency.
  const decisionById = new Map<string, any>(
    (decisions as any[]).map(d => [d.id as string, d])
  )
  const paired = (outcomes as any[])
    .map(o => {
      const dec = decisionById.get(o.routing_decision_id)
      return dec ? { o, dec } : null
    })
    .filter((x): x is { o: any; dec: any } => x !== null)
    .sort((a, b) =>
      String(b.dec.created_at).localeCompare(String(a.dec.created_at))
    )
    .slice(0, limit)

  if (paired.length < MIN_SAMPLES) return null

  // 4. Compute stats. historical_model = most-recent successful pick.
  const isOk = (status: string) => status === 'success' || status === 'partial_success'
  const successful = paired.filter(({ o }) => isOk(o.outcome_status))
  const sample_size = paired.length
  const success_rate = Math.round((successful.length / sample_size) * 100) / 100
  const historical_model = (successful[0]?.dec.recommended_model_id as string | undefined) ?? null

  const qualities = paired
    .map(({ o }) =>
      o.verified_quality ?? o.computed_quality ?? o.output_quality_rating ?? null
    )
    .filter((q): q is number => q != null)
  const avg_quality = qualities.length > 0
    ? Math.round((qualities.reduce((s, q) => s + q, 0) / qualities.length) * 10) / 10
    : null

  return { historical_model, success_rate, sample_size, avg_quality }
}

// ── Skill-side counterpart to getRoutingMemory ─────────────────────────────
//
// outcome_records has no routing_decision_id linkage (unlike
// model_outcome_records), so we approximate the "what worked for this
// kind of task" lookup in two passes:
//   1. Pull recent skill_routing_decisions for (agent, cluster) to
//      learn which skills the agent has been recommended for this cluster.
//   2. Pull this agent's recent outcomes for those skills.
// Each outcome counts once; historical_skill is the slug of the
// most-recent successful skill in the sample.

export interface SkillRoutingMemory {
  historical_skill: string | null
  success_rate: number
  sample_size: number
  avg_quality: number | null
}

export async function getSkillRoutingMemory(
  supabase: SupabaseClient,
  agentIdentityId: string,
  taskCluster: string,
  limit = 5,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<SkillRoutingMemory | null> {
  if (!agentIdentityId || !taskCluster) return null

  try {
    const work = skillLookup(supabase, agentIdentityId, taskCluster, limit)
    const timer = new Promise<null>(resolve => setTimeout(() => resolve(null), timeoutMs))
    return await Promise.race([work, timer])
  } catch {
    return null
  }
}

async function skillLookup(
  supabase: SupabaseClient,
  agentIdentityId: string,
  taskCluster: string,
  limit: number,
): Promise<SkillRoutingMemory | null> {
  // 1. Recent decisions for (agent, cluster). We use the set of
  // recommended skills to bound the outcome query, and keep a
  // skill_id → most-recent-slug map for the historical_skill output.
  const { data: decisions, error: dErr } = await supabase
    .from('skill_routing_decisions')
    .select('recommended_skill_id, recommended_skill_slug, created_at')
    .eq('agent_identity_id', agentIdentityId)
    .eq('task_cluster', taskCluster)
    .not('recommended_skill_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit * 4)
  if (dErr || !decisions || decisions.length === 0) return null

  const skillToSlug = new Map<string, string>()
  for (const d of decisions as any[]) {
    // First write wins because decisions arrive DESC.
    if (!skillToSlug.has(d.recommended_skill_id)) {
      skillToSlug.set(d.recommended_skill_id, d.recommended_skill_slug)
    }
  }
  const skillIds = Array.from(skillToSlug.keys())

  // 2. Recent outcomes for this agent on those skills. No outcome_status
  // filter — failures count toward the rate so success_rate is meaningful.
  const { data: outcomes, error: oErr } = await supabase
    .from('outcome_records')
    .select('skill_id, outcome_status, output_quality_rating, verified_quality, computed_quality, created_at')
    .eq('agent_identity_id', agentIdentityId)
    .in('skill_id', skillIds)
    .order('created_at', { ascending: false })
    .limit(limit * 4)
  if (oErr || !outcomes || outcomes.length === 0) return null

  const recent = (outcomes as any[]).slice(0, limit)
  if (recent.length < MIN_SAMPLES) return null

  const isOk = (status: string) => status === 'success' || status === 'partial_success'
  const successful = recent.filter(o => isOk(o.outcome_status))
  const sample_size = recent.length
  const success_rate = Math.round((successful.length / sample_size) * 100) / 100

  const historical_skill_id = successful[0]?.skill_id as string | undefined
  const historical_skill = historical_skill_id
    ? skillToSlug.get(historical_skill_id) ?? null
    : null

  const qualities = recent
    .map(o => o.verified_quality ?? o.computed_quality ?? o.output_quality_rating ?? null)
    .filter((q): q is number => q != null)
  const avg_quality = qualities.length > 0
    ? Math.round((qualities.reduce((s, q) => s + q, 0) / qualities.length) * 10) / 10
    : null

  return { historical_skill, success_rate, sample_size, avg_quality }
}
