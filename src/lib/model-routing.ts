/**
 * LLM Model Routing — Pure functions for deterministic model selection
 * Single source of truth for signal detection, tier resolution, ranking, and confidence.
 */

// ── Types ──

export interface TaskSignals {
  tools_needed: boolean
  structured_output_needed: boolean
  code_present: boolean
  complex_reasoning: boolean
  creative_writing: boolean
  signal_count: number
}

export type ModelTier =
  | 'cheap_chat'
  | 'cheap_structured'
  | 'fast_code'
  | 'creative_writing'
  | 'reasoning_pro'
  | 'tool_agent'
  | 'best_available'

export interface ModelCandidate {
  id: string
  slug: string
  display_name: string
  provider: string
  provider_model_id: string
  priority: number
  is_fallback: boolean
  input_cost_per_mtok: number
  output_cost_per_mtok: number
  avg_latency_ms: number | null
  context_window: number
  supports_tool_calling: boolean
  supports_structured_output: boolean
  supports_vision: boolean
  reasoning_strength: string
  code_strength: string
  deprecation_date: string | null
  // Outcome-based (from telemetry, nullable)
  avg_quality_rating?: number | null
  success_rate?: number | null
  sample_size?: number | null
}

export interface RoutingConstraints {
  max_cost_per_mtok?: number
  max_latency_ms?: number
  min_context_window?: number
  preferred_provider?: string
  exclude_providers?: string[]
}

// ── Signal Detection Keywords ──

const SIGNAL_KEYWORDS: Record<keyof Omit<TaskSignals, 'signal_count'>, string[]> = {
  tools_needed: [
    'tool use', 'tool_use', 'tool calling', 'function call', 'function_call',
    'execute command', 'run command', 'call api', 'api call',
    'use tools', 'with tools', 'tool_choice', 'invoke tools', 'orchestrate tools',
    'use mcp', 'connect to mcp', 'via mcp',
  ],
  structured_output_needed: [
    'json', 'structured output', 'structured_output', 'json schema',
    'parse into', 'extract fields', 'csv', 'response_format', 'typed output',
    'return as json', 'json object', 'json array', 'structured data',
  ],
  code_present: [
    'code', 'function', 'class', 'implement', 'refactor', 'debug',
    'typescript', 'python', 'javascript', 'rust', 'golang', 'java',
    'programming', 'algorithm', 'bug fix', 'unit test', 'codebase',
    'compile', 'syntax', 'import', 'module', 'library',
    'sql query', 'sql', 'select from', 'join', 'having clause',
    'regex', 'regular expression',
  ],
  complex_reasoning: [
    'plan', 'design', 'architect', 'analyze', 'multi-step', 'strategy',
    'trade-off', 'compare options', 'complex', 'reasoning', 'chain of thought',
    'step by step', 'think through', 'evaluate', 'comprehensive analysis',
    'research paper', 'deep analysis', 'long-form',
  ],
  creative_writing: [
    'cold email', 'outreach email', 'persuasive', 'compelling', 'engaging',
    'blog post', 'article', 'essay', 'creative', 'storytelling',
    'marketing copy', 'sales copy', 'landing page copy', 'ad copy',
    'pitch', 'proposal', 'cover letter', 'linkedin post',
    'social media post', 'thread', 'newsletter',
    'tone', 'voice', 'brand voice', 'professional email',
    'announcement', 'press release', 'case study',
  ],
}

const BEST_AVAILABLE_KEYWORDS = [
  'best model', 'best possible', 'highest quality', 'most capable',
  'strongest model', 'premium', 'top tier', 'no cost limit',
  'spare no expense', 'maximum quality',
]

// ── Signal Detection ──

export function detectTaskSignals(task: string): TaskSignals {
  if (!task) {
    return { tools_needed: false, structured_output_needed: false, code_present: false, complex_reasoning: false, creative_writing: false, signal_count: 0 }
  }

  const lower = task.toLowerCase()

  const tools_needed = SIGNAL_KEYWORDS.tools_needed.some(kw => lower.includes(kw))
  const structured_output_needed = SIGNAL_KEYWORDS.structured_output_needed.some(kw => lower.includes(kw))
  const code_present = SIGNAL_KEYWORDS.code_present.some(kw => lower.includes(kw))
  const complex_reasoning = SIGNAL_KEYWORDS.complex_reasoning.some(kw => lower.includes(kw))
  const creative_writing = SIGNAL_KEYWORDS.creative_writing.some(kw => lower.includes(kw))

  const signal_count = [tools_needed, structured_output_needed, code_present, complex_reasoning, creative_writing].filter(Boolean).length

  return { tools_needed, structured_output_needed, code_present, complex_reasoning, creative_writing, signal_count }
}

// ── Tier Resolution ──

export function resolveModelTier(signals: TaskSignals, task?: string): ModelTier {
  // Explicit best_available override
  if (task) {
    const lower = task.toLowerCase()
    if (BEST_AVAILABLE_KEYWORDS.some(kw => lower.includes(kw))) {
      return 'best_available'
    }
  }

  // Multi-signal escalation
  if (signals.tools_needed && signals.complex_reasoning) return 'best_available'

  // Single-signal rules (first match wins)
  if (signals.tools_needed) return 'tool_agent'
  if (signals.complex_reasoning) return 'reasoning_pro'
  if (signals.creative_writing) return 'creative_writing'
  if (signals.code_present) return 'fast_code'
  if (signals.structured_output_needed) return 'cheap_structured'

  return 'cheap_chat'
}

// ── Model Ranking ──

export function rankModelsInTier(
  models: ModelCandidate[],
  constraints: RoutingConstraints
): ModelCandidate[] {
  // 1. Hard filter
  let filtered = models.filter(m => {
    if (constraints.max_cost_per_mtok != null && m.input_cost_per_mtok > constraints.max_cost_per_mtok) return false
    if (constraints.max_latency_ms != null && m.avg_latency_ms != null && m.avg_latency_ms > constraints.max_latency_ms) return false
    if (constraints.min_context_window != null && m.context_window < constraints.min_context_window) return false
    if (constraints.exclude_providers?.includes(m.provider)) return false
    // Filter deprecated models
    if (m.deprecation_date && new Date(m.deprecation_date) < new Date()) return false
    return true
  })

  // 2. Boost preferred provider
  if (constraints.preferred_provider) {
    filtered = filtered.map(m => ({
      ...m,
      priority: m.provider === constraints.preferred_provider ? m.priority - 10 : m.priority,
    }))
  }

  // 3. Sort by priority
  filtered.sort((a, b) => a.priority - b.priority)

  // 4. If outcome data exists, re-rank by weighted composite
  const withOutcomes = filtered.filter(m => m.sample_size != null && m.sample_size >= 5)
  if (withOutcomes.length >= 2) {
    const maxQuality = Math.max(...withOutcomes.map(m => m.avg_quality_rating ?? 0))
    const maxSuccess = Math.max(...withOutcomes.map(m => m.success_rate ?? 0))
    const maxCost = Math.max(...withOutcomes.map(m => m.input_cost_per_mtok || 1))

    const scored = filtered.map(m => {
      if (m.sample_size == null || m.sample_size < 5) return { model: m, score: -1 }
      const normQuality = maxQuality > 0 ? (m.avg_quality_rating ?? 0) / maxQuality : 0
      const normSuccess = maxSuccess > 0 ? (m.success_rate ?? 0) / maxSuccess : 0
      const normCostEff = maxCost > 0 ? Math.max(0, 1 - (m.input_cost_per_mtok / maxCost)) : 0
      const normLatency = m.avg_latency_ms ? 1 - Math.min(m.avg_latency_ms / 5000, 1) : 0.5
      const score = 0.40 * normQuality + 0.30 * normSuccess + 0.20 * normCostEff + 0.10 * normLatency
      return { model: m, score }
    })

    // Re-rank only models with outcome data, preserve order of those without
    scored.sort((a, b) => {
      if (a.score >= 0 && b.score >= 0) return b.score - a.score
      if (a.score >= 0) return -1
      if (b.score >= 0) return 1
      return a.model.priority - b.model.priority
    })

    return scored.map(s => s.model)
  }

  return filtered
}

// ── Fallback Chain ──

export function buildFallbackChain(
  primary: ModelCandidate,
  allInTier: ModelCandidate[],
  maxFallbacks = 2
): Array<{ slug: string; provider: string; display_name: string }> {
  const fallbacks: Array<{ slug: string; provider: string; display_name: string }> = []
  const others = allInTier.filter(m => m.slug !== primary.slug)

  // Prefer different providers
  const diffProvider = others.filter(m => m.provider !== primary.provider)
  for (const m of diffProvider) {
    if (fallbacks.length >= maxFallbacks) break
    fallbacks.push({ slug: m.slug, provider: m.provider, display_name: m.display_name })
  }

  // Fill remaining from same provider if needed
  if (fallbacks.length < maxFallbacks) {
    const sameProvider = others.filter(m => m.provider === primary.provider)
    for (const m of sameProvider) {
      if (fallbacks.length >= maxFallbacks) break
      if (!fallbacks.some(f => f.slug === m.slug)) {
        fallbacks.push({ slug: m.slug, provider: m.provider, display_name: m.display_name })
      }
    }
  }

  return fallbacks
}

// ── Escalation Chain ──

const ESCALATION_MAP: Record<string, { tier: ModelTier; reason: string }> = {
  cheap_chat: { tier: 'cheap_structured', reason: 'If output format issues or quality too low' },
  cheap_structured: { tier: 'fast_code', reason: 'If quality insufficient or task needs code understanding' },
  fast_code: { tier: 'reasoning_pro', reason: 'If complex logic or multi-step planning needed' },
  creative_writing: { tier: 'reasoning_pro', reason: 'If writing needs deep analysis or multi-step reasoning' },
  reasoning_pro: { tier: 'best_available', reason: 'If highest quality needed or task too complex' },
  tool_agent: { tier: 'best_available', reason: 'If tool orchestration too complex' },
}

export function getEscalation(currentTier: ModelTier): { tier: ModelTier; reason: string } | null {
  return ESCALATION_MAP[currentTier] || null
}

// ── Confidence Scoring ──

export function calcModelConfidence(
  signals: TaskSignals,
  _tier: ModelTier,
  primaryModel: ModelCandidate
): number {
  // Base confidence from signal count
  const signalConfidence: Record<number, number> = {
    0: 0.55,
    1: 0.70,
    2: 0.80,
    3: 0.88,
    4: 0.93,
    5: 0.95,
  }
  let confidence = signalConfidence[signals.signal_count] ?? 0.55

  // Bonus for outcome data backing
  if (primaryModel.sample_size != null && primaryModel.sample_size >= 10) {
    confidence += 0.03
  }
  if (primaryModel.avg_quality_rating != null && primaryModel.avg_quality_rating >= 8.0) {
    confidence += 0.02
  }

  return Math.min(Math.round(confidence * 100) / 100, 0.97)
}

// ── Cost Estimation ──

const TIER_OUTPUT_ESTIMATES: Record<ModelTier, number> = {
  cheap_chat: 200,
  cheap_structured: 500,
  fast_code: 800,
  creative_writing: 1200,
  reasoning_pro: 1500,
  tool_agent: 1000,
  best_available: 2000,
}

export function estimateTaskCost(
  model: ModelCandidate,
  taskLength: number,
  tier: ModelTier
): { estimated_input_tokens: number; estimated_output_tokens: number; estimated_cost_usd: number } {
  const estimated_input_tokens = Math.max(Math.round(taskLength / 4), 500)
  const estimated_output_tokens = TIER_OUTPUT_ESTIMATES[tier] ?? 500

  const inputCost = (estimated_input_tokens * (model.input_cost_per_mtok || 0)) / 1_000_000
  const outputCost = (estimated_output_tokens * (model.output_cost_per_mtok || 0)) / 1_000_000
  const estimated_cost_usd = parseFloat((inputCost + outputCost).toFixed(6))

  return { estimated_input_tokens, estimated_output_tokens, estimated_cost_usd }
}

// ── Tier Descriptions (for GET guide) ──

export const TIER_DESCRIPTIONS: Record<ModelTier, { name: string; description: string; use_case: string }> = {
  cheap_chat: {
    name: 'Cheap Chat',
    description: 'Fastest, cheapest models for simple conversational tasks',
    use_case: 'Simple Q&A, summaries, rewrites, translations — no tools or structured output needed',
  },
  cheap_structured: {
    name: 'Cheap Structured',
    description: 'Low-cost models with reliable JSON/structured output support',
    use_case: 'Data extraction, form parsing, API response formatting, classification tasks',
  },
  fast_code: {
    name: 'Fast Code',
    description: 'High-quality code generation and editing models',
    use_case: 'Write functions, refactor code, fix bugs, generate tests, code review',
  },
  creative_writing: {
    name: 'Creative Writing',
    description: 'Premium models optimized for tone, persuasion, and nuanced writing',
    use_case: 'Cold outreach emails, marketing copy, blog posts, proposals, social posts — where voice and quality matter',
  },
  reasoning_pro: {
    name: 'Reasoning Pro',
    description: 'Models with strong multi-step reasoning and planning',
    use_case: 'Architecture design, complex analysis, strategy, research synthesis, long-form content',
  },
  tool_agent: {
    name: 'Tool Agent',
    description: 'Best models for tool calling and function execution',
    use_case: 'Agent workflows, MCP tool use, API orchestration, multi-tool chains',
  },
  best_available: {
    name: 'Best Available',
    description: 'Most capable models regardless of cost — top of the escalation chain',
    use_case: 'Mission-critical tasks, complex multi-signal work, highest quality needed',
  },
}

