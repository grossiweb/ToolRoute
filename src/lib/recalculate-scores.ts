// Scoring helpers extracted from src/app/api/cron/recalculate-scores/route.ts
// so they can be unit-tested and so the SQL function in migration 046 has a
// single TS reference to mirror. Any change to the math here must be paired
// with an equivalent change to migration 046's recalculate_all().

import { calcValueScore } from '@/lib/scoring'
import { weightedAverageQuality } from '@/lib/trust-score'

// Single source of truth for the score_version string written to
// skill_scores. Migration 046's recalculate_all() writes the same value, so
// rows updated by either path are tagged identically.
export const SCORE_VERSION = '2.0-ts-parity'

export interface OutcomeRow {
  id: string
  skill_id: string
  benchmark_profile_id: string | null
  outcome_status: string
  latency_ms: number | null
  estimated_cost_usd: number | null
  retries: number
  output_quality_rating: number | null
  structured_output_valid: boolean | null
  human_correction_required: boolean
  human_correction_minutes: number | null
  fallback_used_skill_id: string | null
  agent_identity_id: string | null
  reporter_trust_score: number | null
}

export interface SkillScoreRow {
  skill_id: string
  output_score: number | null
  reliability_score: number | null
  efficiency_score: number | null
  cost_score: number | null
  trust_score: number | null
  value_score: number | null
}

export interface ComputedScores {
  outputScore: number
  reliabilityScore: number
  efficiencyScore: number
  costScore: number
  trustScore: number
  valueScore: number
}

export function computeScoresFromOutcomes(rows: OutcomeRow[]): ComputedScores {
  const n = rows.length

  // --- Output Score ---
  const outcomeValues: Record<string, number> = {
    success: 1.0,
    partial_success: 0.6,
    failure: 0.1,
    aborted: 0.0,
  }
  const avgCompletion = rows.reduce((s, r) => s + (outcomeValues[r.outcome_status] ?? 0.5), 0) / n

  const twq = weightedAverageQuality(rows.map(r => ({
    output_quality_rating: r.output_quality_rating,
    trust_score: r.reporter_trust_score,
  })))
  const qualityRatings = rows.filter(r => r.output_quality_rating != null).map(r => Number(r.output_quality_rating))
  const avgQuality = twq != null
    ? twq / 10
    : qualityRatings.length > 0
      ? qualityRatings.reduce((s, v) => s + v, 0) / qualityRatings.length / 10
      : 0.5
  const structuredValid = rows.filter(r => r.structured_output_valid === true).length / n
  const avgCorrectionMin = rows.reduce((s, r) => s + (Number(r.human_correction_minutes) || 0), 0) / n
  const correctionBurden = Math.min(avgCorrectionMin / 60, 1)

  const outputScore = (
    0.35 * avgCompletion +
    0.25 * avgQuality +
    0.20 * structuredValid +
    0.20 * (1 - correctionBurden)
  ) * 10

  // --- Reliability Score ---
  const successRate = rows.filter(r => r.outcome_status === 'success' || r.outcome_status === 'partial_success').length / n
  const avgRetries = rows.reduce((s, r) => s + (r.retries || 0), 0) / n
  const retryRate = Math.min(avgRetries / 5, 1)

  const latencies = rows.filter(r => r.latency_ms != null).map(r => r.latency_ms!)
  let latencyStability = 0.7
  if (latencies.length >= 2) {
    const meanLat = latencies.reduce((s, v) => s + v, 0) / latencies.length
    if (meanLat > 0) {
      const variance = latencies.reduce((s, v) => s + (v - meanLat) ** 2, 0) / latencies.length
      const cv = Math.sqrt(variance) / meanLat
      latencyStability = Math.max(1 - cv, 0)
    }
  }

  const hardFailures = rows.filter(r => r.outcome_status === 'failure' || r.outcome_status === 'aborted').length
  const failureVolatility = hardFailures / n

  const reliabilityScore = (
    0.50 * successRate +
    0.20 * (1 - retryRate) +
    0.15 * latencyStability +
    0.15 * (1 - failureVolatility)
  ) * 10

  // --- Efficiency Score ---
  let efficiencyScore = 5.0
  if (latencies.length > 0) {
    const sorted = [...latencies].sort((a, b) => a - b)
    const p50 = sorted[Math.floor(sorted.length * 0.5)]
    if (p50 <= 1000) efficiencyScore = 9.0 + (1 - p50 / 1000)
    else if (p50 <= 5000) efficiencyScore = 7.0 + 2.0 * (1 - (p50 - 1000) / 4000)
    else if (p50 <= 30000) efficiencyScore = 4.0 + 3.0 * (1 - (p50 - 5000) / 25000)
    else efficiencyScore = Math.max(1.0, 4.0 * (1 - (p50 - 30000) / 60000))
  }

  // --- Cost Score ---
  const costs = rows.filter(r => r.estimated_cost_usd != null).map(r => Number(r.estimated_cost_usd))
  let costScore = 7.0
  if (costs.length > 0) {
    const avgCost = costs.reduce((s, v) => s + v, 0) / costs.length
    if (avgCost <= 0) costScore = 10.0
    else if (avgCost <= 0.01) costScore = 9.0 + (1 - avgCost / 0.01)
    else if (avgCost <= 0.10) costScore = 7.0 + 2.0 * (1 - (avgCost - 0.01) / 0.09)
    else if (avgCost <= 1.0) costScore = 4.0 + 3.0 * (1 - (avgCost - 0.10) / 0.90)
    else costScore = Math.max(1.0, 4.0 * (1 - (avgCost - 1.0) / 10.0))
  }

  // --- Trust Score ---
  const humanCorrectionRate = rows.filter(r => r.human_correction_required).length / n
  const hasFallbacks = rows.filter(r => r.fallback_used_skill_id != null).length / n
  const trustScore = Math.max(
    (1 - humanCorrectionRate * 0.5 - hasFallbacks * 0.3) * 10,
    1.0
  )

  // --- Value Score ---
  const valueScore = calcValueScore({
    outputScore,
    reliabilityScore,
    efficiencyScore,
    costScore,
    trustScore,
  })

  return {
    outputScore: clamp(outputScore, 0, 10),
    reliabilityScore: clamp(reliabilityScore, 0, 10),
    efficiencyScore: clamp(efficiencyScore, 0, 10),
    costScore: clamp(costScore, 0, 10),
    trustScore: clamp(trustScore, 0, 10),
    valueScore: clamp(valueScore, 0, 10),
  }
}

export function blendScores(
  computed: ComputedScores,
  existing: SkillScoreRow | undefined,
): ComputedScores {
  if (!existing) return computed

  const blend = (newVal: number, oldVal: number | null): number => {
    if (oldVal == null) return newVal
    return 0.6 * newVal + 0.4 * Number(oldVal)
  }

  const blended: ComputedScores = {
    outputScore: blend(computed.outputScore, existing.output_score),
    reliabilityScore: blend(computed.reliabilityScore, existing.reliability_score),
    efficiencyScore: blend(computed.efficiencyScore, existing.efficiency_score),
    costScore: blend(computed.costScore, existing.cost_score),
    trustScore: blend(computed.trustScore, existing.trust_score),
    valueScore: 0,
  }

  blended.valueScore = calcValueScore({
    outputScore: blended.outputScore,
    reliabilityScore: blended.reliabilityScore,
    efficiencyScore: blended.efficiencyScore,
    costScore: blended.costScore,
    trustScore: blended.trustScore,
  })

  return blended
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export function round4(value: number): number {
  return Math.round(value * 10000) / 10000
}
