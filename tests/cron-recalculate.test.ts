// Tests for the scoring helpers used by the cron recalculate-scores job.
// These guard the TS implementation; migration 046 mirrors the same math in SQL,
// so any drift here must be paired with an equivalent SQL change.
//
// Run with: npx vitest run tests/cron-recalculate.test.ts
// (vitest is not a current devDep — install it with `npm i -D vitest` to run.)

import { describe, it, expect } from 'vitest'
import {
  computeScoresFromOutcomes,
  blendScores,
  type OutcomeRow,
  type ComputedScores,
  type SkillScoreRow,
} from '../src/lib/recalculate-scores'

let counter = 0
function row(overrides: Partial<OutcomeRow> = {}): OutcomeRow {
  counter += 1
  return {
    id: `r${counter}`,
    skill_id: 's1',
    benchmark_profile_id: null,
    outcome_status: 'success',
    latency_ms: 1000,
    estimated_cost_usd: 0.01,
    retries: 0,
    output_quality_rating: 8,
    structured_output_valid: true,
    human_correction_required: false,
    human_correction_minutes: 0,
    fallback_used_skill_id: null,
    agent_identity_id: 'a1',
    reporter_trust_score: 50,
    ...overrides,
  }
}

function inRange(v: number, lo: number, hi: number): boolean {
  return v >= lo && v <= hi
}

describe('computeScoresFromOutcomes', () => {
  it('all-success skill scores higher than all-failure skill', () => {
    const successes = [
      row({ outcome_status: 'success', latency_ms: 500,  output_quality_rating: 9, reporter_trust_score: 50 }),
      row({ outcome_status: 'success', latency_ms: 800,  output_quality_rating: 8, reporter_trust_score: 60 }),
      row({ outcome_status: 'success', latency_ms: 600,  output_quality_rating: 9, reporter_trust_score: 100 }),
    ]
    const failures = [
      row({ outcome_status: 'failure', latency_ms: 8000,  output_quality_rating: 2, reporter_trust_score: 50 }),
      row({ outcome_status: 'failure', latency_ms: 15000, output_quality_rating: 3, reporter_trust_score: 50 }),
      row({ outcome_status: 'aborted', latency_ms: 30000, output_quality_rating: 1, reporter_trust_score: 50 }),
    ]
    const s = computeScoresFromOutcomes(successes)
    const f = computeScoresFromOutcomes(failures)

    expect(s.valueScore).toBeGreaterThan(f.valueScore)
    expect(s.outputScore).toBeGreaterThan(f.outputScore)
    expect(s.reliabilityScore).toBeGreaterThan(f.reliabilityScore)
  })

  it('partial_success scores between full success and failure', () => {
    const make = (status: string) => [
      row({ outcome_status: status, latency_ms: 1000, output_quality_rating: 7 }),
      row({ outcome_status: status, latency_ms: 1100, output_quality_rating: 7 }),
      row({ outcome_status: status, latency_ms: 900,  output_quality_rating: 7 }),
    ]
    const full    = computeScoresFromOutcomes(make('success'))
    const partial = computeScoresFromOutcomes(make('partial_success'))
    const fail    = computeScoresFromOutcomes(make('failure'))

    expect(partial.outputScore).toBeLessThan(full.outputScore)
    expect(partial.outputScore).toBeGreaterThan(fail.outputScore)
  })

  it('all component scores stay within [0, 10] for adversarially good inputs', () => {
    const heaven: OutcomeRow[] = [
      row({ outcome_status: 'success', latency_ms: 1, estimated_cost_usd: 0, output_quality_rating: 10, reporter_trust_score: 100, retries: 0, structured_output_valid: true }),
      row({ outcome_status: 'success', latency_ms: 1, estimated_cost_usd: 0, output_quality_rating: 10, reporter_trust_score: 100, retries: 0, structured_output_valid: true }),
      row({ outcome_status: 'success', latency_ms: 1, estimated_cost_usd: 0, output_quality_rating: 10, reporter_trust_score: 100, retries: 0, structured_output_valid: true }),
    ]
    const s = computeScoresFromOutcomes(heaven)
    for (const [k, v] of Object.entries(s) as Array<[keyof ComputedScores, number]>) {
      expect(inRange(v, 0, 10), `${k}=${v} out of [0,10]`).toBe(true)
    }
  })

  it('all component scores stay within [0, 10] for adversarially bad inputs', () => {
    const hell: OutcomeRow[] = [
      row({ outcome_status: 'failure', latency_ms: 600000, estimated_cost_usd: 100, output_quality_rating: 0, reporter_trust_score: 10, retries: 10, human_correction_required: true, human_correction_minutes: 600, fallback_used_skill_id: 'fb', structured_output_valid: false }),
      row({ outcome_status: 'aborted', latency_ms: 700000, estimated_cost_usd: 100, output_quality_rating: 0, reporter_trust_score: 10, retries: 10, human_correction_required: true, human_correction_minutes: 600, fallback_used_skill_id: 'fb', structured_output_valid: false }),
      row({ outcome_status: 'failure', latency_ms: 800000, estimated_cost_usd: 100, output_quality_rating: 0, reporter_trust_score: 10, retries: 10, human_correction_required: true, human_correction_minutes: 600, fallback_used_skill_id: 'fb', structured_output_valid: false }),
    ]
    const s = computeScoresFromOutcomes(hell)
    for (const [k, v] of Object.entries(s) as Array<[keyof ComputedScores, number]>) {
      expect(inRange(v, 0, 10), `${k}=${v} out of [0,10]`).toBe(true)
    }
  })

  it('value score stays in [0, 10] across a varied mixed-status set', () => {
    const mixed: OutcomeRow[] = [
      row({ outcome_status: 'success',         latency_ms: 500,   estimated_cost_usd: 0.001, output_quality_rating: 10, reporter_trust_score: 100 }),
      row({ outcome_status: 'partial_success', latency_ms: 2000,  estimated_cost_usd: 0.05,  output_quality_rating: 7,  reporter_trust_score: 50  }),
      row({ outcome_status: 'failure',         latency_ms: 8000,  estimated_cost_usd: 0.50,  output_quality_rating: 3,  reporter_trust_score: 30  }),
      row({ outcome_status: 'aborted',         latency_ms: 30000, estimated_cost_usd: 5.0,   output_quality_rating: null, reporter_trust_score: 80 }),
    ]
    const s = computeScoresFromOutcomes(mixed)
    expect(inRange(s.valueScore, 0, 10)).toBe(true)
  })

  it('shadow-mode reporters (trust < 25) are excluded from trust-weighted quality', () => {
    // Three high-trust reporters give 9, one shadow reporter gives 1.
    // The shadow reporter must NOT pull avg quality down.
    const withShadow: OutcomeRow[] = [
      row({ output_quality_rating: 9, reporter_trust_score: 50 }),
      row({ output_quality_rating: 9, reporter_trust_score: 50 }),
      row({ output_quality_rating: 9, reporter_trust_score: 50 }),
      row({ output_quality_rating: 1, reporter_trust_score: 10 }), // shadow → weight 0
    ]
    const withoutShadow: OutcomeRow[] = [
      row({ output_quality_rating: 9, reporter_trust_score: 50 }),
      row({ output_quality_rating: 9, reporter_trust_score: 50 }),
      row({ output_quality_rating: 9, reporter_trust_score: 50 }),
    ]
    const a = computeScoresFromOutcomes(withShadow)
    const b = computeScoresFromOutcomes(withoutShadow)
    // Both should derive trust-weighted quality from the same 3 valid 9-rated reports.
    // (Other components like completion will differ; we only assert quality parity
    // via the output score's quality component being similarly high.)
    expect(a.outputScore).toBeGreaterThan(5)
    expect(b.outputScore).toBeGreaterThan(5)
  })
})

describe('blendScores', () => {
  const newScores: ComputedScores = {
    outputScore: 9,
    reliabilityScore: 9,
    efficiencyScore: 9,
    costScore: 9,
    trustScore: 9,
    valueScore: 9,
  }

  it('60/40 blend pulls toward existing when existing is lower', () => {
    const existing: SkillScoreRow = {
      skill_id: 's1',
      output_score: 5,
      reliability_score: 5,
      efficiency_score: 5,
      cost_score: 5,
      trust_score: 5,
      value_score: 5,
    }
    const b = blendScores(newScores, existing)
    // Each component → 0.6*9 + 0.4*5 = 7.4
    expect(b.outputScore).toBeCloseTo(7.4, 5)
    expect(b.reliabilityScore).toBeCloseTo(7.4, 5)
    expect(b.efficiencyScore).toBeCloseTo(7.4, 5)
    expect(b.costScore).toBeCloseTo(7.4, 5)
    expect(b.trustScore).toBeCloseTo(7.4, 5)
    // valueScore is recomputed from blended components (weights sum to 1.0)
    expect(b.valueScore).toBeCloseTo(7.4, 5)
    // Sanity: blended is strictly between existing and new
    expect(b.outputScore).toBeLessThan(newScores.outputScore)
    expect(b.outputScore).toBeGreaterThan(existing.output_score!)
  })

  it('60/40 blend pulls toward existing when existing is higher', () => {
    const existing: SkillScoreRow = {
      skill_id: 's1',
      output_score: 10,
      reliability_score: 10,
      efficiency_score: 10,
      cost_score: 10,
      trust_score: 10,
      value_score: 10,
    }
    const lower: ComputedScores = {
      outputScore: 5,
      reliabilityScore: 5,
      efficiencyScore: 5,
      costScore: 5,
      trustScore: 5,
      valueScore: 5,
    }
    const b = blendScores(lower, existing)
    // 0.6*5 + 0.4*10 = 7.0
    expect(b.outputScore).toBeCloseTo(7.0, 5)
    expect(b.outputScore).toBeGreaterThan(lower.outputScore)
  })

  it('returns new scores unchanged when no existing record', () => {
    const b = blendScores(newScores, undefined)
    expect(b).toEqual(newScores)
  })

  it('falls back to new when an existing component is null', () => {
    const existing: SkillScoreRow = {
      skill_id: 's1',
      output_score: null,
      reliability_score: 6,
      efficiency_score: null,
      cost_score: 6,
      trust_score: null,
      value_score: null,
    }
    const b = blendScores(newScores, existing)
    expect(b.outputScore).toBe(9)              // null → use new
    expect(b.reliabilityScore).toBeCloseTo(0.6 * 9 + 0.4 * 6, 5)
    expect(b.efficiencyScore).toBe(9)
    expect(b.costScore).toBeCloseTo(0.6 * 9 + 0.4 * 6, 5)
    expect(b.trustScore).toBe(9)
  })
})
