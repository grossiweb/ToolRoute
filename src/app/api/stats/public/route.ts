import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const revalidate = 300

export async function GET() {
  const supabase = createServerSupabaseClient()

  const [skillsRes, agentsRes, modelDecRes, skillDecRes, modelOutRes, skillOutRes, tiersRes] = await Promise.all([
    supabase.from('skills').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('agent_identities').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('model_routing_decisions').select('*', { count: 'exact', head: true }),
    supabase.from('skill_routing_decisions').select('*', { count: 'exact', head: true }),
    supabase.from('model_outcome_records').select('outcome_status'),
    supabase.from('outcome_records').select('outcome_status'),
    supabase
      .from('model_routing_decisions')
      .select('resolved_tier')
      .not('resolved_tier', 'is', null)
      .range(0, 4999),
  ])

  const outcomes = [...(modelOutRes.data || []), ...(skillOutRes.data || [])]
  const successes = outcomes.filter((o: any) => o.outcome_status === 'success').length
  const successRate = outcomes.length > 0 ? Math.round((successes / outcomes.length) * 100) : 0

  const tierCounts: Record<string, number> = {}
  for (const r of tiersRes.data || []) {
    const t = (r as any).resolved_tier
    if (t) tierCounts[t] = (tierCounts[t] || 0) + 1
  }
  const topTier = Object.entries(tierCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || null

  return NextResponse.json(
    {
      total_skills: skillsRes.count || 0,
      total_agents: agentsRes.count || 0,
      total_routing_decisions: (modelDecRes.count || 0) + (skillDecRes.count || 0),
      success_rate_pct: successRate,
      top_tier: topTier,
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    }
  )
}
