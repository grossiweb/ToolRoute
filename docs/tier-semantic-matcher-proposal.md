# Tier-Path Semantic Matcher — Proposal (Priority 7 follow-on)

> **OUTCOME: APPROACH DOES NOT WORK — halted after seeding + embedding (2026-06-14).**
> The 35 seeds embedded cleanly (35/35), but tier self-consistency is far too low to
> ship: nearest-neighbor same-tier **54.3%**, and — critically — among matches that
> clear the 0.70 confidence gate (only 6 of 35), accuracy is **50%** (coin flip).
> top-3 majority vote is **65.7%**. Root cause: **embeddings encode topic/semantics,
> not task difficulty.** The skill matcher hit 100% because skills are topically
> distinct (refund ≠ deploy ≠ scrape); model tiers are cross-topic *difficulty bands*,
> so `reasoning_pro` ("analyze the architectural tradeoffs") and `best_available`
> ("complete architecture + implementation plan with tradeoff analysis") sit on top of
> each other (cosine 0.78, wrong tier, above the gate). The matcher lib + `/api/route/model`
> wire-in (steps 4-5) were **NOT built**.
>
> **Decision:** the LLM classifier (`classificationToModelTier`, already improved in
> Priority 7 #3) is the correct tier decider — it reasons about task_type + complexity,
> which is what tiers actually encode. Embeddings add no value here. The `plan` residual
> is better addressed by the LLM classifier's complexity detection than by a vector match.
> `tier_examples` (migration 072) + `match_tier_examples` are left inert (no runtime
> consumer); drop via a follow-up migration if we want to reclaim them.
>
> The proposal below is retained as the design that was tested and the evidence against it.

---

**Status:** Tier 1 investigation + proposal. SUPERSEDED by the outcome above.
**Date:** 2026-06-14. Mirrors the skill matcher (migrations 062/063, `task-matcher.ts`).

---

## 1. Current tier output + where semantic injects

`resolveModelTier(signals, task)` (model-routing.ts) emits 7 tiers:
`cheap_chat, cheap_structured, fast_code, creative_writing, tool_agent, reasoning_pro, best_available`.

Two consumers:
- **`/api/route/model`** (model-route.ts:114) — **purely heuristic**: `detectTaskSignals → resolveModelTier → detectCostAwareTier override`. **Primary integration target** (biggest win; no LLM step today).
- **`/api/route`** (route.ts:671-687) — LLM `classificationToModelTier` when classifier is up, heuristic on fallback, then `detectCostAwareTier`. Tier only used when `approach==='direct_llm'`.

**Injection point:** a new async `matchTier(query)` (network embed) runs **as primary, before the heuristic**, exactly as `matchTask` is primary on the skill path. It cannot live *inside* the sync `resolveModelTier`; it sits in the handler:

```
tierSemantic = await matchTier(query)            // confident? -> use it
baseTier = tierSemantic ?? resolveModelTier(...)  // else heuristic fallback
tier = detectCostAwareTier(query) ?? baseTier     // cost-aware guard stays FINAL override
```

Precedence rationale: semantic replaces the brittle *signal-keyword guess*; `detectCostAwareTier` (explicit SEO/moderation cost guards) stays the final word; the heuristic's explicit `BEST_AVAILABLE_KEYWORDS` ("best possible model") are captured as best_available seed examples so semantic reproduces them.

## 2. Schema — migration 072 (new, mirrors `tasks`)

```sql
CREATE TABLE tier_examples (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier          text NOT NULL,           -- one of the 7 ClassifierTier values
  example_query text NOT NULL,
  embedding     vector(1536),            -- OpenRouter gemini-embedding-001 @1536
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tier_examples_embedding_cosine_idx
  ON tier_examples USING hnsw (embedding vector_cosine_ops);

-- RPC mirrors match_tasks: nearest examples by cosine, returns their tier + score
CREATE OR REPLACE FUNCTION match_tier_examples(query_embedding vector, match_count integer DEFAULT 5)
RETURNS TABLE(tier text, example_query text, score double precision)
LANGUAGE sql STABLE AS $$
  SELECT te.tier, te.example_query, 1 - (te.embedding <=> query_embedding) AS score
  FROM tier_examples te
  WHERE te.embedding IS NOT NULL
  ORDER BY te.embedding <=> query_embedding
  LIMIT match_count;
$$;
```

Seeding: migration inserts the 35 rows (text only); embeddings populated via a temp
reseed route (same pattern as the skill-task reseed — embed `example_query`, write
the vector), removed after. No new billing (same embedding model).

## 3. Example set — 35 queries (5 × 7), distinct + representative

Two deliberate anchors teach the `plan` intent split that keywords can't (the
Priority 7 residual): "plan a birthday party" → cheap_chat vs "plan the system
architecture" → reasoning_pro.

**cheap_chat** — simple Q&A / factual / translation / trivial
- what is the capital of France
- translate hello to Spanish
- summarize this paragraph in one sentence
- what time zone is Tokyo in
- plan a birthday party for my kid

**cheap_structured** — extraction / classification / parsing / typed output
- extract the fields from this JSON
- classify these support tickets as bug or feature
- parse this CSV and return the column names
- convert this text into a JSON object with name and email
- label each row as spam or not spam

**fast_code** — write / refactor / debug / test code
- write a boilerplate Express REST API
- refactor this Python function to be more readable
- fix the bug in this TypeScript code
- write unit tests for this module
- implement a binary search in Go

**creative_writing** — persuasive / marketing / creative formats
- write a limerick about coffee
- write a cold outreach email to a potential client
- write marketing copy for our new landing page
- draft a compelling product announcement
- write a short story about a lighthouse keeper

**tool_agent** — needs external tools / web / api / mcp
- search the web for competitor pricing
- use tools to fetch and summarize this URL
- orchestrate API calls to sync two systems
- scrape this site and store the results in a database
- use MCP tools to query our analytics

**reasoning_pro** — single-domain deep analysis / architecture / strategy
- analyze the architectural tradeoffs of this system design
- develop a go-to-market strategy for our new product
- diagnose the root cause of this memory leak
- compare the pros and cons of microservices versus a monolith
- plan the system architecture for a payments service

**best_available** — exhaustive / end-to-end / premium / multi-faceted
- write an exhaustive end-to-end technical specification
- produce a comprehensive technical whitepaper on our architecture
- use the best possible model for a full security audit and remediation plan
- write a complete architecture and implementation plan with tradeoff analysis
- deliver an in-depth multi-section market analysis with financial modeling

## 4. Matcher lib (`src/lib/tier-matcher.ts`, new — mirrors task-matcher.ts)

- `embedQuery` — identical to task-matcher (OpenRouter, 1536, 4s timeout, body-on-error log).
- `matchTier(supabase, query)`:
  - embed → `match_tier_examples(embedding, 5)`
  - **confidence gate** `top.score >= 0.70` (mirror), else `null` (defer to heuristic)
  - **ambiguity guard**: if top-1 and top-2 are *different tiers* within 0.05, return `null` (defer) — prevents forcing a tier on genuinely borderline queries
  - optional robustness: if top-3 majority agrees on a tier, prefer it over a razor-thin top-1
  - returns `{ tier, score } | null`; never throws (all failures → null → heuristic)

## 5. CRS / measurement plan

The v2 battery (`tests/routing-benchmark-v2.md`) measures **recommended_skill**, not
tier — so it can't score this directly. Plan:
1. Build a **tier-labeled eval set** (separate from the 35 seeds — seeds must be
   held out to avoid trivial self-match): the Priority 7 probes (Q4 false-positives,
   positives, plan-residual cases) which already have expected tiers, + paraphrases
   of each tier (~3-4 per tier) worded *differently* from the seeds.
2. Measure **tier accuracy = correct / total** against `/api/route/model`:
   - **Before** (heuristic only, current `18b5f22`)
   - **After** (semantic primary + heuristic fallback)
3. Headline checks: "plan a birthday party" cheap_chat (was reasoning_pro) AND
   "plan the system architecture" reasoning_pro (NOT regressed to cheap) — the exact
   pair keywords cannot separate.
4. Re-run the Priority 7 Q4 + positive probes to confirm no regression; confirm
   `detectCostAwareTier` guards still fire (SEO/moderation → cheap).
5. Add the eval set as a new **Section 12 (tier routing)** in v2 so it's reproducible.

## Open decisions (for approval before any code)
1. **Phasing:** ship matcher + table + integrate **`/api/route/model` first**, measure, then `/api/route`? (Recommended — bounded blast radius.)
2. **Confidence threshold:** start at 0.70 (mirror skill matcher) and tune from the eval set, or calibrate first?
3. **Precedence:** confirm `detectCostAwareTier` stays the final override above semantic (recommended), and explicit "best possible model" relies on best_available seeds rather than a retained keyword pre-empt.
4. **Ambiguity behavior:** defer to heuristic on different-tier ties within 0.05 (recommended) vs always take top-1.
