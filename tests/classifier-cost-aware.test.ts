// Tests for cost-aware routing: keyword-pattern tier overrides and the
// preferred_provider constraint. The patterns guard against the LLM
// classifier sending high-volume templated pipelines (SEO snippets,
// moderation checks, JSON synonym lists) to Opus at 100x the necessary cost.

import { describe, it, expect, vi } from 'vitest'
import { detectCostAwareTier } from '../src/lib/task-classifier'
import { resolveTierToModel } from '../src/lib/routing/tiers'

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

// ── Integration test: handler with preferred_provider=anthropic ─────────────
// Mocks Supabase (above) and calls the POST handler directly. Verifies the
// constraint propagates end-to-end: input task → tier resolution → model
// fetch → response. Asserts the returned model is Claude.

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
