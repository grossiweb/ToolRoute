// Tests for src/lib/task-cluster.ts — verifies the cluster derivation
// is deterministic, drops metadata, caps at top 2 active signals.

import { describe, it, expect } from 'vitest'
import { deriveTaskCluster } from '../src/lib/task-cluster'

describe('deriveTaskCluster', () => {
  it('returns bare tier when no signals fire', () => {
    expect(deriveTaskCluster('cheap_chat', {})).toBe('cheap_chat')
    expect(
      deriveTaskCluster('cheap_chat', {
        code_present: false,
        tools_needed: false,
      }),
    ).toBe('cheap_chat')
  })

  it('returns tier:signal when one signal is true', () => {
    expect(
      deriveTaskCluster('fast_code', { code_present: true }),
    ).toBe('fast_code:code_present')
  })

  it('returns tier:sig1+sig2 with alphabetical ordering', () => {
    // tools_needed comes after structured_output_needed alphabetically
    expect(
      deriveTaskCluster('best_available', {
        tools_needed: true,
        structured_output_needed: true,
      }),
    ).toBe('best_available:structured_output_needed+tools_needed')
  })

  it('caps at top 2 signals, alphabetical', () => {
    const result = deriveTaskCluster('best_available', {
      code_present: true,
      complex_reasoning: true,
      structured_output_needed: true,
      tools_needed: true,
    })
    // code_present, complex_reasoning come first alphabetically
    expect(result).toBe('best_available:code_present+complex_reasoning')
  })

  it('ignores numeric metadata like signal_count', () => {
    // Regression: prior version treated positive numbers as signals,
    // letting signal_count pollute the cluster string.
    expect(
      deriveTaskCluster('cheap_chat', {
        signal_count: 2,
        code_present: true,
        tools_needed: true,
      }),
    ).toBe('cheap_chat:code_present+tools_needed')
  })

  it('ignores null and undefined values', () => {
    expect(
      deriveTaskCluster('cheap_chat', {
        code_present: true,
        tools_needed: null,
        complex_reasoning: undefined,
      }),
    ).toBe('cheap_chat:code_present')
  })

  it('is deterministic regardless of insertion order', () => {
    const a = deriveTaskCluster('fast_code', {
      tools_needed: true,
      code_present: true,
    })
    const b = deriveTaskCluster('fast_code', {
      code_present: true,
      tools_needed: true,
    })
    expect(a).toBe(b)
  })
})
