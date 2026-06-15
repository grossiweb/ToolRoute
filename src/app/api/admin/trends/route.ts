import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { resolveTierToModel, type ClassifierTier } from '@/lib/routing/tiers'

// Token assumption for the cost estimate — flagged as estimated in the UI.
// Token counts are NOT recorded per decision, so we use a conservative baseline.
const EST_INPUT_TOKENS = 300
const EST_OUTPUT_TOKENS = 200
const BASELINE_TIER: ClassifierTier = 'best_available' // primary = claude-opus-4-7

function costPerCall(inPrice: number, outPrice: number): number {
  return (EST_INPUT_TOKENS * inPrice + EST_OUTPUT_TOKENS * outPrice) / 1_000_000
}

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

  const [decisions, quality, semantic, tierCost] = await Promise.all([
    supabase.rpc('admin_daily_routing_decisions', { p_days: days }),
    supabase.rpc('admin_daily_verified_quality', { p_days: days }),
    supabase.rpc('admin_daily_semantic_rate', { p_days: days }),
    supabase.rpc('admin_tier_cost_summary', { p_days: days }),
  ])

  const queryErrors: Record<string, string> = {}
  if (decisions.error) queryErrors.routing_decisions_daily = decisions.error.message
  if (quality.error) queryErrors.verified_quality_daily = quality.error.message
  if (semantic.error) queryErrors.semantic_rate_daily = semantic.error.message
  if (tierCost.error) queryErrors.cost_summary = tierCost.error.message

  // ── Cost-savings estimate. resolved_tier counts (≈100% coverage) -> per-tier
  // primary model (TIER_MAP standard, the production routing source of truth) ->
  // models price -> estimated $/call vs routing everything to the baseline tier.
  const tierRows = (tierCost.data || []) as Array<{ tier: string; decisions: number }>
  const round = (n: number, dp = 4) => Math.round(n * 10 ** dp) / 10 ** dp
  let cost_summary: any = null
  if (tierRows.length) {
    // Resolve each present tier's primary model slug, plus the baseline's.
    const slugFor = (t: string) => { try { return resolveTierToModel(t as ClassifierTier, 'standard').primary } catch { return null } }
    const baselineSlug = slugFor(BASELINE_TIER)
    const wantSlugs = Array.from(new Set([...tierRows.map(r => slugFor(r.tier)), baselineSlug].filter(Boolean))) as string[]
    const { data: priceRows } = await supabase.from('models').select('id, input_price_per_m, output_price_per_m').in('id', wantSlugs)
    const price = new Map((priceRows || []).map((m: any) => [m.id, { i: Number(m.input_price_per_m), o: Number(m.output_price_per_m) }]))

    const total = tierRows.reduce((s, r) => s + Number(r.decisions), 0)
    const bp = baselineSlug ? price.get(baselineSlug) : undefined
    const baselineCost = bp ? costPerCall(bp.i, bp.o) : 0

    const by_tier = tierRows.map(r => {
      const slug = slugFor(r.tier)
      const p = slug ? price.get(slug) : undefined
      const cpc = p ? costPerCall(p.i, p.o) : null
      return {
        tier: r.tier, decisions: Number(r.decisions),
        share_pct: total ? round(Number(r.decisions) / total * 100, 1) : 0,
        model_slug: slug, input_price_per_m: p?.i ?? null, output_price_per_m: p?.o ?? null,
        cost_per_call: cpc == null ? null : round(cpc, 6),
      }
    })
    const estActual = by_tier.reduce((s, t) => s + (t.cost_per_call ?? baselineCost) * t.decisions, 0)
    const estBaseline = total * baselineCost
    const belowBest = tierRows.filter(r => r.tier !== BASELINE_TIER).reduce((s, r) => s + Number(r.decisions), 0)
    cost_summary = {
      token_assumption: { input: EST_INPUT_TOKENS, output: EST_OUTPUT_TOKENS },
      baseline: { tier: BASELINE_TIER, model_slug: baselineSlug, cost_per_call: round(baselineCost, 6) },
      total_decisions: total,
      pct_below_best_available: total ? round(belowBest / total * 100, 1) : 0,
      est_actual_cost_usd: round(estActual, 2),
      est_baseline_cost_usd: round(estBaseline, 2),
      est_savings_usd: round(estBaseline - estActual, 2),
      est_savings_pct: estBaseline ? round((estBaseline - estActual) / estBaseline * 100, 1) : 0,
      by_tier,
    }
  }

  return NextResponse.json({
    generated_at: new Date().toISOString(),
    window_days: days,
    routing_decisions_daily: (decisions.data || []).map((r: any) => ({ date: r.day, count: Number(r.count) })),
    verified_quality_daily: (quality.data || []).map((r: any) => ({ date: r.day, avg: r.avg == null ? null : Number(r.avg), n: Number(r.n) })),
    semantic_rate_daily: (semantic.data || []).map((r: any) => ({
      date: r.day, semantic: Number(r.semantic), total: Number(r.total), pct: r.pct == null ? null : Number(r.pct),
    })),
    cost_summary,
    ...(Object.keys(queryErrors).length ? { query_errors: queryErrors } : {}),
  })
}
