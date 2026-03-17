/**
 * ToolRoute scoring utilities
 * All formulas as defined in the Master Engineering Handoff v3.0
 */

export function calcValueScore({
  outputScore,
  reliabilityScore,
  efficiencyScore,
  costScore,
  trustScore,
}: {
  outputScore: number
  reliabilityScore: number
  efficiencyScore: number
  costScore: number
  trustScore: number
}): number {
  return (
    0.35 * outputScore +
    0.25 * reliabilityScore +
    0.15 * efficiencyScore +
    0.15 * costScore +
    0.10 * trustScore
  )
}

export function calcOutputScoreUniversal({
  taskCompletion,
  outputQualityRating,
  structuredOutputValid,
  humanCorrectionMinutes,
  maxCorrectionMinutes = 60,
}: {
  taskCompletion: number
  outputQualityRating: number
  structuredOutputValid: boolean
  humanCorrectionMinutes: number
  maxCorrectionMinutes?: number
}): number {
  const correctionBurden = Math.min(humanCorrectionMinutes / maxCorrectionMinutes, 1)
  return (
    0.35 * taskCompletion +
    0.25 * outputQualityRating +
    0.20 * (structuredOutputValid ? 1 : 0) +
    0.20 * (1 - correctionBurden)
  )
}

export function calcReliabilityScore({
  successRate,
  retryRate,
  latencyStability,
  failureVolatility,
}: {
  successRate: number
  retryRate: number
  latencyStability: number
  failureVolatility: number
}): number {
  return (
    0.50 * successRate +
    0.20 * (1 - retryRate) +
    0.15 * latencyStability +
    0.15 * (1 - failureVolatility)
  )
}

export function calcContributionScore({
  validity,
  usefulness,
  novelty,
  consistency,
  antiGaming,
}: {
  validity: number
  usefulness: number
  novelty: number
  consistency: number
  antiGaming: number
}): number {
  return (
    0.30 * validity +
    0.25 * usefulness +
    0.20 * novelty +
    0.15 * consistency +
    0.10 * antiGaming
  )
}

export function calcRoutingCredits(
  baseReward: number,
  contributionScore: number,
  typeMultiplier: number
): number {
  return Math.round(baseReward * contributionScore * typeMultiplier)
}

export const CONTRIBUTION_MULTIPLIERS = {
  run_telemetry: 1.0,
  fallback_chain: 1.5,
  comparative_eval: 2.5,
  benchmark_package: 4.0,
} as const

export const TRUST_TIER_MODIFIERS = {
  unverified: 0.8,
  baseline: 1.0,
  trusted: 1.15,
  production: 1.30,
  enterprise: 1.50,
} as const

/** Score color for badges/rings (text + bg + border) */
export function getScoreColor(score: number): string {
  if (score >= 9.0) return 'text-emerald-700 bg-emerald-50 border-emerald-300'
  if (score >= 8.0) return 'text-teal-700 bg-teal-50 border-teal-300'
  if (score >= 7.0) return 'text-brand bg-brand-light border-brand/30'
  if (score >= 6.0) return 'text-amber-700 bg-amber-50 border-amber-300'
  return 'text-red-700 bg-red-50 border-red-300'
}

/** Score text color only — for table cells */
export function getScoreTextColor(score: number): string {
  if (score >= 9) return 'text-emerald-500'
  if (score >= 8) return 'text-teal-500'
  if (score >= 7) return 'text-yellow-500'
  if (score >= 6) return 'text-orange-500'
  return 'text-red-500'
}

/** Score badge bg + text — for pill badges */
export function getScoreBadgeColor(score: number): string {
  if (score >= 9) return 'bg-emerald-50 text-emerald-700'
  if (score >= 8) return 'bg-teal-50 text-teal-700'
  if (score >= 7) return 'bg-yellow-50 text-yellow-700'
  if (score >= 6) return 'bg-orange-50 text-orange-700'
  return 'bg-red-50 text-red-700'
}

/** Normalize score: auto-convert 0-100 to 0-10 */
export function normalizeScore(score: number | null | undefined): number | null {
  if (score == null) return null
  return score > 10 ? score / 10 : score
}

export function getGradeLabel(
  valueScore: number,
  outputScore: number,
  costScore: number
): string {
  if (outputScore >= 9.0) return 'Best Quality'
  if (valueScore >= 8.5 && costScore >= 8.0) return 'Best Value'
  if (valueScore >= 8.5) return 'Most Reliable'
  if (costScore >= 9.0) return 'Best Budget Option'
  if (valueScore >= 7.5) return 'Premium Worth Paying For'
  if (valueScore < 5.0) return 'Not Recommended'
  return 'Solid Choice'
}

export function formatScore(score: number | null | undefined): string {
  if (score == null) return '—'
  return score.toFixed(1)
}
