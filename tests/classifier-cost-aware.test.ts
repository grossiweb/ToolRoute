// Tests for cost-aware routing: keyword-pattern tier overrides and the
// preferred_provider constraint. The patterns guard against the LLM
// classifier sending high-volume templated pipelines (SEO snippets,
// moderation checks, JSON synonym lists) to Opus at 100x the necessary cost.

import { describe, it, expect, vi } from 'vitest'
import { detectCostAwareTier } from '../src/lib/task-classifier'
import { resolveTierToModel } from '../src/lib/routing/tiers'
import { detectTaskSignals, resolveModelTier } from '../src/lib/model-routing'

// End-to-end tier resolution: signal detection + cost-aware override.
// Mirrors the order in /api/route/model: signals first, override last.
function resolveTier(task: string): string {
  const costAware = detectCostAwareTier(task)
  if (costAware) return costAware
  return resolveModelTier(detectTaskSignals(task), task)
}

// ── Mock Supabase server client BEFORE importing the route handler ──────────
// The handler runs three real Supabase calls we need to satisfy:
//   1. from('models').select(...).in(...).eq(...).is(...)  — returns model rows
//   2. rpc('get_model_outcome_stats', ...).maybeSingle()   — returns null (RPC may not exist)
//   3. from('model_routing_decisions').insert(...)         — fire-and-forget
//   4. from('agent_identities').select(...).eq(...).maybeSingle() — only when agent_identity_id passed
// All queries here resolve to the canned data below; no network or DB hit.

const MOCK_ANTHROPIC_MODELS = [
  { id: 'claude-haiku-4-5-20251001', provider: 'anthropic', display_name: 'Claude Haiku 4.5', tier: 'budget', input_price_per_m: 1.0, output_price_per_m: 5.0, context_window: 200000, supports_tool_use: true, supports_vision: true, supports_reasoning: true, deprecated_at: null, is_routable: true },
  { id: 'claude-sonnet-4-6',         provider: 'anthropic', display_name: 'Claude Sonnet 4.6', tier: 'mid',    input_price_per_m: 3.0, output_price_per_m: 15.0, context_window: 1000000, supports_tool_use: true, supports_vision: true, supports_reasoning: true, deprecated_at: null, is_routable: true },
  { id: 'claude-opus-4-6',           provider: 'anthropic', display_name: 'Claude Opus 4.6',   tier: 'flagship', input_price_per_m: 5.0, output_price_per_m: 25.0, context_window: 1000000, supports_tool_use: true, supports_vision: true, supports_reasoning: true, deprecated_at: null, is_routable: true },
  { id: 'claude-opus-4-7',           provider: 'anthropic', display_name: 'Claude Opus 4.7',   tier: 'flagship', input_price_per_m: 5.0, output_price_per_m: 25.0, context_window: 1000000, supports_tool_use: true, supports_vision: true, supports_reasoning: true, deprecated_at: null, is_routable: true },
]

function makeChainable(data: any) {
  const obj: any = {}
  const passthrough = ['select', 'in', 'eq', 'is', 'order', 'limit', 'not']
  for (const m of passthrough) obj[m] = () => obj
  obj.maybeSingle = () => Promise.resolve({ data: null, error: null })
  obj.single = () => Promise.resolve({ data: null, error: null })
  obj.then = (resolve: any, reject?: any) =>
    Promise.resolve({ data, error: null }).then(resolve, reject)
  return obj
}

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: () => ({
    from: (table: string) => {
      if (table === 'models') return makeChainable(MOCK_ANTHROPIC_MODELS)
      if (table === 'model_routing_decisions') {
        return { insert: () => ({ then: (cb: any) => { cb({}); return Promise.resolve() } }) }
      }
      return makeChainable([])
    },
    rpc: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
  }),
}))

describe('detectCostAwareTier', () => {
  it('"write SEO fun facts for a coloring page" → cheap_structured', () => {
    expect(detectCostAwareTier('write SEO fun facts for a coloring page')).toBe('cheap_structured')
  })

  it('SEO meta description → cheap_structured', () => {
    expect(detectCostAwareTier('generate a meta description for this product page')).toBe('cheap_structured')
  })

  it('"check if this image prompt is safe for kids" → cheap_chat', () => {
    expect(detectCostAwareTier('check if this image prompt is safe for kids')).toBe('cheap_chat')
  })

  it('binary moderation check → cheap_chat', () => {
    expect(detectCostAwareTier('moderation check on user comment')).toBe('cheap_chat')
  })

  it('"generate JSON array of synonyms" → cheap_structured', () => {
    expect(detectCostAwareTier('generate JSON array of synonyms')).toBe('cheap_structured')
  })

  it('high-volume templated work → cheap_structured', () => {
    expect(detectCostAwareTier('high volume templated meta title generation')).toBe('cheap_structured')
  })

  it('returns null for tasks that do not match', () => {
    expect(detectCostAwareTier('write a comprehensive analysis of quantum computing')).toBe(null)
    expect(detectCostAwareTier('debug this Python function')).toBe(null)
  })

  it('returns null for empty input', () => {
    expect(detectCostAwareTier('')).toBe(null)
  })
})

describe('resolveTierToModel with preferred_provider="anthropic"', () => {
  it('cheap_structured → claude-haiku-4-5-20251001', () => {
    const r = resolveTierToModel('cheap_structured', 'standard', 'anthropic')
    expect(r.primary).toBe('claude-haiku-4-5-20251001')
  })

  it('cheap_chat → claude-haiku-4-5-20251001', () => {
    const r = resolveTierToModel('cheap_chat', 'standard', 'anthropic')
    expect(r.primary).toBe('claude-haiku-4-5-20251001')
  })

  it('fast_code → claude-sonnet-4-6', () => {
    const r = resolveTierToModel('fast_code', 'standard', 'anthropic')
    expect(r.primary).toBe('claude-sonnet-4-6')
  })

  it('tool_agent → claude-sonnet-4-6', () => {
    const r = resolveTierToModel('tool_agent', 'standard', 'anthropic')
    expect(r.primary).toBe('claude-sonnet-4-6')
  })

  it('creative_writing → claude-sonnet-4-6 (NOT Opus)', () => {
    const r = resolveTierToModel('creative_writing', 'standard', 'anthropic')
    expect(r.primary).toBe('claude-sonnet-4-6')
    expect(r.primary).not.toContain('opus')
  })

  it('reasoning_pro → claude-opus-4-6', () => {
    const r = resolveTierToModel('reasoning_pro', 'standard', 'anthropic')
    expect(r.primary).toBe('claude-opus-4-6')
  })

  it('best_available → claude-opus-4-7', () => {
    const r = resolveTierToModel('best_available', 'standard', 'anthropic')
    expect(r.primary).toBe('claude-opus-4-7')
  })

  it('all resolved primaries start with "claude-"', () => {
    const tiers = ['cheap_chat', 'cheap_structured', 'fast_code', 'creative_writing', 'reasoning_pro', 'tool_agent', 'best_available'] as const
    for (const t of tiers) {
      const r = resolveTierToModel(t, 'standard', 'anthropic')
      expect(r.primary.startsWith('claude-'), `${t} resolved to ${r.primary}`).toBe(true)
      for (const fb of r.fallbacks) {
        expect(fb.startsWith('claude-'), `${t} fallback ${fb} not anthropic`).toBe(true)
      }
    }
  })

  it('preferred_provider override takes precedence over routing profile', () => {
    // unregulated profile normally sends cheap_chat to DeepSeek;
    // anthropic constraint should still force Haiku
    const r = resolveTierToModel('cheap_chat', 'unregulated', 'anthropic')
    expect(r.primary).toBe('claude-haiku-4-5-20251001')
  })

  it('unknown preferred_provider falls back to profile default', () => {
    const r = resolveTierToModel('cheap_chat', 'standard', 'fictional-provider')
    expect(r.primary).toBe('gemini-2.5-flash-lite') // standard profile default
  })

  it('no preferred_provider uses profile default', () => {
    const r = resolveTierToModel('cheap_chat', 'standard')
    expect(r.primary).toBe('gemini-2.5-flash-lite')
  })
})

// ── available_providers filter ──────────────────────────────────────────────
describe('resolveTierToModel with available_providers filter', () => {
  it('available_providers=["anthropic"] on cheap_structured walks chain to claude-haiku', () => {
    // standard cheap_structured = { primary: gemini-2.5-flash, fallbacks: [claude-haiku-..., gpt-5-nano] }
    // Filter to anthropic → claude-haiku becomes new primary
    const r = resolveTierToModel('cheap_structured', 'standard', undefined, ['anthropic'])
    expect(r.primary).toBe('claude-haiku-4-5-20251001')
  })

  it('available_providers=["google"] on cheap_chat keeps gemini primary', () => {
    const r = resolveTierToModel('cheap_chat', 'standard', undefined, ['google'])
    expect(r.primary).toBe('gemini-2.5-flash-lite')
  })

  it('available_providers=["anthropic"] on cheap_chat (no anthropic in chain) falls back to original', () => {
    // standard cheap_chat chain has no anthropic models → returns original (gemini)
    // Deliberate design: route to something rather than 404.
    const r = resolveTierToModel('cheap_chat', 'standard', undefined, ['anthropic'])
    expect(r.primary).toBe('gemini-2.5-flash-lite')
  })

  it('empty available_providers array = no filter applied', () => {
    const r = resolveTierToModel('cheap_chat', 'standard', undefined, [])
    expect(r.primary).toBe('gemini-2.5-flash-lite')
  })

  it('available_providers stacks with preferred_provider: explicit anthropic override wins', () => {
    // preferred_provider=anthropic forces ANTHROPIC_ONLY_MAP; available_providers redundant
    const r = resolveTierToModel('cheap_chat', 'standard', 'anthropic', ['anthropic'])
    expect(r.primary).toBe('claude-haiku-4-5-20251001')
  })

  it('multi-provider whitelist works', () => {
    // ['google', 'anthropic'] on cheap_structured — google is primary, both allowed → keep gemini
    const r = resolveTierToModel('cheap_structured', 'standard', undefined, ['google', 'anthropic'])
    expect(r.primary).toBe('gemini-2.5-flash')
  })
})

// ── Integration test: handler with preferred_provider=anthropic ─────────────
// Mocks Supabase (above) and calls the POST handler directly. Verifies the
// constraint propagates end-to-end: input task → tier resolution → model
// fetch → response. Asserts the returned model is Claude.

// ── End-to-end tier resolution (signal + cost-aware override) ──────────────
// Regression tests for the substring bug where "class" in code_present matched
// "classification" via String.includes(), routing moderation tasks to fast_code.

describe('resolveTier — moderation vs code disambiguation', () => {
  it('"binary safe/unsafe classification" → cheap_chat', () => {
    expect(resolveTier('binary safe/unsafe classification')).toBe('cheap_chat')
  })

  it('"content moderation check" → cheap_chat', () => {
    expect(resolveTier('content moderation check')).toBe('cheap_chat')
  })

  it('"classify this code" → fast_code (still works)', () => {
    expect(resolveTier('classify this code')).toBe('fast_code')
  })

  it('"binary search algorithm" → fast_code (still works)', () => {
    expect(resolveTier('binary search algorithm')).toBe('fast_code')
  })

  it('"is this user comment appropriate" → cheap_chat (moderation)', () => {
    expect(resolveTier('is this user comment appropriate for our forum')).toBe('cheap_chat')
  })

  it('"implement a Java class" → fast_code (code task still detected)', () => {
    expect(resolveTier('implement a Java class for date parsing')).toBe('fast_code')
  })

  it('"important meeting recap" → cheap_chat (no longer false-positives on "import")', () => {
    // Before the fix: 'import' substring matched 'important' → code_present true → fast_code
    const tier = resolveTier('write a recap of the important meeting decisions')
    expect(tier).not.toBe('fast_code')
  })
})

describe('/api/route/model handler with preferred_provider=anthropic', () => {
  it('returns a claude- model for a cheap_chat task', async () => {
    const { POST } = await import('../src/app/api/route/model/route')

    const req = new Request('https://test.local/api/route/model', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task: 'translate hello to spanish',
        constraints: { preferred_provider: 'anthropic' },
      }),
    })

    const res = await POST(req as any)
    expect(res.status).toBe(200)
    const data = await res.json()

    expect(data.model_details).toBeTruthy()
    expect(data.model_details.slug).toMatch(/^claude-/)
    expect(data.model_details.provider).toBe('anthropic')
  })

  it('returns Sonnet (not Opus) for creative_writing tier under anthropic constraint', async () => {
    const { POST } = await import('../src/app/api/route/model/route')

    const req = new Request('https://test.local/api/route/model', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task: 'write a compelling cold email pitch for an executive',
        constraints: { preferred_provider: 'anthropic' },
      }),
    })

    const res = await POST(req as any)
    expect(res.status).toBe(200)
    const data = await res.json()

    expect(data.model_details.slug).toMatch(/^claude-/)
    // Anthropic-only map deliberately routes creative_writing to Sonnet, not Opus
    expect(data.model_details.slug).not.toMatch(/opus/)
  })
})
