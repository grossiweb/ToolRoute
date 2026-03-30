/**
 * Trustless quality verification — three-tier hierarchy
 *
 * verified_quality  (LLM evaluator,       weight 1.0) ← most trusted
 * computed_quality  (structural signals,  weight 0.85)
 * self_reported     (agent-asserted,      weight 0.50) ← least trusted
 *
 * Effective quality = highest available tier, weighted by trust.
 * No tier beats 9.5 (anti-inflation cap, Consumer Reports style).
 */

import type { SupabaseClient } from '@supabase/supabase-js'

// ── Structural quality computation ──────────────────────────────────────────

export interface StructuralSignals {
  outcome_status: string
  latency_ms?: number | null
  output_snippet?: string | null
  structured_output_valid?: boolean | null
  tool_calls_succeeded?: boolean | null
  hallucination_detected?: boolean | null
  retry_count?: number | null
  fallback_used?: boolean | null
}

/**
 * Compute quality score from objective, non-self-reported signals.
 * Base: 6.0 for success, 3.0 for partial_success, 0.0 for failure/aborted.
 * Bonuses capped at 9.5 total — nothing is perfect.
 */
export function computeStructuralQuality(signals: StructuralSignals): number {
  const status = signals.outcome_status?.toLowerCase()

  let base: number
  if (status === 'success') base = 6.0
  else if (status === 'partial_success') base = 3.5
  else return 0.0  // failure or aborted

  let bonus = 0

  // Latency bonus: faster = better, up to +1.5
  if (signals.latency_ms != null) {
    if (signals.latency_ms < 500)       bonus += 1.5
    else if (signals.latency_ms < 1500) bonus += 1.0
    else if (signals.latency_ms < 3000) bonus += 0.5
    else if (signals.latency_ms < 6000) bonus += 0.2
    // > 6000 ms: no bonus
  }

  // Output evidence bonus: snippet proves something was produced
  if (signals.output_snippet && signals.output_snippet.length > 50)  bonus += 1.0
  else if (signals.output_snippet && signals.output_snippet.length > 10) bonus += 0.5

  // Structural validity bonus
  if (signals.structured_output_valid === true)  bonus += 0.5
  if (signals.tool_calls_succeeded === true)      bonus += 0.5

  // Penalty: hallucination detected
  if (signals.hallucination_detected === true) bonus -= 2.0

  // Penalty: fallback used
  if (signals.fallback_used === true) bonus -= 0.5

  // Penalty: retries required
  const retries = signals.retry_count ?? 0
  if (retries >= 3) bonus -= 1.5
  else if (retries >= 1) bonus -= 0.5

  return Math.min(Math.max(base + bonus, 0), 9.5)
}

// ── LLM evaluator (Gemini Flash Lite, ~$0.00001/call) ───────────────────────

const EVALUATOR_PROMPT = (task: string, snippet: string) => `
You are a neutral quality evaluator. Score this AI output on a 0-10 integer scale.

TASK: ${task}

OUTPUT SNIPPET: ${snippet}

Scoring guide:
9-10: Exceptional — fully addresses the task, no errors, excellent clarity
7-8:  Good — addresses the task well with minor omissions or style issues
5-6:  Adequate — partially addresses the task or has noticeable problems
3-4:  Poor — mostly misses the task or has significant errors
0-2:  Failure — off-topic, incoherent, or harmful

Respond with ONLY a single integer 0-10. No explanation.
`.trim()

/**
 * Call Gemini Flash Lite to evaluate output quality.
 * Returns null on any error — never throws.
 */
export async function callLlmEvaluator(task: string, snippet: string): Promise<number | null> {
  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) return null
  if (!task || !snippet) return null

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: EVALUATOR_PROMPT(task, snippet) }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 8 },
        }),
        signal: AbortSignal.timeout(8000),
      }
    )

    if (!res.ok) return null

    const json = await res.json()
    const text: string = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
    const score = parseInt(text, 10)
    if (isNaN(score) || score < 0 || score > 10) return null
    return score
  } catch {
    return null
  }
}

/**
 * Fire-and-forget LLM quality evaluation.
 * Updates the row after the main response is already returned to the caller.
 * Silently swallows all errors.
 */
export function scheduleVerifiedQualityUpdate(
  supabase: SupabaseClient,
  recordId: string,
  table: 'outcome_records' | 'model_outcome_records',
  task: string,
  snippet: string
): void {
  callLlmEvaluator(task, snippet).then(async (score) => {
    if (score == null) return
    await supabase
      .from(table)
      .update({ verified_quality: score, quality_method: 'llm_evaluator' })
      .eq('id', recordId)
  }).catch(() => {})
}

// ── Anti-gaming detection ────────────────────────────────────────────────────

export interface AntiGamingResult {
  multiplier: number  // 0.3 – 1.0 applied to contribution score
  flags: string[]     // e.g. ['constant_quality', 'identical_latency']
}

/**
 * Check the last 10 records for an agent for suspicious patterns.
 * - constant_quality: all records have the same non-null quality rating
 * - identical_latency: all latency_ms values are identical
 * - always_success: all 10 records show 'success' (suspicious if no variation)
 */
export async function detectAntiGamingPatterns(
  supabase: SupabaseClient,
  agentIdentityId: string
): Promise<AntiGamingResult> {
  const flags: string[] = []

  // Fetch last 10 model outcome records for this agent
  const { data: records } = await supabase
    .from('model_outcome_records')
    .select('output_quality_rating, latency_ms, outcome_status')
    .eq('agent_identity_id', agentIdentityId)
    .order('created_at', { ascending: false })
    .limit(10)

  if (!records || records.length < 5) {
    // Not enough data to detect patterns — give benefit of the doubt
    return { multiplier: 1.0, flags: [] }
  }

  const qualities = records.map((r: any) => r.output_quality_rating).filter((q: any) => q != null)
  const latencies = records.map((r: any) => r.latency_ms).filter((l: any) => l != null)
  const statuses = records.map((r: any) => r.outcome_status)

  // Constant quality: all non-null ratings are identical
  if (qualities.length >= 5) {
    const uniqueQualities = new Set(qualities)
    if (uniqueQualities.size === 1) {
      flags.push('constant_quality')
    }
  }

  // Identical latency: all non-null latencies are the same
  if (latencies.length >= 5) {
    const uniqueLatencies = new Set(latencies)
    if (uniqueLatencies.size === 1) {
      flags.push('identical_latency')
    }
  }

  // Always success: 10/10 records all 'success' with no variation
  if (records.length >= 10) {
    const allSuccess = statuses.every((s: string) => s === 'success')
    if (allSuccess) {
      flags.push('always_success')
    }
  }

  // Calculate multiplier: each flag reduces trust
  let multiplier = 1.0
  if (flags.includes('constant_quality')) multiplier -= 0.4
  if (flags.includes('identical_latency')) multiplier -= 0.25
  if (flags.includes('always_success'))   multiplier -= 0.05

  multiplier = Math.max(multiplier, 0.3)

  // Persist flags to DB (fire-and-forget, best-effort)
  if (flags.length > 0) {
    for (const flagType of flags) {
      supabase.from('agent_gaming_flags').upsert({
        agent_identity_id: agentIdentityId,
        flag_type: flagType,
        flag_detail: `Detected in last ${records.length} records`,
        flagged_at: new Date().toISOString(),
        resolved: false,
      }, { onConflict: 'agent_identity_id,flag_type' }).then(() => {}, () => {})
    }
  }

  return { multiplier, flags }
}

// ── Effective quality resolver ───────────────────────────────────────────────

/**
 * Resolve the effective quality score from all available tiers.
 * Falls back through verified → computed → self_reported → neutral prior (5.0).
 */
export function resolveEffectiveQuality(
  verifiedQuality?: number | null,
  computedQuality?: number | null,
  selfReported?: number | null
): { score: number; method: string } {
  if (verifiedQuality != null) {
    return { score: Math.round(verifiedQuality * 10) / 10, method: 'verified' }
  }
  if (computedQuality != null) {
    const weighted = computedQuality * 0.85
    return { score: Math.round(weighted * 10) / 10, method: 'computed' }
  }
  if (selfReported != null) {
    const weighted = selfReported * 0.5
    return { score: Math.round(weighted * 10) / 10, method: 'self_reported' }
  }
  return { score: 5.0, method: 'prior' }
}
