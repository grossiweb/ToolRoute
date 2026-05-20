import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  computeScoresFromOutcomes,
  blendScores,
  round2,
  round4,
  SCORE_VERSION,
  type OutcomeRow,
  type SkillScoreRow,
} from '@/lib/recalculate-scores'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerSupabaseClient()

  try {
    let recalcMessage: string
    let recalcResult: any

    const { data, error } = await supabase.rpc('recalculate_all')

    if (error) {
      console.error('RPC error, falling back to manual recalculation:', error.message)
      const manual = await manualRecalculation(supabase)
      if (!manual.success) {
        return NextResponse.json(
          { error: manual.error, detail: manual.detail },
          { status: 500 },
        )
      }
      recalcMessage = 'Score recalculation complete (manual fallback)'
      recalcResult = manual.payload
    } else {
      recalcMessage = 'Score recalculation complete'
      recalcResult = data
    }

    // cleanupExpired runs unconditionally on both the RPC success path and the
    // manual fallback path — previously it only ran on success, so months of
    // fallback execution left missions and claims unexpired.
    const expiryResult = await cleanupExpired(supabase)

    return NextResponse.json({
      message: recalcMessage,
      result: recalcResult,
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

interface ManualResult {
  success: boolean
  error?: string
  detail?: string
  payload?: {
    skills_updated: number
    rollups_updated: number
    total_records_processed: number
    skills_skipped_insufficient_data: number
    duration_ms: number
    errors?: string[]
  }
}

async function manualRecalculation(
  supabase: ReturnType<typeof createServerSupabaseClient>,
): Promise<ManualResult> {
  const startTime = Date.now()
  let skillsUpdated = 0
  let rollupsUpdated = 0
  const errors: string[] = []

  const { data: rawRecords, error: fetchErr } = await supabase
    .from('outcome_records')
    .select('id, skill_id, benchmark_profile_id, outcome_status, latency_ms, estimated_cost_usd, retries, output_quality_rating, structured_output_valid, human_correction_required, human_correction_minutes, fallback_used_skill_id, agent_identity_id, agent_identities(trust_score)')
    .order('created_at', { ascending: false })

  if (fetchErr || !rawRecords) {
    return {
      success: false,
      error: 'Failed to fetch outcome records',
      detail: fetchErr?.message,
    }
  }

  const records = (rawRecords as any[]).map(r => ({
    ...r,
    reporter_trust_score: r.agent_identities?.trust_score ?? null,
  })) as OutcomeRow[]

  const bySkill = new Map<string, OutcomeRow[]>()
  for (const r of records) {
    const list = bySkill.get(r.skill_id) || []
    list.push(r)
    bySkill.set(r.skill_id, list)
  }

  const { data: existingScores } = await supabase
    .from('skill_scores')
    .select('skill_id, output_score, reliability_score, efficiency_score, cost_score, trust_score, value_score')

  const existingMap = new Map<string, SkillScoreRow>()
  if (existingScores) {
    for (const s of existingScores as SkillScoreRow[]) {
      existingMap.set(s.skill_id, s)
    }
  }

  for (const [skillId, rows] of Array.from(bySkill.entries())) {
    if (rows.length < 3) continue

    try {
      const computed = computeScoresFromOutcomes(rows)
      const existing = existingMap.get(skillId)
      const blended = blendScores(computed, existing)

      await supabase.from('skill_scores').upsert({
        skill_id: skillId,
        output_score: round2(blended.outputScore),
        reliability_score: round2(blended.reliabilityScore),
        efficiency_score: round2(blended.efficiencyScore),
        cost_score: round2(blended.costScore),
        trust_score: round2(blended.trustScore),
        value_score: round2(blended.valueScore),
        overall_score: round2(blended.valueScore),
        score_version: SCORE_VERSION,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'skill_id' })

      skillsUpdated++

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
          // Intentional asymmetry: the rollup's `success_rate` field is
          // strict success-only (excludes partial_success). The reliability
          // formula inside computeScoresFromOutcomes() uses
          // success-or-partial. Do not "unify" these — migration 046's SQL
          // preserves the same distinction.
          success_rate: round4(successCount / bpRows.length),
          last_updated_at: new Date().toISOString(),
        }, { onConflict: 'skill_id,benchmark_profile_id' })

        rollupsUpdated++
      }
    } catch (err: any) {
      errors.push(`${skillId}: ${err.message}`)
    }
  }

  return {
    success: true,
    payload: {
      skills_updated: skillsUpdated,
      rollups_updated: rollupsUpdated,
      total_records_processed: records.length,
      skills_skipped_insufficient_data: bySkill.size - skillsUpdated,
      duration_ms: Date.now() - startTime,
      errors: errors.length > 0 ? errors : undefined,
    },
  }
}

// ---------------------------------------------------------------------------
// Mission & Challenge Expiry Cleanup
// ---------------------------------------------------------------------------

async function cleanupExpired(supabase: ReturnType<typeof createServerSupabaseClient>) {
  const now = new Date().toISOString()
  let missionsExpired = 0
  let claimsAbandoned = 0

  try {
    const { data: expiredMissions } = await supabase
      .from('benchmark_missions')
      .update({ status: 'expired' })
      .eq('status', 'available')
      .lt('expires_at', now)
      .not('expires_at', 'is', null)
      .select('id')

    missionsExpired = expiredMissions?.length ?? 0

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
