import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { apiError } from '@/lib/api-error'
import {
  normalizeActivity,
  computeAnomalyChecks,
  buildIntegrationHealth,
  buildTierProgress,
  type AgentHealth30dRow,
} from '@/lib/agent-health'

// GET /api/agent/status?agent_identity_id=<id>
// No auth — agents check their own integration health, tier progress, and
// 30-day activity. Anomaly checks always run here.
export async function GET(request: NextRequest) {
  const agentId = request.nextUrl.searchParams.get('agent_identity_id')
  if (!agentId) {
    return apiError(
      400,
      'agent_identity_id is required',
      'GET /api/agent/status?agent_identity_id=<your-uuid>. Get one from POST /api/agents/register.',
      undefined,
      'GET /api/agents/register',
    )
  }

  const supabase = createServerSupabaseClient()

  const { data: agent } = await supabase
    .from('agent_identities')
    .select('id, agent_name, created_at, trust_tier, trust_score')
    .eq('id', agentId)
    .maybeSingle()

  if (!agent) {
    return apiError(
      404,
      `No agent found for agent_identity_id '${agentId}'`,
      'Check the UUID, or register at POST /api/agents/register.',
      undefined,
      'GET /api/agents/register',
    )
  }

  const { data: healthRows } = await supabase.rpc('agent_health_30d', { p_agent_id: agentId })
  const row = (Array.isArray(healthRows) ? healthRows[0] : healthRows) as AgentHealth30dRow | undefined

  const activity = row
    ? normalizeActivity(row)
    : {
        routing_decisions: 0, outcomes_reported: 0, contributions_accepted: 0,
        avg_verified_quality: null, success_rate_pct: null, distinct_quality_values: 0,
        last_activity_at: null,
      }

  const checks = computeAnomalyChecks(activity)
  const trustScore = agent.trust_score == null ? 0 : Number(agent.trust_score)

  return NextResponse.json({
    agent_identity_id: agent.id,
    agent_name: agent.agent_name,
    registered_at: agent.created_at,
    trust_tier: agent.trust_tier,
    trust_tier_progress: buildTierProgress(agent.trust_tier || 'unverified', trustScore),
    activity_30d: {
      routing_decisions: activity.routing_decisions,
      outcomes_reported: activity.outcomes_reported,
      contributions_accepted: activity.contributions_accepted,
      avg_verified_quality: activity.avg_verified_quality,
      success_rate_pct: activity.success_rate_pct,
      last_activity_at: activity.last_activity_at,
    },
    integration_health: buildIntegrationHealth(checks),
    docs: {
      routing: 'POST /api/route',
      telemetry: 'POST /api/report/model',
      contributions: 'POST /api/contributions',
    },
  })
}
