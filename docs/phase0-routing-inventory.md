# Phase 0 — Routing mechanism inventory (read-only)

**Status: findings only. Nothing changed.** Date 2026-06-08. Input to the Phase 2 semantic-matcher design.

## TL;DR — three findings that change the design

1. **The curated task layer is dead code.** `tasks` (55 rows, all with `example_query`), `skill_tasks`
   (380 priors) and `example_query` are referenced by **zero** live code paths (grep of `src/**`).
   Live skill routing uses **21 hard-coded workflows** + the `skill_workflows` junction (176 rows),
   ranked by **global `skill_scores.value_score`** — never by `skill_tasks.relevance_score`. The
   design's premise ("good priors, bad matcher") is half-right: the priors aren't just bypassed for
   one query, they're not wired into routing **at all**.
2. **The LLM classifier and the semantic matcher are both OFF in prod right now.** The live trace of
   the failing query shows `classification.method = "keyword_fallback"` ("LLM unavailable") and
   `match_method = "keyword"`. So `/api/route` is running on the crude keyword map, not Gemini and
   not embeddings. (Likely `OPENROUTER_API_KEY` / `OPENAI_API_KEY` not reaching these calls in prod —
   verify the Vercel env.)
3. **`/api/route` and `/api/route/model` do NOT share a classifier.** The skill endpoint uses
   `classifyTask` (Gemini); the model endpoint uses the heuristic `detectTaskSignals`/`resolveModelTier`.
   "They share the classifier" (design doc) is not true today.

---

## Q1 — Skill path: how a query becomes a "task"

It doesn't become a task. There is **no task-level matching**. The query is resolved to one of **21
hard-coded workflows**, then skills are pulled from the `skill_workflows` junction and ranked by a
**global** score. Field matched against: in-code keyword/description strings — **not**
`tasks.name/slug/description/example_query`.

Resolution order (`src/app/api/route/route.ts:206-254`), first that succeeds wins:

| # | Mechanism | Source matched | Gate | Live status |
|---|---|---|---|---|
| 1 | `explicit workflow_slug` | caller-supplied | provided | — |
| 2 | **LLM** `classifyTask` (Gemini Flash Lite) | `tool_category` → `toolCategoryToWorkflow()` | `method==='llm'` | **OFF (keyword_fallback)** |
| 3 | **Semantic** `semanticMatchWorkflow` | embeddings over 21 in-code `WORKFLOW_DESCRIPTIONS` (`embeddings.ts`) | `similarity > 0.3` | **OFF (no OPENAI_API_KEY)** |
| 4 | **Keyword** `matchWorkflowFromTask` | `TASK_WORKFLOW_MAP` (21 workflows × keyword lists, `matching.ts`) | always | **active fallback** |

Keyword scoring (`matching.ts:148`): for each workflow, `score += keyword.length` for every keyword
that is a **substring** of the lowercased query; highest score wins, else `'general'`.

Candidate fetch + ranking (`route.ts:263-407`):
- `workflows` (by slug) → `skill_workflows` (by `workflow_id`) → `skills` (active, scored).
- Filter by `trust_floor`, `max_cost_usd`.
- **Sort by `skill_scores.value_score`** (default `best_value`; or `output/efficiency/cost/trust/reliability`
  per `priority`), plus a `+0.5` personalization boost for skills the agent reported success on.
- `_preferredSkill` promotion: if the LLM returned a `tool_category` in `TOOL_CATEGORY_SKILL_PREFERENCE`
  (e.g. `web_fetch→firecrawl-mcp`) **and** that skill is already in the candidate set, it's promoted to top.
- `skill_tasks.relevance_score` is **not consulted anywhere**.

> This is the "Google-Calendar-wins-everything" failure mode generalized: within a workflow bucket the
> globally highest `value_score` skill wins regardless of task fit.

## Q2 — Tier path: classification end to end

**Two separate classifiers — not shared.**

**`/api/route/model` (model/tier) — heuristic only** (`route/model/route.ts:110-137`):
1. `detectTaskSignals(task)` → 5 boolean signals via keyword/substring match (`tools_needed`,
   `structured_output_needed`, `code_present` [word-boundary, to avoid "class"⊂"classification"],
   `complex_reasoning`, `creative_writing`).
2. `resolveModelTier(signals, task)` → first-match: `best_available` (if `BEST_AVAILABLE_KEYWORDS` or
   `tools_needed && complex_reasoning`) → `tool_agent` → `reasoning_pro` → `creative_writing` →
   `fast_code` → `cheap_structured` → else `cheap_chat`.
3. `detectCostAwareTier(task)` override (SEO/moderation/synonym/bulk patterns) takes precedence.
4. `resolveTierToModel(tier, profile, preferred_provider)` → `TIER_MAP` (`routing/tiers.ts`) → fetch IDs
   from `models`. **`classifyTask` (Gemini) is never called here.**

**`/api/route` (skill) — LLM** (`classifyTask`, `task-classifier.ts`): `google/gemini-2.0-flash-lite-001`
via OpenRouter, `temperature 0`. Emits:
- `task_type` ∈ {code, writing, creative_writing, analysis, structured, translation, general} (7)
- `complexity` ∈ {simple, medium, complex}
- `needs_external_tool` (bool), `tool_category` (14: web_search, web_fetch, calculation, email,
  messaging, database, calendar, deployment, code_repo, ticketing, crm, cms, security_scan, null),
  `is_multi_tool`, `tool_categories[]`.
- `classificationToModelTier(c, priority)` maps `task_type`+`priority` → ClassifierTier.

**Tiers (7):** cheap_chat, cheap_structured, fast_code, creative_writing, reasoning_pro, tool_agent,
best_available. Profiles: standard / unregulated / regulated, + Anthropic-only override map.

**Heuristic "fallback":** `detectTaskSignals`/`resolveModelTier` is the **primary** classifier for the
model endpoint (not a fallback). The fallback inside `classifyTask` is `keywordFallback()`.

**When the LLM fallback fires** (`task-classifier.ts:113-167`): `!OPENROUTER_API_KEY` **or** fetch
`!res.ok` **or** JSON parse throws → `keywordFallback()` (returns `method:'keyword_fallback'`).
**It is firing in prod now** (see Q4).

## Q3 — Fallbacks when nothing resolves cleanly

- **Skill side:** if `resolvedWorkflow` is `''`/`'general'`, or the workflow slug isn't a row in
  `workflows`, or it has no `skill_workflows` rows → `candidates` stays empty → **top-50 unfiltered
  skills by `value_score`** (`route.ts:303-314`, `.limit(50)`). Winner = globally highest `value_score`
  skill, task-agnostic. **`'general'` is not a real workflow row** (confirmed absent), so every
  `'general'` resolution hits this trap.
- **Tier side:** `resolveModelTier` defaults to `cheap_chat` when `signal_count===0`. `resolveTierToModel`
  only throws on unknown tier/profile; `available_providers` filtering falls back to the unfiltered
  chain rather than 404.

## Q4 — Failure trace: "scrape a webpage and extract all the links" → plaid-mcp

**Live trace (prod, today):**
```
recommended_skill: plaid-mcp
resolved_workflow: general        match_method: keyword       junction_table_filtered: false
classification: { tool_category: "web_search", method: "keyword_fallback", reasoning: "LLM unavailable" }
alternatives: [mailchimp-mcp, docusign-mcp, google-ads-mcp]   ← mixed workflows = top-50 signature
```

Step by step:
1. `classifyTask` → **keyword_fallback** (LLM unavailable in prod). `method !== 'llm'`, so `route.ts:208`
   skips the LLM branch that would map `web_search/web_fetch → research-competitive-intelligence` and set
   `_preferredSkill = firecrawl-mcp`.
2. `semanticMatchWorkflow` → no `OPENAI_API_KEY` → `{method:'keyword', similarity:0}` → fails the `>0.3` gate.
3. `matchWorkflowFromTask` → the research keywords are `'scrape website'`, `'web scraping'`,
   `'crawl website'` — **none are substrings** of "scrape a webpage and extract all the links". Every
   workflow scores 0 → returns **`'general'`**.
4. `'general'` is not in `workflows` → no `skill_workflows` → `candidates` empty → **top-50 trap**.
5. Top-50 ranked by `value_score`: **plaid-mcp = 9.51** (highest in catalog) → recommended. firecrawl-mcp
   = 8.43, correctly tagged to `research-competitive-intelligence`, but it never entered the candidate set.

**Divergence point:** the query never reaches `research-competitive-intelligence`. The clean prior
exists two ways over — `firecrawl` is in that workflow (8.43) **and** the `web-scraping` `skill_tasks`
prior ranks it high — but **neither is consulted**: all three resolvers fail on this phrasing and
`'general'` collapses into a global `value_score` popularity contest. Root cause = query→workflow
resolution, compounded by both smart resolvers being off in prod.

## Q5 — Where task embeddings (pgvector) slot in

The query→workflow conversion is **`route.ts:206-254`**. A semantic step already lives there
(`semanticMatchWorkflow`, priority 3) but it (a) embeds **21 in-code workflow descriptions**, not the 55
DB tasks; (b) recomputes embeddings in-memory per cold start (no pgvector); (c) is currently inert.

A pgvector **task-level** matcher would **replace/precede `route.ts:206-254`**:
```
query → embed → top-k nearest TASKS (task_embeddings over name+description+example_query)
      → confidence / family→leaf resolution
      → skill ranking via skill_tasks.relevance_score (finally wired in) + telemetry + constraints
      → LLM classifier as fallback only when top-k is ambiguous/low-confidence
```
It supersedes **both** `semanticMatchWorkflow` (workflow-granularity) and `matchWorkflowFromTask`
(keyword). The candidate fetch at `route.ts:263-300` would shift from `skill_workflows(workflow)` to
`skill_tasks(task)` (or task→workflow→skill_workflows during a transition). New infra: `task_embeddings`
table (or `embedding` column on `tasks`), re-embed on task add/edit.

---

## Supporting data (live DB, read-only)

| Metric | Value |
|---|---|
| `tasks` | 55 (all 55 have `example_query`) |
| `skill_tasks` | 380 |
| active `skills` | 358 |
| `workflows` | 21 |
| `skill_workflows` | 176 |
| live code refs to `tasks`/`skill_tasks`/`example_query` | **0** |
| `'general'` workflow row | **absent** |
| firecrawl-mcp | value_score 8.43, workflow `research-competitive-intelligence` |
| plaid-mcp | value_score **9.51**, workflow `finance-accounting-automation` |

## Design implications (for Phase 2)

- The matcher must **wire in the task layer for the first time** — it isn't a swap of an existing task
  matcher, it's net-new plumbing (`tasks`/`skill_tasks`/`example_query` → routing).
- Decide the role of the existing resolvers: pgvector-task primary; the Gemini LLM classifier as
  fallback. But first **turn the keys back on** (verify `OPENROUTER_API_KEY` + add `OPENAI_API_KEY` in
  prod) or today's baseline measures a keyword-only system.
- Kill the **top-50 `value_score` trap**: an unresolved query should degrade to a safe default or
  low-confidence "unknown", not the most globally popular skill.
- Confirmed Phase 4 bug: `classificationToModelTier` never emits `best_available` (heuristic
  `resolveModelTier` does, via keywords).
- Quick hygiene (separate): `skill_tasks` scale outliers (e.g. the elasticsearch `web-search` 70.0 vs
  7–9.5) — but note this only matters once `skill_tasks` is actually in the routing path.

## Files
`src/app/api/route/route.ts` (skill path), `src/app/api/route/model/route.ts` (tier path),
`src/lib/matching.ts` (keyword map), `src/lib/embeddings.ts` (workflow embeddings),
`src/lib/task-classifier.ts` (Gemini classifier + fallback), `src/lib/model-routing.ts`
(`detectTaskSignals`/`resolveModelTier`), `src/lib/routing/tiers.ts` (`TIER_MAP`).
