import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { calcContributionScore, calcRoutingCredits, TRUST_TIER_MODIFIERS } from '@/lib/scoring'

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
      output_quality_rating: 'Output quality 0-10',
      structured_output_valid: 'Did the model produce valid structured output? (boolean)',
      tool_calls_succeeded: 'Did tool calls succeed? (boolean)',
      hallucination_detected: 'Was hallucination detected? (boolean)',
      fallback_used: 'Did you fall back to a different model? (boolean)',
      fallback_model_slug: 'Which model did you fall back to?',
      agent_identity_id: 'Your agent UUID for credit tracking',
    },
    credit_rewards: {
      basic_report: '3-8 routing credits (model_slug + outcome only)',
      detailed_report: '6-12 routing credits (with latency, tokens, cost, quality)',
      with_decision_id: '+50% bonus when linked to a routing decision',
      registered_agent: '2x credit multiplier',
    },
    examples: [
      {
        description: 'Report after using a routed model',
        body: {
          decision_id: 'uuid-from-route-response',
          model_slug: 'claude-3-5-sonnet',
          outcome_status: 'success',
          latency_ms: 1200,
          input_tokens: 3400,
          output_tokens: 890,
          estimated_cost_usd: 0.0235,
          output_quality_rating: 8.5,
        },
      },
      {
        description: 'Report any model you used independently',
        body: {
          model_slug: 'gpt-4o-mini',
          outcome_status: 'success',
          latency_ms: 450,
          output_quality_rating: 7,
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
    structured_output_valid,
    tool_calls_succeeded,
    hallucination_detected,
    fallback_used,
    fallback_model_slug,
    agent_identity_id,
  } = body

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
      structured_output_valid: structured_output_valid ?? null,
      tool_calls_succeeded: tool_calls_succeeded ?? null,
      hallucination_detected: hallucination_detected ?? null,
      fallback_used: fallback_used ?? false,
      fallback_model_slug: fallback_model_slug ?? null,
      agent_identity_id: agent_identity_id ?? null,
      proof_type: 'self_reported',
    })
    .select('id')
    .single()

  if (outcomeError || !outcome) {
    return NextResponse.json({ error: 'Failed to record outcome', details: outcomeError?.message }, { status: 500 })
  }

  // Score the contribution
  let fieldCount = 0
  if (latency_ms != null) fieldCount++
  if (input_tokens != null) fieldCount++
  if (output_tokens != null) fieldCount++
  if (estimated_cost_usd != null) fieldCount++
  if (output_quality_rating != null) fieldCount++
  if (structured_output_valid != null) fieldCount++
  if (tool_calls_succeeded != null) fieldCount++

  const validity = Math.min(0.3 + fieldCount * 0.1, 1.0)
  const usefulness = Math.min(0.4 + fieldCount * 0.08, 0.9)
  const novelty = 0.7 // moderate for model telemetry
  const consistency = 0.7 // new system, neutral
  const antiGaming = outcome_status === 'failure' ? 0.95 : 0.85 // failures are more trustworthy

  const overallScore = calcContributionScore({ validity, usefulness, novelty, consistency, antiGaming })
  const accepted = overallScore >= 0.3 // lower threshold for model telemetry to bootstrap data

  // Calculate rewards
  let multiplier = 1.0
  if (validDecisionId) multiplier *= 1.5 // bonus for linked decisions
  let trustMod = 1.0
  if (agent_identity_id) {
    const { data: agent } = await supabase
      .from('agent_identities')
      .select('trust_tier')
      .eq('id', agent_identity_id)
      .maybeSingle()

    if (agent?.trust_tier) {
      trustMod = TRUST_TIER_MODIFIERS[agent.trust_tier as keyof typeof TRUST_TIER_MODIFIERS] || 1.0
    }
  }

  const credits = accepted ? calcRoutingCredits(8, overallScore, multiplier * trustMod) : 0
  const reputation = Math.round(credits * 0.5)

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
  }

  // Build response
  const response: any = {
    recorded: true,
    outcome_id: outcome.id,
    model_slug,
    outcome_status,
    contribution_score: parseFloat(overallScore.toFixed(2)),
    accepted,
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
