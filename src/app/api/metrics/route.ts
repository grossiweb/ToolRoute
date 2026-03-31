import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

/**
 * GET /api/metrics — Public aggregate metrics. No auth. No PII.
 * Safe to monitor externally. Used by scheduled growth agents.
 */
export async function GET() {
  const supabase = createServerSupabaseClient()
  const now = Date.now()
  const ms7d = 7 * 24 * 60 * 60 * 1000
  const ms24h = 24 * 60 * 60 * 1000

  const [agentsRes, outcomesRes, contributionsRes, rewardsRes, telemetryRes] = await Promise.all([
    supabase.from('agent_identities').select('id, created_at, trust_tier').eq('is_active', true),
    supabase.from('outcome_records').select('id, skill_id, created_at').order('created_at', { ascending: false }).limit(500),
    supabase.from('contribution_events').select('id, agent_identity_id, accepted, created_at').order('created_at', { ascending: false }).limit(500),
    supabase.from('reward_ledgers').select('routing_credits, reputation_points').limit(1000),
    supabase.from('telemetry_rate_tracking').select('total_recommendations, total_reported_runs'),
  ])

  const agents = agentsRes.data || []
  const outcomes = outcomesRes.data || []
  const contributions = contributionsRes.data || []
  const rewards = rewardsRes.data || []
  const telemetry = telemetryRes.data || []

  const newAgents7d = agents.filter((a: any) =>
    (now - new Date(a.created_at).getTime()) < ms7d
  ).length

  const routes24h = outcomes.filter((o: any) =>
    (now - new Date(o.created_at).getTime()) < ms24h
  ).length

  const routes7d = outcomes.filter((o: any) =>
    (now - new Date(o.created_at).getTime()) < ms7d
  ).length

  const activeAgents7d = new Set(
    contributions
      .filter((c: any) => c.agent_identity_id && (now - new Date(c.created_at).getTime()) < ms7d)
      .map((c: any) => c.agent_identity_id)
  ).size

  const totalRecs = telemetry.reduce((s: number, t: any) => s + (t.total_recommendations || 0), 0)
  const totalReported = telemetry.reduce((s: number, t: any) => s + (t.total_reported_runs || 0), 0)
  const telemetryRate = totalRecs > 0 ? Math.round((totalReported / totalRecs) * 100) : 0

  const totalCredits = rewards.reduce((s: number, r: any) => s + (r.routing_credits || 0), 0)

  const tierBreakdown = agents.reduce((acc: any, a: any) => {
    const t = a.trust_tier || 'unverified'
    acc[t] = (acc[t] || 0) + 1
    return acc
  }, {})

  return NextResponse.json({
    generated_at: new Date().toISOString(),
    agents: {
      total: agents.length,
      new_7d: newAgents7d,
      active_7d: activeAgents7d,
      trust_tiers: tierBreakdown,
    },
    routing: {
      total_outcomes: outcomes.length,
      routes_24h: routes24h,
      routes_7d: routes7d,
      telemetry_rate_pct: telemetryRate,
    },
    economy: {
      total_credits_issued: totalCredits,
      total_contributions: contributions.length,
      accepted_contributions: contributions.filter((c: any) => c.accepted).length,
    },
  })
}
