// Tests for cost-aware routing: keyword-pattern tier overrides and the
// preferred_provider constraint. The patterns guard against the LLM
// classifier sending high-volume templated pipelines (SEO snippets,
// moderation checks, JSON synonym lists) to Opus at 100x the necessary cost.

import { describe, it, expect } from 'vitest'
import { detectCostAwareTier } from '../src/lib/task-classifier'
import { resolveTierToModel } from '../src/lib/routing/tiers'

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
