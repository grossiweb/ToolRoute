import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { calcValueScore } from '@/lib/scoring'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerSupabaseClient()

  try {
    // Call the recalculate_all() function
    const { data, error } = await supabase.rpc('recalculate_all')

    if (error) {
      // If the RPC function doesn't exist yet, fall back to manual recalculation
      console.error('RPC error, falling back to manual recalculation:', error.message)
      return await manualRecalculation(supabase)
    }

    // Also run mission/challenge expiry cleanup
    const expiryResult = await cleanupExpired(supabase)

    return NextResponse.json({
      message: 'Score recalculation complete',
      result: data,
      expiry_cleanup: expiryResult,
      next_run: 'In 6 hours',
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// Manual recalculation fallback
// ---------------------------------------------------------------------------

interface OutcomeRow {
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
}

interface SkillScoreRow {
  skill_id: string
  output_score: number | null
  reliability_score: number | null
  efficiency_score: number | null
  cost_score: number | null
  trust_score: number | null
  value_score: number | null
}

async function manualRecalculation(supabase: ReturnType<typeof createServerSupabaseClient>) {
  const startTime = Date.now()
  let skillsUpdated = 0
  let rollupsUpdated = 0
  const errors: string[] = []

  // Fetch all outcome records
  const { data: records, error: fetchErr } = await supabase
    .from('outcome_records')
    .select('id, skill_id, benchmark_profile_id, outcome_status, latency_ms, estimated_cost_usd, retries, output_quality_rating, structured_output_valid, human_correction_required, human_correction_minutes, fallback_used_skill_id')
    .order('created_at', { ascending: false })

  if (fetchErr || !records) {
    return NextResponse.json({
      error: 'Failed to fetch outcome records',
      detail: fetchErr?.message,
    }, { status: 500 })
  }

  // Group records by skill_id
  const bySkill = new Map<string, OutcomeRow[]>()
  for (const r of records as OutcomeRow[]) {
    const list = bySkill.get(r.skill_id) || []
    list.push(r)
    bySkill.set(r.skill_id, list)
  }

  // Fetch existing scores so we can blend 60/40
  const { data: existingScores } = await supabase
    .from('skill_scores')
    .select('skill_id, output_score, reliability_score, efficiency_score, cost_score, trust_score, value_score')

  const existingMap = new Map<string, SkillScoreRow>()
  if (existingScores) {
    for (const s of existingScores as SkillScoreRow[]) {
      existingMap.set(s.skill_id, s)
    }
  }

  // Process each skill with enough data (>= 3 records)
  for (const [skillId, rows] of Array.from(bySkill.entries())) {
    if (rows.length < 3) continue

    try {
      const computed = computeScoresFromOutcomes(rows)

      // Blend 60% new / 40% existing
      const existing = existingMap.get(skillId)
      const blended = blendScores(computed, existing)

      // Upsert skill_scores
      await supabase.from('skill_scores').upsert({
        skill_id: skillId,
        output_score: round2(blended.outputScore),
        reliability_score: round2(blended.reliabilityScore),
        efficiency_score: round2(blended.efficiencyScore),
        cost_score: round2(blended.costScore),
        trust_score: round2(blended.trustScore),
        value_score: round2(blended.valueScore),
        overall_score: round2(blended.valueScore),
        score_version: '1.0',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'skill_id' })

      skillsUpdated++

      // Update benchmark rollups per benchmark_profile
      const byBenchmark = new Map<string, OutcomeRow[]>()
      for (const r of rows) {
        if (!r.benchmark_profile_id) continue
        const list = byBenchmark.get(r.benchmark_profile_id) || []
        list.push(r)
        byBenchmark.set(r.benchmark_profile_id, list)
      }

      for (const [bpId, bpRows] of Array.from(byBenchmark.entries())) {
        if (bpRows.length < 1) continue

        const bpScores = computeScoresFromOutcomes(bpRows)
        const successCount = bpRows.filter((r: OutcomeRow) => r.outcome_status === 'success').length
        const fallbackCount = bpRows.filter((r: OutcomeRow) => r.fallback_used_skill_id != null).length
        const totalCost = bpRows.reduce((sum: number, r: OutcomeRow) => sum + (Number(r.estimated_cost_usd) || 0), 0)
        const avgHumanMinutes = bpRows.reduce((sum: number, r: OutcomeRow) => sum + (Number(r.human_correction_minutes) || 0), 0) / bpRows.length
        const costPerUseful = successCount > 0 ? totalCost / successCount : null

        await supabase.from('skill_benchmark_rollups').upsert({
          skill_id: skillId,
          benchmark_profile_id: bpId,
          sample_size: bpRows.length,
          avg_quality_score: round2(bpScores.outputScore),
          avg_reliability_score: round2(bpScores.reliabilityScore),
          avg_efficiency_score: round2(bpScores.efficiencyScore),
          avg_cost_score: round2(bpScores.costScore),
          avg_trust_score: round2(bpScores.trustScore),
          avg_value_score: round2(bpScores.valueScore),
          cost_per_useful_outcome_usd: costPerUseful != null ? round4(costPerUseful) : null,
          avg_human_correction_minutes: round2(avgHumanMinutes),
          fallback_rate: round4(fallbackCount / bpRows.length),
          success_rate: round4(successCount / bpRows.length),
          last_updated_at: new Date().toISOString(),
        }, { onConflict: 'skill_id,benchmark_profile_id' })

        rollupsUpdated++
      }
    } catch (err: any) {
      errors.push(`${skillId}: ${err.message}`)
    }
  }

  const durationMs = Date.now() - startTime

  return NextResponse.json({
    message: 'Score recalculation complete (manual fallback)',
    skills_updated: skillsUpdated,
    rollups_updated: rollupsUpdated,
    total_records_processed: records.length,
    skills_skipped_insufficient_data: bySkill.size - skillsUpdated,
    duration_ms: durationMs,
    errors: errors.length > 0 ? errors : undefined,
    next_run: 'In 6 hours',
  })
}

// ---------------------------------------------------------------------------
// Scoring helpers
// ---------------------------------------------------------------------------

interface ComputedScores {
  outputScore: number
  reliabilityScore: number
  efficiencyScore: number
  costScore: number
  trustScore: number
  valueScore: number
}

function computeScoresFromOutcomes(rows: OutcomeRow[]): ComputedScores {
  const n = rows.length

  // --- Output Score ---
  // Based on avg task completion (outcome mapping) + avg quality rating
  const outcomeValues: Record<string, number> = {
    success: 1.0,
    partial_success: 0.6,
    failure: 0.1,
    aborted: 0.0,
  }
  const avgCompletion = rows.reduce((s, r) => s + (outcomeValues[r.outcome_status] ?? 0.5), 0) / n
  const qualityRatings = rows.filter(r => r.output_quality_rating != null).map(r => Number(r.output_quality_rating))
  const avgQuality = qualityRatings.length > 0
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
  const retryRate = Math.min(avgRetries / 5, 1) // normalize: 5+ retries = 1.0

  // Latency stability: coefficient of variation of latency (lower = more stable)
  const latencies = rows.filter(r => r.latency_ms != null).map(r => r.latency_ms!)
  let latencyStability = 0.7 // default if no data
  if (latencies.length >= 2) {
    const meanLat = latencies.reduce((s, v) => s + v, 0) / latencies.length
    if (meanLat > 0) {
      const variance = latencies.reduce((s, v) => s + (v - meanLat) ** 2, 0) / latencies.length
      const cv = Math.sqrt(variance) / meanLat
      latencyStability = Math.max(1 - cv, 0) // low CV = high stability
    }
  }

  // Failure volatility: rate of hard failures
  const hardFailures = rows.filter(r => r.outcome_status === 'failure' || r.outcome_status === 'aborted').length
  const failureVolatility = hardFailures / n

  const reliabilityScore = (
    0.50 * successRate +
    0.20 * (1 - retryRate) +
    0.15 * latencyStability +
    0.15 * (1 - failureVolatility)
  ) * 10

  // --- Efficiency Score ---
  // Based on latency percentile (lower = better)
  let efficiencyScore = 5.0 // default
  if (latencies.length > 0) {
    const sorted = [...latencies].sort((a, b) => a - b)
    const p50 = sorted[Math.floor(sorted.length * 0.5)]
    // Scale: sub-1s = 10, 1-5s = 7-9, 5-30s = 4-7, 30s+ = 1-4
    if (p50 <= 1000) efficiencyScore = 9.0 + (1 - p50 / 1000)
    else if (p50 <= 5000) efficiencyScore = 7.0 + 2.0 * (1 - (p50 - 1000) / 4000)
    else if (p50 <= 30000) efficiencyScore = 4.0 + 3.0 * (1 - (p50 - 5000) / 25000)
    else efficiencyScore = Math.max(1.0, 4.0 * (1 - (p50 - 30000) / 60000))
  }

  // --- Cost Score ---
  const costs = rows.filter(r => r.estimated_cost_usd != null).map(r => Number(r.estimated_cost_usd))
  let costScore = 7.0 // default if no cost data (assume moderate)
  if (costs.length > 0) {
    const avgCost = costs.reduce((s, v) => s + v, 0) / costs.length
    // Scale: free = 10, <$0.01 = 9, <$0.10 = 7-8, <$1 = 4-7, $1+ = 1-4
    if (avgCost <= 0) costScore = 10.0
    else if (avgCost <= 0.01) costScore = 9.0 + (1 - avgCost / 0.01)
    else if (avgCost <= 0.10) costScore = 7.0 + 2.0 * (1 - (avgCost - 0.01) / 0.09)
    else if (avgCost <= 1.0) costScore = 4.0 + 3.0 * (1 - (avgCost - 0.10) / 0.90)
    else costScore = Math.max(1.0, 4.0 * (1 - (avgCost - 1.0) / 10.0))
  }

  // --- Trust Score ---
  // Based on proof types and correction requirements
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

function blendScores(
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

  // Recompute value score from blended components
  blended.valueScore = calcValueScore({
    outputScore: blended.outputScore,
    reliabilityScore: blended.reliabilityScore,
    efficiencyScore: blended.efficiencyScore,
    costScore: blended.costScore,
    trustScore: blended.trustScore,
  })

  return blended
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000
}

// ---------------------------------------------------------------------------
// Mission & Challenge Expiry Cleanup
// ---------------------------------------------------------------------------

async function cleanupExpired(supabase: ReturnType<typeof createServerSupabaseClient>) {
  const now = new Date().toISOString()
  let missionsExpired = 0
  let claimsAbandoned = 0

  try {
    // Expire missions past their expires_at date
    const { data: expiredMissions } = await supabase
      .from('benchmark_missions')
      .update({ status: 'expired' })
      .eq('status', 'available')
      .lt('expires_at', now)
      .not('expires_at', 'is', null)
      .select('id')

    missionsExpired = expiredMissions?.length ?? 0

    // Abandon claims that have been "claimed" for over 7 days without completion
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: abandonedClaims } = await supabase
      .from('mission_claims')
      .update({ status: 'abandoned' })
      .eq('status', 'claimed')
      .lt('claimed_at', sevenDaysAgo)
      .select('id')

    claimsAbandoned = abandonedClaims?.length ?? 0
  } catch (err: any) {
    return { error: err.message }
  }

  return {
    missions_expired: missionsExpired,
    claims_abandoned: claimsAbandoned,
  }
}
