// Agent self-diagnostic helper.
//
// Given an agent_identity_id, returns a health snapshot + actionable
// flags the agent should act on. Used by:
//   - GET /api/agents/[id]/directives  (HTTP endpoint)
//   - toolroute_check_health MCP tool  (direct call, no HTTP roundtrip)
//
// Never throws — DB failures return a degraded snapshot with a single
// FETCH_FAILED flag so the agent always gets something actionable.

import type { SupabaseClient } from '@supabase/supabase-js'
import { getActiveNotices, type MigrationNotice } from '@/lib/notices'

export type Severity = 'critical' | 'warning' | 'info'
export type Health = 'healthy' | 'degraded' | 'critical'

export interface HealthFlag {
  code: string
  severity: Severity
  message: string
  action: string
}

export interface AgentDirectives {
  agent_id: string
  agent_name: string | null
  health: Health
  routing_calls_30d: number
  outcome_reports_30d: number
  last_routing_call: string | null
  health_flags: HealthFlag[]
  notices: MigrationNotice[]
  checked_at: string
}

const DAY_MS = 24 * 60 * 60 * 1000

export async function buildAgentDirectives(
  supabase: SupabaseClient,
  agentId: string,
): Promise<AgentDirectives | null> {
  const checked_at = new Date().toISOString()

  // 1. Confirm the agent exists.
  const { data: agent, error: agentErr } = await supabase
    .from('agent_identities')
    .select('id, agent_name')
    .eq('id', agentId)
    .maybeSingle()
  if (agentErr || !agent) return null

  // 2. Fire counts + last-call + notices in parallel. Each is cheap and
  // bounded by the 30-day filter / single-row limit.
  const thirtyDaysAgo = new Date(Date.now() - 30 * DAY_MS).toISOString()
  const [
    routingCountResult,
    outcomeCountResult,
    lastCallResult,
    notices,
  ] = await Promise.all([
    supabase
      .from('model_routing_decisions')
      .select('id', { count: 'exact', head: true })
      .eq('agent_identity_id', agentId)
      .gt('created_at', thirtyDaysAgo),
    supabase
      .from('model_outcome_records')
      .select('id', { count: 'exact', head: true })
      .eq('agent_identity_id', agentId)
      .gt('created_at', thirtyDaysAgo),
    supabase
      .from('model_routing_decisions')
      .select('created_at')
      .eq('agent_identity_id', agentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    getActiveNotices(supabase as any, agentId),
  ])

  const routing_calls_30d = routingCountResult.count ?? 0
  const outcome_reports_30d = outcomeCountResult.count ?? 0
  const last_routing_call = (lastCallResult.data as any)?.created_at ?? null

  // 3. Derive flags. Order matters: critical first so it dominates `health`.
  const health_flags: HealthFlag[] = []

  if (routing_calls_30d === 0) {
    health_flags.push({
      code: 'NO_ROUTING_CALLS',
      severity: 'critical',
      message: 'No routing calls recorded in 30 days. Your /api/route integration may be broken.',
      action: 'Call POST /api/route or POST /api/route/model with your agent_identity_id on every task.',
    })
  } else if (outcome_reports_30d === 0) {
    health_flags.push({
      code: 'NO_TELEMETRY',
      severity: 'warning',
      message: 'You are routing but not reporting outcomes. Routing memory cannot improve without outcome data.',
      action: 'Call POST /api/report/model after every model call with the decision_id from your route response.',
    })
  } else if (outcome_reports_30d / routing_calls_30d < 0.5) {
    health_flags.push({
      code: 'LOW_TELEMETRY_RATE',
      severity: 'info',
      message: `Only ${Math.round((outcome_reports_30d / routing_calls_30d) * 100)}% of your routing calls have outcome reports. Routing memory is improving slowly.`,
      action: 'Increase outcome reporting frequency. Aim for one /api/report/model call per /api/route/model call.',
    })
  }

  // STALE_AGENT is independent — emit alongside the above if the last
  // call is old but the agent has had activity in the 30-day window.
  if (last_routing_call) {
    const ageMs = Date.now() - new Date(last_routing_call).getTime()
    const ageDays = Math.floor(ageMs / DAY_MS)
    if (ageDays > 7) {
      health_flags.push({
        code: 'STALE_AGENT',
        severity: 'warning',
        message: `Last routing call was ${ageDays} days ago.`,
        action: 'Verify your integration is still active. Restart your agent or re-check your MCP config.',
      })
    }
  }

  // 4. Overall health: critical > warning > healthy.
  let health: Health = 'healthy'
  if (health_flags.some(f => f.severity === 'critical')) health = 'critical'
  else if (health_flags.some(f => f.severity === 'warning')) health = 'degraded'

  return {
    agent_id: agentId,
    agent_name: (agent as any).agent_name ?? null,
    health,
    routing_calls_30d,
    outcome_reports_30d,
    last_routing_call,
    health_flags,
    notices,
    checked_at,
  }
}

// Lightweight check for the route handlers. Returns the top flag code
// when the agent's integration looks broken, or null otherwise. Two
// HEAD counts, bounded by a 150ms timeout — never blocks the response.

export async function checkAgentHealthHint(
  supabase: SupabaseClient,
  agentId: string,
  outcomeTable: 'model_outcome_records' | 'outcome_records',
  decisionTable: 'model_routing_decisions' | 'skill_routing_decisions',
  timeoutMs = 150,
): Promise<{ status: 'degraded'; top_flag: string } | null> {
  if (!agentId) return null

  try {
    const work = (async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * DAY_MS).toISOString()
      const [routingCount, outcomeCount] = await Promise.all([
        supabase
          .from(decisionTable)
          .select('id', { count: 'exact', head: true })
          .eq('agent_identity_id', agentId)
          .gt('created_at', thirtyDaysAgo),
        supabase
          .from(outcomeTable)
          .select('id', { count: 'exact', head: true })
          .eq('agent_identity_id', agentId)
          .gt('created_at', thirtyDaysAgo),
      ])
      const calls = routingCount.count ?? 0
      const reports = outcomeCount.count ?? 0
      // The current request itself hasn't been recorded yet, so `calls`
      // counts *prior* activity. If it's zero, this is effectively the
      // agent's first call and NO_ROUTING_CALLS would mislead — skip it.
      if (calls > 0 && reports === 0) {
        return { status: 'degraded' as const, top_flag: 'NO_TELEMETRY' }
      }
      return null
    })()

    const timer = new Promise<null>(resolve => setTimeout(() => resolve(null), timeoutMs))
    return await Promise.race([work, timer])
  } catch {
    return null
  }
}
