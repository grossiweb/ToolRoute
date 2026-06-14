/**
 * crs.ts — Composite Routing Score math.
 *
 * Tier scoring is lifted verbatim from autoresearch/benchmark.ts (the frozen
 * offline harness): symmetric tier-ladder partial credit, no cost term, so
 * over-routing and under-routing are penalized equally.
 *
 *   tier CRS = W_EXACT · exact_tier_match_rate + W_PARTIAL · mean(partial_credit)
 *   partial_credit = 1 if exact, else max(0, 1 - tier_distance / MAX_DIST)
 *
 * Skill scoring has no ladder — a recommended_skill is either right or wrong —
 * so skill "CRS" is just the exact-match rate (skill AND approach), per section.
 */

export type ModelTier =
  | 'cheap_chat'
  | 'cheap_structured'
  | 'fast_code'
  | 'tool_agent'
  | 'creative_writing'
  | 'reasoning_pro'
  | 'best_available'

// Capability/cost ladder — order matches TIER_OUTPUT_ESTIMATES in
// src/lib/model-routing.ts (ascending). Distance is direction-agnostic.
export const TIER_LADDER: ModelTier[] = [
  'cheap_chat',
  'cheap_structured',
  'fast_code',
  'tool_agent',
  'creative_writing',
  'reasoning_pro',
  'best_available',
]
const LADDER_INDEX: Record<string, number> = TIER_LADDER.reduce(
  (acc, t, i) => { acc[t] = i; return acc }, {} as Record<string, number>,
)
export const MAX_TIER_DISTANCE = TIER_LADDER.length - 1 // 6

export const W_EXACT = 0.80
export const W_PARTIAL = 0.20

/** Direction-agnostic ladder distance. Unknown tiers => worst case. */
export function tierDistance(a: string, b: string): number {
  const ia = LADDER_INDEX[a]
  const ib = LADDER_INDEX[b]
  if (ia === undefined || ib === undefined) return MAX_TIER_DISTANCE
  return Math.abs(ia - ib)
}

export function round(n: number, dp = 4): number {
  const f = 10 ** dp
  return Math.round(n * f) / f
}

export interface TierScored { exact: number; partial: number }
/** Per-row tier credit: { exact: 0|1, partial: 0..1 }. */
export function scoreTier(actual: string, expected: string): TierScored {
  if (actual === expected) return { exact: 1, partial: 1 }
  const d = tierDistance(actual, expected)
  return { exact: 0, partial: Math.max(0, 1 - d / MAX_TIER_DISTANCE) }
}

/** Aggregate tier CRS from per-row scores. */
export function tierCrs(scores: TierScored[]) {
  const n = scores.length || 1
  const exact_tier_match_rate = scores.reduce((s, r) => s + r.exact, 0) / n
  const mean_partial_credit = scores.reduce((s, r) => s + r.partial, 0) / n
  return {
    overall_crs: round(W_EXACT * exact_tier_match_rate + W_PARTIAL * mean_partial_credit),
    exact_tier_match_rate: round(exact_tier_match_rate),
    mean_partial_credit: round(mean_partial_credit),
  }
}

/** Normalize a skill cell: 'null'/'(none)'/'' all collapse to null. */
export function normSkill(v: string | null | undefined): string | null {
  if (v == null) return null
  const t = String(v).trim().toLowerCase()
  if (t === '' || t === 'null' || t === '(none)' || t === 'none') return null
  return t
}
