// Tests for src/lib/routing-memory.ts — the recursive intelligence
// lookup that surfaces an agent's historical outcomes for similar tasks.
//
// Hard guarantees verified here:
//   1. Any DB error → null (never throws).
//   2. sample_size < MIN_SAMPLES (3) → null.
//   3. Happy path returns historical_model, success_rate, sample_size,
//      avg_quality with the expected values.
//   4. Timeout: if the lookup exceeds timeoutMs, returns null and unblocks
//      the caller within reasonable time.
//   5. Empty agent or cluster id → null (input guards).
//
// The function makes exactly two Supabase queries — one to
// model_routing_decisions, one to model_outcome_records — so each stub
// supplies a canned response for each.

import { describe, it, expect } from 'vitest'
import { getRoutingMemory, getSkillRoutingMemory } from '../src/lib/routing-memory'

type CannedResponse = { data: any; error: any }

// Build a Supabase stub that returns `decisionsResp` when the
// model_routing_decisions table is queried, and `outcomesResp` for
// model_outcome_records. Chain methods (.select/.eq/.in/.order/.limit)
// all return `this`; awaiting the chain resolves to the canned response.
function makeSupabase(
  decisionsResp: CannedResponse,
  outcomesResp: CannedResponse,
): any {
  return {
    from(table: string) {
      const resp =
        table === 'model_routing_decisions' ? decisionsResp : outcomesResp
      const chain: any = {}
      const passthrough = ['select', 'eq', 'in', 'order', 'limit', 'not']
      for (const m of passthrough) chain[m] = () => chain
      chain.then = (resolve: any) => resolve(resp)
      return chain
    },
  }
}

// Stub that never resolves — used to exercise the timeout guard.
function makeHangingSupabase(): any {
  return {
    from() {
      const chain: any = {}
      const passthrough = ['select', 'eq', 'in', 'order', 'limit', 'not']
      for (const m of passthrough) chain[m] = () => chain
      chain.then = () => new Promise(() => {}) // pending forever
      return chain
    },
  }
}

const AGENT = 'agent-uuid-1'
const CLUSTER = 'fast_code:code_present'

describe('getRoutingMemory', () => {
  it('returns null on decisions query error', async () => {
    const sb = makeSupabase(
      { data: null, error: { message: 'boom' } },
      { data: [], error: null },
    )
    expect(await getRoutingMemory(sb, AGENT, CLUSTER)).toBeNull()
  })

  it('returns null on outcomes query error', async () => {
    const sb = makeSupabase(
      {
        data: [{ id: 'd1', recommended_model_id: 'm', created_at: 't1' }],
        error: null,
      },
      { data: null, error: { message: 'boom' } },
    )
    expect(await getRoutingMemory(sb, AGENT, CLUSTER)).toBeNull()
  })

  it('returns null when sample_size < 3 (MIN_SAMPLES)', async () => {
    const decisions = [
      {
        id: 'd1',
        recommended_model_id: 'haiku',
        created_at: '2026-05-20T10:00:00Z',
      },
      {
        id: 'd2',
        recommended_model_id: 'haiku',
        created_at: '2026-05-20T09:00:00Z',
      },
    ]
    const outcomes = [
      {
        routing_decision_id: 'd1',
        outcome_status: 'success',
        verified_quality: 8,
        computed_quality: null,
        output_quality_rating: null,
      },
      {
        routing_decision_id: 'd2',
        outcome_status: 'success',
        verified_quality: 7,
        computed_quality: null,
        output_quality_rating: null,
      },
    ]
    const sb = makeSupabase(
      { data: decisions, error: null },
      { data: outcomes, error: null },
    )
    expect(await getRoutingMemory(sb, AGENT, CLUSTER)).toBeNull()
  })

  it('returns correct fields when data exists', async () => {
    // 4 decisions, 4 outcomes — 3 successful, 1 failure. Most-recent
    // successful outcome (d1) used 'haiku' — that becomes historical_model.
    // Quality average: (8+7+9)/3 = 8.0 (failures contribute no quality).
    const decisions = [
      {
        id: 'd1',
        recommended_model_id: 'haiku',
        created_at: '2026-05-20T10:00:00Z',
      },
      {
        id: 'd2',
        recommended_model_id: 'haiku',
        created_at: '2026-05-20T09:00:00Z',
      },
      {
        id: 'd3',
        recommended_model_id: 'sonnet',
        created_at: '2026-05-20T08:00:00Z',
      },
      {
        id: 'd4',
        recommended_model_id: 'haiku',
        created_at: '2026-05-20T07:00:00Z',
      },
    ]
    const outcomes = [
      {
        routing_decision_id: 'd1',
        outcome_status: 'success',
        verified_quality: 8,
        computed_quality: null,
        output_quality_rating: null,
      },
      {
        routing_decision_id: 'd2',
        outcome_status: 'success',
        verified_quality: 7,
        computed_quality: null,
        output_quality_rating: null,
      },
      {
        routing_decision_id: 'd3',
        outcome_status: 'failure',
        verified_quality: null,
        computed_quality: null,
        output_quality_rating: null,
      },
      {
        routing_decision_id: 'd4',
        outcome_status: 'partial_success',
        verified_quality: 9,
        computed_quality: null,
        output_quality_rating: null,
      },
    ]
    const sb = makeSupabase(
      { data: decisions, error: null },
      { data: outcomes, error: null },
    )
    const memory = await getRoutingMemory(sb, AGENT, CLUSTER, 4)
    expect(memory).not.toBeNull()
    expect(memory!.sample_size).toBe(4)
    expect(memory!.success_rate).toBe(0.75) // 3 of 4 ok
    expect(memory!.historical_model).toBe('haiku') // most-recent successful
    expect(memory!.avg_quality).toBeCloseTo(8.0, 1) // (8+7+9)/3
  })

  it('returns null and unblocks when the lookup exceeds the timeout', async () => {
    const sb = makeHangingSupabase()
    const start = Date.now()
    const memory = await getRoutingMemory(sb, AGENT, CLUSTER, 5, 50)
    const elapsed = Date.now() - start
    expect(memory).toBeNull()
    // Should resolve close to 50ms — allow generous headroom for CI jitter.
    expect(elapsed).toBeLessThan(500)
  })

  it('returns null when agentIdentityId or taskCluster is missing', async () => {
    const sb = makeSupabase(
      { data: [], error: null },
      { data: [], error: null },
    )
    expect(await getRoutingMemory(sb, '', CLUSTER)).toBeNull()
    expect(await getRoutingMemory(sb, AGENT, '')).toBeNull()
  })
})

// ── getSkillRoutingMemory ──────────────────────────────────────────────────
// Mirrors the model-side specs above. Two queries: skill_routing_decisions
// followed by outcome_records.

function makeSkillSupabase(
  decisionsResp: CannedResponse,
  outcomesResp: CannedResponse,
): any {
  return {
    from(table: string) {
      const resp =
        table === 'skill_routing_decisions' ? decisionsResp : outcomesResp
      const chain: any = {}
      const passthrough = ['select', 'eq', 'in', 'order', 'limit', 'not']
      for (const m of passthrough) chain[m] = () => chain
      chain.then = (resolve: any) => resolve(resp)
      return chain
    },
  }
}

describe('getSkillRoutingMemory', () => {
  it('returns null on decisions query error', async () => {
    const sb = makeSkillSupabase(
      { data: null, error: { message: 'boom' } },
      { data: [], error: null },
    )
    expect(await getSkillRoutingMemory(sb, AGENT, CLUSTER)).toBeNull()
  })

  it('returns null on outcomes query error', async () => {
    const sb = makeSkillSupabase(
      {
        data: [{
          recommended_skill_id: 'sk-1',
          recommended_skill_slug: 'firecrawl-mcp',
          created_at: 't1',
        }],
        error: null,
      },
      { data: null, error: { message: 'boom' } },
    )
    expect(await getSkillRoutingMemory(sb, AGENT, CLUSTER)).toBeNull()
  })

  it('returns null when sample_size < 3 (MIN_SAMPLES)', async () => {
    const decisions = [
      {
        recommended_skill_id: 'sk-firecrawl',
        recommended_skill_slug: 'firecrawl-mcp',
        created_at: '2026-05-20T10:00:00Z',
      },
    ]
    const outcomes = [
      {
        skill_id: 'sk-firecrawl',
        outcome_status: 'success',
        verified_quality: 8,
        computed_quality: null,
        output_quality_rating: null,
        created_at: '2026-05-20T10:05:00Z',
      },
      {
        skill_id: 'sk-firecrawl',
        outcome_status: 'success',
        verified_quality: 7,
        computed_quality: null,
        output_quality_rating: null,
        created_at: '2026-05-20T09:05:00Z',
      },
    ]
    const sb = makeSkillSupabase(
      { data: decisions, error: null },
      { data: outcomes, error: null },
    )
    expect(await getSkillRoutingMemory(sb, AGENT, CLUSTER)).toBeNull()
  })

  it('returns correct fields when data exists', async () => {
    // 2 distinct skills considered, 4 outcomes total (3 ok, 1 failure).
    // Most-recent successful outcome is on sk-firecrawl → historical_skill
    // resolves to 'firecrawl-mcp' via the decisions skill→slug map.
    const decisions = [
      {
        recommended_skill_id: 'sk-firecrawl',
        recommended_skill_slug: 'firecrawl-mcp',
        created_at: '2026-05-20T10:00:00Z',
      },
      {
        recommended_skill_id: 'sk-exa',
        recommended_skill_slug: 'exa-mcp-server',
        created_at: '2026-05-20T09:00:00Z',
      },
      {
        recommended_skill_id: 'sk-firecrawl',
        recommended_skill_slug: 'firecrawl-mcp',
        created_at: '2026-05-20T08:00:00Z',
      },
    ]
    const outcomes = [
      {
        skill_id: 'sk-firecrawl',
        outcome_status: 'success',
        verified_quality: 8,
        computed_quality: null,
        output_quality_rating: null,
        created_at: '2026-05-20T10:05:00Z',
      },
      {
        skill_id: 'sk-firecrawl',
        outcome_status: 'partial_success',
        verified_quality: 7,
        computed_quality: null,
        output_quality_rating: null,
        created_at: '2026-05-20T09:30:00Z',
      },
      {
        skill_id: 'sk-exa',
        outcome_status: 'failure',
        verified_quality: null,
        computed_quality: null,
        output_quality_rating: null,
        created_at: '2026-05-20T09:10:00Z',
      },
      {
        skill_id: 'sk-firecrawl',
        outcome_status: 'success',
        verified_quality: 9,
        computed_quality: null,
        output_quality_rating: null,
        created_at: '2026-05-20T08:30:00Z',
      },
    ]
    const sb = makeSkillSupabase(
      { data: decisions, error: null },
      { data: outcomes, error: null },
    )
    const memory = await getSkillRoutingMemory(sb, AGENT, CLUSTER, 4)
    expect(memory).not.toBeNull()
    expect(memory!.sample_size).toBe(4)
    expect(memory!.success_rate).toBe(0.75) // 3 of 4 ok
    expect(memory!.historical_skill).toBe('firecrawl-mcp')
    expect(memory!.avg_quality).toBeCloseTo(8.0, 1) // (8+7+9)/3
  })

  it('returns null and unblocks when the lookup exceeds the timeout', async () => {
    const sb = makeHangingSupabase()
    const start = Date.now()
    const memory = await getSkillRoutingMemory(sb, AGENT, CLUSTER, 5, 50)
    const elapsed = Date.now() - start
    expect(memory).toBeNull()
    expect(elapsed).toBeLessThan(500)
  })
})
