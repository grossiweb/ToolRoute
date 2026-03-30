import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { calcContributionScore, calcRoutingCredits, TRUST_TIER_MODIFIERS } from '@/lib/scoring'
import {
  computeStructuralQuality,
  scheduleVerifiedQualityUpdate,
  detectAntiGamingPatterns,
} from '@/lib/quality-verifier'
import { verifyCommitment, validateTimestamp } from '@/lib/commitment'
import { reportAcceptedDelta, detectGamingPatterns } from '@/lib/trust-score'

// GET /api/report/model — Self-documenting guide
export async function GET() {
  return NextResponse.json({
    endpoint: 'POST /api/report/model',
    description: 'Report LLM model execution outcome. Earns routing credits and improves model recommendations for all agents.',
    important: 'Report ANY model execution — even if you did not use /api/route/model first.',
    required_fields: {
      model_slug: 'The model slug (e.g. "gpt-4o-mini", "claude-3-5-sonnet")',
      outcome_status: 'success | partial_success | failure | aborted',
    },
    optional_fields: {
      decision_id: 'The decision_id from /api/route/model response (earns bonus credits)',
      latency_ms: 'Total LLM call latency in ms',
      input_tokens: 'Input tokens consumed',
      output_tokens: 'Output tokens generated',
      estimated_cost_usd: 'Estimated cost in USD',
      output_quality_rating: 'Agent-asserted quality 0-10 (lowest trust weight — prefer output_snippet)',
      output_snippet: 'First 500 chars of model output — enables LLM quality verification (highest trust)',
      task: 'The task/prompt you sent to the model — used by LLM evaluator alongside output_snippet',
      retry_count: 'How many retries were needed before success (0 = clean run)',
      structured_output_valid: 'Did the model produce valid structured output? (boolean)',
      tool_calls_succeeded: 'Did tool calls succeed? (boolean)',
      hallucination_detected: 'Was hallucination detected? (boolean)',
      fallback_used: 'Did you fall back to a different model? (boolean)',
      fallback_model_slug: 'Which model did you fall back to?',
      agent_identity_id: 'Your agent UUID for credit tracking',
    },
    quality_verification: {
      note: 'Quality is verified independently — self-reported ratings have 50% weight vs 100% for LLM-verified',
      tiers: {
        verified: 'LLM evaluator (Gemini Flash Lite) scores your output_snippet against the task — weight 1.0',
        computed: 'Structural signals: latency, snippet length, structured validity, retry count — weight 0.85',
        self_reported: 'output_quality_rating you provide — weight 0.50',
      },
      recommendation: 'Include output_snippet + task for highest-quality verification and maximum credits',
    },
    cryptographic_signing: {
      note: 'Register with a public_key to enable signed reports. Signed reports bypass anti-gaming penalties entirely.',
      fields: {
        commitment_hash: 'SHA256("{model_slug}:{outcome_status}:{unix_timestamp_seconds}:{SHA256(output_snippet||\'\')}") — hex',
        report_signature: 'Ed25519 signature over commitment_hash — base64',
        report_timestamp: 'Unix timestamp in seconds (must be within 300s of server time)',
      },
      effect: 'proof_type becomes client_signed, anti_gaming.multiplier locked at 1.0',
      setup: 'Generate keypair with Node.js crypto.generateKeyPairSync("ed25519") and include public key in POST /api/agents/register',
    },
    credit_rewards: {
      basic_report: '3-8 routing credits (model_slug + outcome only)',
      detailed_report: '6-12 routing credits (with latency, tokens, cost, quality)',
      with_decision_id: '+50% bonus when linked to a routing decision',
      registered_agent: '2x credit multiplier',
    },
    examples: [
      {
        description: 'Full report with LLM verification (recommended)',
        body: {
          decision_id: 'uuid-from-route-response',
          model_slug: 'claude-3-5-sonnet',
          outcome_status: 'success',
          latency_ms: 1200,
          input_tokens: 3400,
          output_tokens: 890,
          estimated_cost_usd: 0.0235,
          task: 'Write a Python function to parse CSV files with custom delimiters',
          output_snippet: 'def parse_csv(filepath, delimiter=","):\n    import csv\n    with open(filepath) as f:\n        reader = csv.DictReader(f, delimiter=delimiter)...',
          retry_count: 0,
          structured_output_valid: true,
        },
      },
      {
        description: 'Minimal report (no verification)',
        body: {
          model_slug: 'gpt-4o-mini',
          outcome_status: 'success',
          latency_ms: 450,
        },
      },
    ],
  })
}

// POST /api/report/model — Report model execution outcome
export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const {
    decision_id,
    model_slug,
    outcome_status,
    latency_ms,
    input_tokens,
    output_tokens,
    estimated_cost_usd,
    output_quality_rating,
    output_snippet,
    task,
    retry_count,
    structured_output_valid,
    tool_calls_succeeded,
    hallucination_detected,
    fallback_used,
    fallback_model_slug,
    agent_identity_id,
    // Cryptographic commitment fields (Option B)
    commitment_hash,
    report_signature,
    report_timestamp,
  } = body

  // ── Signature verification ──────────────────────────────────────────────────
  let proofType: 'client_signed' | 'self_reported' = 'self_reported'
  let sigVerified = false

  if (commitment_hash && report_signature && report_timestamp && agent_identity_id) {
    // Replay protection: reject stale timestamps
    const tsCheck = validateTimestamp(Number(report_timestamp))
    if (!tsCheck.valid) {
      return NextResponse.json({
        error: 'report_timestamp expired',
        hint: `Timestamp is ${tsCheck.age_seconds}s old. Window is 300s. Regenerate your commitment.`,
      }, { status: 400 })
    }

    // Look up the agent's stored public key
    const { data: agentKeyRow } = await supabase
      .from('agent_identities')
      .select('public_key')
      .eq('id', agent_identity_id)
      .maybeSingle()

    if (agentKeyRow?.public_key) {
      const valid = verifyCommitment(agentKeyRow.public_key, commitment_hash, report_signature)
      if (!valid) {
        return NextResponse.json({
          error: 'Invalid signature',
          hint: 'Verify commitment hash construction: SHA256("{model_slug}:{outcome_status}:{unix_ts}:{SHA256(output_snippet||\'\')}") then sign with Ed25519 private key.',
        }, { status: 400 })
      }
      proofType = 'client_signed'
      sigVerified = true
    }
    // If agent has no public key registered, fall through to self_reported silently
  }

  if (!model_slug || !outcome_status) {
    return NextResponse.json({
      error: 'model_slug and outcome_status are required',
      guide: 'GET /api/report/model for full documentation',
    }, { status: 400 })
  }

  const validOutcomes = ['success', 'partial_success', 'failure', 'aborted']
  if (!validOutcomes.includes(outcome_status)) {
    return NextResponse.json({
      error: `outcome_status must be one of: ${validOutcomes.join(', ')}`,
    }, { status: 400 })
  }

  // Resolve model_id from slug
  const { data: model } = await supabase
    .from('model_registry')
    .select('id')
    .eq('slug', model_slug)
    .maybeSingle()

  if (!model) {
    return NextResponse.json({
      error: `Unknown model_slug: ${model_slug}`,
      hint: 'Check available models at GET /api/route/model or GET /models',
    }, { status: 404 })
  }

  // Validate decision_id if provided
  let validDecisionId: string | null = null
  if (decision_id) {
    const { data: decision } = await supabase
      .from('model_routing_decisions')
      .select('id')
      .eq('id', decision_id)
      .maybeSingle()

    if (decision) validDecisionId = decision.id
  }

  // Compute structural quality from objective signals
  const computedQuality = computeStructuralQuality({
    outcome_status,
    latency_ms,
    output_snippet,
    structured_output_valid,
    tool_calls_succeeded,
    hallucination_detected,
    retry_count,
    fallback_used,
  })

  // Insert outcome record
  const { data: outcome, error: outcomeError } = await supabase
    .from('model_outcome_records')
    .insert({
      routing_decision_id: validDecisionId,
      model_id: model.id,
      outcome_status,
      latency_ms: latency_ms ?? null,
      input_tokens: input_tokens ?? null,
      output_tokens: output_tokens ?? null,
      estimated_cost_usd: estimated_cost_usd ?? null,
      output_quality_rating: output_quality_rating ?? null,
      output_snippet: output_snippet ? String(output_snippet).slice(0, 500) : null,
      task_context: task ? String(task).slice(0, 300) : null,
      computed_quality: parseFloat(computedQuality.toFixed(2)),
      retry_count: retry_count ?? 0,
      structured_output_valid: structured_output_valid ?? null,
      tool_calls_succeeded: tool_calls_succeeded ?? null,
      hallucination_detected: hallucination_detected ?? null,
      fallback_used: fallback_used ?? false,
      fallback_model_slug: fallback_model_slug ?? null,
      agent_identity_id: agent_identity_id ?? null,
      proof_type: proofType,
      commitment_hash: commitment_hash ?? null,
      report_signature: report_signature ?? null,
    })
    .select('id')
    .single()

  if (outcomeError || !outcome) {
    // Postgres unique violation on commitment_hash = replay attack
    if (outcomeError?.code === '23505' && commitment_hash) {
      return NextResponse.json({
        error: 'Duplicate commitment',
        hint: 'This commitment_hash has already been submitted. Each report requires a unique timestamp.',
      }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to record outcome', details: outcomeError?.message }, { status: 500 })
  }

  // Score the contribution — richer reports earn more
  let fieldCount = 0
  if (latency_ms != null) fieldCount++
  if (input_tokens != null) fieldCount++
  if (output_tokens != null) fieldCount++
  if (estimated_cost_usd != null) fieldCount++
  if (output_quality_rating != null) fieldCount++
  if (structured_output_valid != null) fieldCount++
  if (tool_calls_succeeded != null) fieldCount++
  if (output_snippet != null) fieldCount += 2  // snippet = +2 (enables LLM verification)
  if (task != null) fieldCount++

  const validity = Math.min(0.3 + fieldCount * 0.08, 1.0)
  const usefulness = Math.min(0.4 + fieldCount * 0.07, 0.9)
  const novelty = 0.7 // moderate for model telemetry

  // Anti-gaming: signed reports are trusted — no behavioral penalty
  // Unsigned reports from registered agents are subject to pattern detection
  let antiGamingMultiplier = outcome_status === 'failure' ? 0.95 : 0.85
  let antiGamingNote: string | null = null
  if (sigVerified) {
    antiGamingMultiplier = 1.0
    antiGamingNote = 'signature_verified'
  } else if (agent_identity_id) {
    const gaming = await detectAntiGamingPatterns(supabase, agent_identity_id)
    antiGamingMultiplier = Math.min(antiGamingMultiplier, gaming.multiplier)
    if (gaming.flags.length > 0) {
      antiGamingNote = `flags: ${gaming.flags.join(', ')}`
    }
  }

  const overallScore = calcContributionScore({
    validity,
    usefulness,
    novelty,
    consistency: 0.7,
    antiGaming: antiGamingMultiplier,
  })
  const accepted = overallScore >= 0.3 // lower threshold for model telemetry to bootstrap data

  // Calculate rewards
  let multiplier = 1.0
  if (validDecisionId) multiplier *= 1.5 // bonus for linked decisions
  let trustMod = 1.0
  let agentTier: string | null = null
  if (agent_identity_id) {
    const { data: agent } = await supabase
      .from('agent_identities')
      .select('trust_tier, trust_score, contributor_id')
      .eq('id', agent_identity_id)
      .maybeSingle()

    if (agent?.trust_tier) {
      agentTier = agent.trust_tier
      trustMod = TRUST_TIER_MODIFIERS[agent.trust_tier as keyof typeof TRUST_TIER_MODIFIERS] || 1.0
    }
  }

  const credits = accepted ? calcRoutingCredits(8, overallScore, multiplier * trustMod) : 0
  const reputation = Math.round(credits * 0.5)

  // Schedule async LLM quality verification if snippet + task provided
  if (accepted && output_snippet && task) {
    scheduleVerifiedQualityUpdate(supabase, outcome.id, 'model_outcome_records', task, output_snippet)
  }

  // Issue rewards — requires contributor_id (NOT NULL in reward_ledgers)
  if (accepted && agent_identity_id) {
    const { data: agentRow } = await supabase
      .from('agent_identities')
      .select('contributor_id')
      .eq('id', agent_identity_id)
      .maybeSingle()

    if (agentRow?.contributor_id) {
      supabase.from('reward_ledgers').insert({
        contributor_id: agentRow.contributor_id,
        agent_identity_id,
        routing_credits: credits,
        reputation_points: reputation,
        economic_credits_usd: parseFloat((0.008 * overallScore * multiplier * trustMod).toFixed(4)),
        reason: `model_telemetry:${model_slug} (score: ${overallScore.toFixed(2)})`,
      }).then(() => {})
    }

    supabase.rpc('update_agent_stats', {
      p_agent_id: agent_identity_id,
      p_credits_delta: credits,
      p_rep_delta: reputation,
    }).then(() => {})

    // Trust score delta — await recent reports before return so the
    // single-level adjust_trust_score fire-and-forget actually executes
    // (nested .then inside .then is killed by Vercel before it runs)
    const { data: recentReports } = await supabase
      .from('model_outcome_records')
      .select('outcome_status, output_quality_rating, latency_ms')
      .eq('agent_identity_id', agent_identity_id)
      .order('created_at', { ascending: false })
      .limit(25)

    const { delta: pos, reasons: posR } = reportAcceptedDelta({
      hasDecisionId: !!validDecisionId,
      qualityRating: output_quality_rating,
    })
    const { totalDelta: neg, reasons: negR } = detectGamingPatterns({
      outcomeStatus: outcome_status,
      qualityRating: output_quality_rating,
      latencyMs: latency_ms,
      hallucination: hallucination_detected,
      recentReports: recentReports ?? [],
    })
    const trustDelta = pos + neg
    if (trustDelta !== 0) {
      // await — fire-and-forget is killed by Vercel before it resolves
      await supabase.rpc('adjust_trust_score', {
        p_agent_id: agent_identity_id,
        p_delta: trustDelta,
        p_reason: [...posR, ...negR].join('; ') || 'model_report',
      })
    }
  }

  // Build response
  const response: any = {
    recorded: true,
    outcome_id: outcome.id,
    model_slug,
    outcome_status,
    proof_type: proofType,
    contribution_score: parseFloat(overallScore.toFixed(2)),
    accepted,
    quality: {
      computed: parseFloat(computedQuality.toFixed(1)),
      verified: output_snippet && task ? 'pending_async' : null,
      note: output_snippet && task
        ? 'LLM verification queued — verified_quality will update within seconds.'
        : 'Add output_snippet + task for independent LLM quality verification (+credits)',
    },
    anti_gaming: {
      multiplier: parseFloat(antiGamingMultiplier.toFixed(2)),
      ...(antiGamingNote ? { note: antiGamingNote } : {}),
    },
    rewards: {
      routing_credits: credits,
      reputation_points: reputation,
      decision_bonus: validDecisionId ? '1.5x applied' : 'Include decision_id for 1.5x bonus',
    },
    message: accepted
      ? `Thanks! +${credits} routing credits earned for ${model_slug} telemetry.`
      : 'Report recorded. Add more fields (latency, tokens, quality) for higher credit rewards.',
  }

  if (!agent_identity_id) {
    response.register_for_more = {
      message: 'Registered agents earn 2x credits on model telemetry.',
      action: 'POST /api/agents/register',
      body: { agent_name: 'your-agent-name' },
    }
  }

  response.earn_more = {
    model_comparative: {
      message: 'Compare 2+ models on the same task for 2.5x credits via POST /api/contributions.',
    },
    challenges: {
      message: 'Workflow Challenges pay 3x credits — GET /api/challenges.',
    },
  }

  return NextResponse.json(response)
}
