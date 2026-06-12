import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// GET /api/admin/trends — daily trend series for the admin dashboard.
// Same bearer auth as /api/admin/stats. Kept separate so the heavier daily
// aggregation queries lazy-load and don't slow the main stats fetch.
//
// (a) routing_decisions_daily — count of model_routing_decisions per day
// (b) verified_quality_daily  — avg(verified_quality) per day (model_outcome_records)
// (c) semantic_rate_daily     — % of skill routes resolved by the semantic matcher
//
// All three are server-side date_trunc GROUP BY via RPC (migration 071).
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const adminSecret = process.env.ADMIN_SECRET || process.env.CRON_SECRET
  if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const days = Math.min(90, Math.max(7, parseInt(url.searchParams.get('days') || '30', 10) || 30))

  const supabase = createServerSupabaseClient()

  const [decisions, quality, semantic] = await Promise.all([
    supabase.rpc('admin_daily_routing_decisions', { p_days: days }),
    supabase.rpc('admin_daily_verified_quality', { p_days: days }),
    supabase.rpc('admin_daily_semantic_rate', { p_days: days }),
  ])

  const queryErrors: Record<string, string> = {}
  if (decisions.error) queryErrors.routing_decisions_daily = decisions.error.message
  if (quality.error) queryErrors.verified_quality_daily = quality.error.message
  if (semantic.error) queryErrors.semantic_rate_daily = semantic.error.message

  return NextResponse.json({
    generated_at: new Date().toISOString(),
    window_days: days,
    routing_decisions_daily: (decisions.data || []).map((r: any) => ({ date: r.day, count: Number(r.count) })),
    verified_quality_daily: (quality.data || []).map((r: any) => ({ date: r.day, avg: r.avg == null ? null : Number(r.avg), n: Number(r.n) })),
    semantic_rate_daily: (semantic.data || []).map((r: any) => ({
      date: r.day, semantic: Number(r.semantic), total: Number(r.total), pct: r.pct == null ? null : Number(r.pct),
    })),
    ...(Object.keys(queryErrors).length ? { query_errors: queryErrors } : {}),
  })
}
