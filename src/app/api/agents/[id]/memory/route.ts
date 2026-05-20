// GET /api/agents/[id]/memory
//
// Returns an agent's routing memory — the per-cluster history of past
// routing decisions and their outcomes.
//
// Summary (no ?cluster=):
//   { agent_identity_id, agent_name, total_calls, distinct_clusters,
//     top_clusters: [{ cluster, call_count, success_rate, avg_quality,
//                      historical_model, sample_size }] }
//
// Detail (?cluster=<string>):
//   { agent_identity_id, cluster, memory: RoutingMemory | null }
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
import { getRoutingMemory } from '@/lib/routing-memory'

const TOP_CLUSTERS = 20
const SUMMARY_DECISION_WINDOW = 500

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
    const memory = await getRoutingMemory(supabase, agentId, cluster)
    return NextResponse.json({
      agent_identity_id: agentId,
      agent_name: agent.agent_name,
      cluster,
      memory, // null when sample_size < 3 or on error
    })
  }

  // ── Summary view ────────────────────────────────────────────────────
  // Pull recent decisions + their outcomes, group by task_cluster in JS.
  // Bounded window keeps the response cheap even for high-volume agents.
  const { data: decisions, error: decErr } = await supabase
    .from('model_routing_decisions')
    .select('id, recommended_model_id, task_cluster, created_at')
    .eq('agent_identity_id', agentId)
    .not('task_cluster', 'is', null)
    .order('created_at', { ascending: false })
    .limit(SUMMARY_DECISION_WINDOW)

  if (decErr) {
    return NextResponse.json({ error: 'Failed to load decisions', detail: decErr.message }, { status: 500 })
  }

  const decisionRows = decisions ?? []
  if (decisionRows.length === 0) {
    return NextResponse.json({
      agent_identity_id: agentId,
      agent_name: agent.agent_name,
      total_calls: 0,
      distinct_clusters: 0,
      top_clusters: [],
      window: SUMMARY_DECISION_WINDOW,
    })
  }

  const decisionIds = decisionRows.map((d: any) => d.id as string)
  const { data: outcomes, error: outErr } = await supabase
    .from('model_outcome_records')
    .select('routing_decision_id, outcome_status, output_quality_rating, computed_quality, verified_quality')
    .in('routing_decision_id', decisionIds)

  if (outErr) {
    return NextResponse.json({ error: 'Failed to load outcomes', detail: outErr.message }, { status: 500 })
  }

  // Index outcomes by decision id (may be many-to-one — keep the most
  // recent outcome per decision by relying on insertion order; we don't
  // have outcome timestamps in this select but the routing endpoint
  // creates at most one outcome per decision in practice).
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
        // First write wins because decisionRows is ordered DESC — so the
        // first successful row we see for a cluster is the most recent.
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
      sample_size: s.call_count, // every decision in the window counts
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

  return NextResponse.json({
    agent_identity_id: agentId,
    agent_name: agent.agent_name,
    total_calls: decisionRows.length,
    distinct_clusters: byCluster.size,
    top_clusters,
    window: SUMMARY_DECISION_WINDOW,
    note:
      decisionRows.length === SUMMARY_DECISION_WINDOW
        ? `Stats computed over most-recent ${SUMMARY_DECISION_WINDOW} decisions. Older history not included.`
        : undefined,
  })
}
