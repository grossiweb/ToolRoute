import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { rateLimit, getRateLimitKey } from '@/lib/rate-limit'
import {
  detectTaskSignals,
  resolveModelTier,
  rankModelsInTier,
  buildFallbackChain,
  getEscalation,
  calcModelConfidence,
  estimateTaskCost,
  TIER_DESCRIPTIONS,
  type ModelCandidate,
  type RoutingConstraints,
} from '@/lib/model-routing'

// GET /api/route/model — Self-documenting guide
export async function GET() {
  return NextResponse.json({
    endpoint: 'POST /api/route/model',
    description: 'Get an intelligent LLM model recommendation for your task. Returns a ToolRoute alias, provider model ID, fallback chain, escalation path, and cost estimate. Your agent calls the LLM itself — ToolRoute is the decision layer, not a proxy.',
    zero_cost: 'This endpoint adds ~$0 cost and <50ms latency. Pure rules-based routing, no LLM call involved.',
    request: {
      task: '(required) Natural language description of what you need the model for',
      constraints: {
        max_cost_per_mtok: '(optional) Max input cost per million tokens in USD',
        max_latency_ms: '(optional) Max acceptable latency in ms',
        min_context_window: '(optional) Minimum context window in tokens',
        preferred_provider: '(optional) openai | anthropic | google | mistral | deepseek | meta',
        exclude_providers: '(optional) Array of providers to exclude',
      },
      agent_identity_id: '(optional) Your agent UUID from POST /api/agents/register — earns credit bonuses',
    },
    tiers: TIER_DESCRIPTIONS,
    routing_signals: {
      tools_needed: 'Detected keywords: tool use, function call, execute command, mcp server, etc.',
      structured_output_needed: 'Detected keywords: json, structured output, parse, extract fields, csv, etc.',
      code_present: 'Detected keywords: code, function, class, implement, refactor, debug, python, etc.',
      creative_writing: 'Detected keywords: cold email, outreach, blog post, marketing copy, persuasive, compelling, etc.',
      complex_reasoning: 'Detected keywords: plan, design, architect, analyze, multi-step, strategy, etc.',
    },
    escalation_paths: {
      cheap_chat: 'cheap_structured → fast_code → reasoning_pro → best_available',
      creative_writing: 'reasoning_pro → best_available',
      tool_agent: 'best_available',
      description: 'If a recommended model fails or quality is too low, escalate to the next tier',
    },
    examples: [
      {
        task: 'Write a Python function to parse CSV files and return JSON',
        expected_tier: 'fast_code',
        signals: { tools_needed: false, structured_output_needed: true, code_present: true, complex_reasoning: false },
      },
      {
        task: 'Use tools to research competitors and extract pricing data into JSON',
        expected_tier: 'best_available',
        signals: { tools_needed: true, structured_output_needed: true, code_present: false, complex_reasoning: false },
      },
      {
        task: 'Translate this paragraph to Spanish',
        expected_tier: 'cheap_chat',
        signals: { tools_needed: false, structured_output_needed: false, code_present: false, complex_reasoning: false },
      },
    ],
    report_outcomes: 'POST /api/report/model — report how the model performed to earn credits and improve routing',
    register: 'POST /api/agents/register — register your agent for credit bonuses on every interaction',
  })
}

// POST /api/route/model — Get model recommendation
export async function POST(request: NextRequest) {
  // Rate limit: 120 requests/hour per IP
  const rlKey = getRateLimitKey(request)
  const rl = rateLimit('route-model', rlKey, 120)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    )
  }

  const startMs = Date.now()
  const supabase = createServerSupabaseClient()

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { task, constraints: rawConstraints, agent_identity_id } = body

  if (!task || typeof task !== 'string') {
    return NextResponse.json({
      error: 'task is required (string)',
      usage: 'POST /api/route/model with { "task": "describe what you need the model for" }',
      guide: 'GET /api/route/model for full documentation',
    }, { status: 400 })
  }

  // 1. Detect signals
  const signals = detectTaskSignals(task)

  // 2. Resolve tier
  const tier = resolveModelTier(signals, task)

  // 3. Build constraints
  const constraints: RoutingConstraints = {
    max_cost_per_mtok: rawConstraints?.max_cost_per_mtok,
    max_latency_ms: rawConstraints?.max_latency_ms,
    min_context_window: rawConstraints?.min_context_window,
    preferred_provider: rawConstraints?.preferred_provider,
    exclude_providers: rawConstraints?.exclude_providers,
  }

  // 4. Fetch models for this tier
  const { data: aliasRows, error: aliasError } = await supabase
    .from('model_aliases')
    .select(`
      priority, is_fallback, alias_name,
      model_registry (
        id, slug, display_name, provider, provider_model_id,
        supports_tool_calling, supports_structured_output, supports_vision,
        context_window, max_output_tokens,
        input_cost_per_mtok, output_cost_per_mtok,
        avg_latency_ms, tokens_per_second,
        reasoning_strength, code_strength,
        deprecation_date, status
      )
    `)
    .eq('tier', tier)
    .eq('active', true)
    .order('priority', { ascending: true })

  if (aliasError || !aliasRows || aliasRows.length === 0) {
    return NextResponse.json({
      error: 'No models available for the resolved tier',
      tier,
      signals,
      hint: 'This tier may not have seed data yet. Run migration 023 in Supabase.',
    }, { status: 404 })
  }

  // 5. Flatten into ModelCandidate[]
  const candidates: ModelCandidate[] = aliasRows.map((a: any) => {
    const m = Array.isArray(a.model_registry) ? a.model_registry[0] : a.model_registry
    return {
      id: m.id,
      slug: m.slug,
      display_name: m.display_name,
      provider: m.provider,
      provider_model_id: m.provider_model_id,
      priority: a.priority,
      is_fallback: a.is_fallback,
      input_cost_per_mtok: parseFloat(m.input_cost_per_mtok || '0'),
      output_cost_per_mtok: parseFloat(m.output_cost_per_mtok || '0'),
      avg_latency_ms: m.avg_latency_ms,
      context_window: m.context_window,
      supports_tool_calling: m.supports_tool_calling,
      supports_structured_output: m.supports_structured_output,
      supports_vision: m.supports_vision,
      reasoning_strength: m.reasoning_strength,
      code_strength: m.code_strength,
      deprecation_date: m.deprecation_date,
      // Outcome data will be populated below
      avg_quality_rating: null,
      success_rate: null,
      sample_size: null,
    }
  })

  // 6. Fetch outcome stats per model (aggregate from model_outcome_records)
  const modelIds = candidates.map(c => c.id)
  const { data: outcomeStats } = await supabase.rpc('get_model_outcome_stats', { model_ids: modelIds }).maybeSingle()

  // If the RPC doesn't exist yet, just skip — outcome data is optional
  if (outcomeStats && Array.isArray(outcomeStats)) {
    for (const stat of outcomeStats) {
      const candidate = candidates.find(c => c.id === stat.model_id)
      if (candidate) {
        candidate.avg_quality_rating = stat.avg_quality
        candidate.trust_weighted_quality = stat.trust_weighted_quality ?? null
        candidate.success_rate = stat.success_rate
        candidate.sample_size = stat.sample_size
      }
    }
  }

  // 7. Rank models
  const ranked = rankModelsInTier(candidates, constraints)

  if (ranked.length === 0) {
    return NextResponse.json({
      error: 'No models match your constraints in this tier',
      tier,
      signals,
      constraints,
      hint: 'Try relaxing constraints (increase max_cost_per_mtok or remove exclude_providers)',
    }, { status: 404 })
  }

  // 8. Select primary + build chains
  const primary = ranked[0]
  const fallbackChain = buildFallbackChain(primary, ranked)
  const escalation = getEscalation(tier)
  const confidence = calcModelConfidence(signals, tier, primary)
  const costEstimate = estimateTaskCost(primary, task.length, tier)
  const constraintsApplied = Object.entries(constraints).filter(([, v]) => v != null).map(([k]) => k)

  // 9. Log decision (fire-and-forget)
  const taskHash = simpleHash(task)
  const decisionId = crypto.randomUUID()

  supabase.from('model_routing_decisions').insert({
    id: decisionId,
    task_hash: taskHash,
    task_snippet: task.slice(0, 200),
    signals_json: signals,
    resolved_tier: tier,
    recommended_model_id: primary.id,
    recommended_alias: `toolroute/${tier}`,
    fallback_chain: fallbackChain.map(f => f.slug),
    confidence,
    constraints_json: constraints,
    agent_identity_id: agent_identity_id || null,
    latency_ms: Date.now() - startMs,
  }).then(() => {})

  // 10. Build response
  const response: any = {
    recommended_model: `toolroute/${tier}`,
    model_details: {
      slug: primary.slug,
      display_name: primary.display_name,
      provider: primary.provider,
      provider_model_id: primary.provider_model_id,
      input_cost_per_mtok: primary.input_cost_per_mtok,
      output_cost_per_mtok: primary.output_cost_per_mtok,
      context_window: primary.context_window,
      supports_tool_calling: primary.supports_tool_calling,
      supports_structured_output: primary.supports_structured_output,
      supports_vision: primary.supports_vision,
    },
    tier,
    tier_description: TIER_DESCRIPTIONS[tier],
    confidence,
    signals,
    estimated_cost: costEstimate,
    fallback_chain: fallbackChain,
    escalation: escalation ? {
      next_tier: escalation.tier,
      trigger: escalation.reason,
      alias: `toolroute/${escalation.tier}`,
    } : null,
    reasoning: buildReasoning(signals, tier, primary, ranked.length),
    routing_metadata: {
      decision_id: decisionId,
      routing_latency_ms: Date.now() - startMs,
      candidates_evaluated: candidates.length,
      candidates_after_filter: ranked.length,
      constraints_applied: constraintsApplied,
      outcome_data_available: candidates.some(c => c.sample_size != null && c.sample_size > 0),
    },
    wanted_telemetry: {
      report_endpoint: '/api/report/model',
      decision_id: decisionId,
      reward_multiplier: 1.5,
      fields: ['latency_ms', 'input_tokens', 'output_tokens', 'estimated_cost_usd', 'output_quality_rating', 'outcome_status'],
      one_liner: 'Report how this model performed → earn routing credits → improve routing for all agents',
    },
  }

  // Agent recognition
  if (agent_identity_id) {
    const { data: agent } = await supabase
      .from('agent_identities')
      .select('agent_name, trust_tier')
      .eq('id', agent_identity_id)
      .maybeSingle()

    if (agent) {
      response.agent = { agent_name: agent.agent_name, trust_tier: agent.trust_tier, recognized: true }
    }
  } else {
    response.register_hint = {
      message: 'Register your agent for 2x credit bonuses on model telemetry reports.',
      action: 'POST /api/agents/register',
      body: { agent_name: 'your-agent-name' },
    }
  }

  response.earn_more = {
    challenges: {
      message: 'Workflow Challenges pay 3x credits — pick a business task, choose your own model + tools, compete for Gold.',
      endpoint: 'GET /api/challenges',
    },
    mcp_routing: {
      message: 'Need an MCP server too? POST /api/route for tool recommendations.',
      endpoint: 'POST /api/route',
    },
  }

  return NextResponse.json(response)
}

// Simple string hash for task dedup
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash.toString(36)
}

function buildReasoning(signals: any, tier: string, primary: any, candidateCount: number): string {
  const signalNames = []
  if (signals.tools_needed) signalNames.push('tool calling')
  if (signals.structured_output_needed) signalNames.push('structured output')
  if (signals.code_present) signalNames.push('code generation')
  if (signals.complex_reasoning) signalNames.push('complex reasoning')

  const signalStr = signalNames.length > 0
    ? `Detected signals: ${signalNames.join(', ')}.`
    : 'No specific signals detected — defaulting to cheapest tier.'

  const modelStr = `${primary.display_name} (${primary.provider}) selected as primary from ${candidateCount} candidates.`

  const costStr = primary.input_cost_per_mtok != null
    ? `Input cost: $${primary.input_cost_per_mtok}/Mtok.`
    : ''

  return `${signalStr} Routed to ${tier}. ${modelStr} ${costStr}`.trim()
}
