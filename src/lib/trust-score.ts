/**
 * Agent Trust Score — continuous bidirectional trust (0–100)
 *
 * Baseline agent (trust_score = 50) → reporter weight 1.0
 * Shadow mode (trust_score < 25)     → reporter weight 0.0 (excluded from routing aggregates)
 * Max agent (trust_score = 100)      → reporter weight 2.0
 *
 * Trust_tier is derived automatically by DB trigger — never set directly here.
 */

// ── Constants ─────────────────────────────────────────────────────────────────

export const SHADOW_THRESHOLD = 25.0
export const TRUST_SCORE_BASELINE = 50.0  // weight = trust_score / TRUST_SCORE_BASELINE

export const TRUST_DELTAS = {
  // Positive signals
  VERIFIED_REPORT_ACCEPTED:   +2.0,  // report linked to a decision_id
  UNVERIFIED_REPORT_ACCEPTED: +0.5,  // report without decision_id
  VERIFIED_HIGH_QUALITY:      +1.0,  // quality >= 8.5 AND linked to decision_id
  COMPARATIVE_EVAL_ACCEPTED:  +3.0,  // contribution type comparative_eval
  CHALLENGE_GOLD:             +5.0,
  CHALLENGE_SILVER:           +3.0,
  CHALLENGE_BRONZE:           +1.5,

  // Negative signals
  GAMING_CONSTANT_QUALITY:  -5.0,  // all quality ratings identical across 10+ records
  GAMING_IDENTICAL_LATENCY: -5.0,  // latency CV < 1% across 10+ records
  GAMING_ALWAYS_SUCCESS:    -5.0,  // 100% success across 20+ records
  QUALITY_INFLATION:        -8.0,  // self_reported >> verified (delta >= 2.0)
} as const

// ── Reporter weight ───────────────────────────────────────────────────────────

/**
 * Convert a trust_score into a reporter weight for quality averaging.
 * - null (anonymous) → 1.0 (neutral weight)
 * - < SHADOW_THRESHOLD → 0.0 (excluded)
 * - otherwise → trust_score / 50 (baseline = 1.0, max = 2.0)
 */
export function reporterWeight(trustScore: number | null | undefined): number {
  if (trustScore == null) return 1.0
  if (trustScore < SHADOW_THRESHOLD) return 0.0
  return trustScore / TRUST_SCORE_BASELINE
}

export function isShadowMode(trustScore: number | null | undefined): boolean {
  if (trustScore == null) return false
  return trustScore < SHADOW_THRESHOLD
}

// ── Trust delta on accepted report ───────────────────────────────────────────

export function reportAcceptedDelta({
  hasDecisionId,
  qualityRating,
}: {
  hasDecisionId: boolean
  qualityRating?: number | null
}): { delta: number; reasons: string[] } {
  const reasons: string[] = []
  let delta = 0

  if (hasDecisionId) {
    delta += TRUST_DELTAS.VERIFIED_REPORT_ACCEPTED
    reasons.push('verified_report_accepted')

    if (qualityRating != null && qualityRating >= 8.5) {
      delta += TRUST_DELTAS.VERIFIED_HIGH_QUALITY
      reasons.push('verified_high_quality')
    }
  } else {
    delta += TRUST_DELTAS.UNVERIFIED_REPORT_ACCEPTED
    reasons.push('unverified_report_accepted')
  }

  return { delta, reasons }
}

// ── Gaming pattern detection ──────────────────────────────────────────────────

interface RecentReport {
  outcome_status: string
  output_quality_rating?: number | null
  latency_ms?: number | null
}

export function detectGamingPatterns({
  outcomeStatus,
  qualityRating,
  latencyMs,
  hallucination,
  recentReports,
}: {
  outcomeStatus: string
  qualityRating?: number | null
  latencyMs?: number | null
  hallucination?: boolean | null
  recentReports: RecentReport[]
}): { flags: string[]; totalDelta: number; reasons: string[] } {
  const flags: string[] = []
  const reasons: string[] = []
  let totalDelta = 0

  // Include the current report in the analysis window
  const window = [
    { outcome_status: outcomeStatus, output_quality_rating: qualityRating, latency_ms: latencyMs },
    ...recentReports,
  ]

  // ── GAMING_CONSTANT_QUALITY: all ratings identical across 10+ reports ────────
  if (window.length >= 10) {
    const ratings = window
      .map(r => r.output_quality_rating)
      .filter((v): v is number => v != null)

    if (ratings.length >= 10) {
      const first = ratings[0]
      const allIdentical = ratings.every(v => v === first)
      if (allIdentical) {
        flags.push('constant_quality')
        totalDelta += TRUST_DELTAS.GAMING_CONSTANT_QUALITY
        reasons.push('gaming:constant_quality_rating')
      }
    }
  }

  // ── GAMING_IDENTICAL_LATENCY: CV < 1% across 10+ reports ────────────────────
  if (window.length >= 10) {
    const latencies = window
      .map(r => r.latency_ms)
      .filter((v): v is number => v != null && v > 0)

    if (latencies.length >= 10) {
      const mean = latencies.reduce((s, v) => s + v, 0) / latencies.length
      if (mean > 0) {
        const variance = latencies.reduce((s, v) => s + (v - mean) ** 2, 0) / latencies.length
        const cv = Math.sqrt(variance) / mean
        if (cv < 0.01) {
          flags.push('identical_latency')
          totalDelta += TRUST_DELTAS.GAMING_IDENTICAL_LATENCY
          reasons.push('gaming:identical_latency_pattern')
        }
      }
    }
  }

  // ── GAMING_ALWAYS_SUCCESS: 100% success across 20+ reports ──────────────────
  if (window.length >= 20) {
    const allSuccess = window.every(r => r.outcome_status === 'success')
    if (allSuccess) {
      flags.push('always_success')
      totalDelta += TRUST_DELTAS.GAMING_ALWAYS_SUCCESS
      reasons.push('gaming:always_success_pattern')
    }
  }

  return { flags, totalDelta, reasons }
}

// ── Trust-weighted quality average ───────────────────────────────────────────

interface QualityRecord {
  output_quality_rating?: number | null
  trust_score?: number | null
}

/**
 * Compute Σ(quality × weight) / Σ(weight) where weight = reporterWeight(trust_score).
 * Shadow reporters (weight 0) are excluded. Anonymous reporters (null) get weight 1.0.
 * Returns null if no qualifying records with quality ratings.
 */
export function weightedAverageQuality(records: QualityRecord[]): number | null {
  let weightedSum = 0
  let totalWeight = 0

  for (const r of records) {
    if (r.output_quality_rating == null) continue
    const w = reporterWeight(r.trust_score)
    if (w === 0) continue
    weightedSum += r.output_quality_rating * w
    totalWeight += w
  }

  if (totalWeight === 0) return null
  return weightedSum / totalWeight
}
