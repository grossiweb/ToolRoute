# Priority 7 — Tier-Path (model/tier classifier) Findings

> **RESOLVED — #1–4 shipped (`7a0381c` + `3b867c0`), verified live 2026-06-14.**
> - **#1** word-boundary all signal lists (`detectTaskSignals`, `BEST_AVAILABLE_KEYWORDS`, `detectCostAwareTier`) — killed the substring false-positives (Yellowstone/invoice/explanation/particle/synthesis/Seoul), positives preserved.
> - **#2** scope-cue keywords (`exhaustive`, `end-to-end`, `full specification`, `complete architecture/spec/analysis/audit/assessment`) + intensity rule (`complex_reasoning && signal_count >= 2 → best_available`). Bare `comprehensive` deliberately excluded.
> - **#3** `classificationToModelTier` reaches `best_available` for complex writing/analysis under `highest_quality` only; `best_value` unchanged.
> - **#4** GET-guide example corrected to `tool_agent` (tools+structured); Path B logic unchanged.
>
> **Documented residuals (intentionally not fixed):**
> - `"plan a birthday party"` → `reasoning_pro` — **FIXED in commit `d943c75` via TRIVIAL_CONTEXT guard** (`birthday, trip, vacation, dinner, holiday, wedding, celebration`) — re-checks `complex_reasoning` without `'plan'` when a trivial context word is present, so "plan a birthday party" drops to cheap_chat while "analyze the wedding budget" (`analyze` holds) and "plan the system architecture" (no context word) stay reasoning_pro. The tier-path semantic matcher was attempted (migrations 072/073) but disproven — embeddings encode topic, not difficulty. (Earlier the compound-phrase narrowing was rejected as net-negative — see "Plan-keyword narrowing" below.)
> - `"complete security audit"` → `reasoning_pro` — scope cues are literal-adjacent phrases (`complete audit` ≠ `complete security audit`), as approved. `"do a complete audit"` does escalate.

---

## Plan-keyword narrowing — investigated, rejected (2026-06-14)

Proposal was to replace bare `plan` with compound phrases (`implementation plan`,
`strategic plan`, `technical plan`, `project plan`, `action plan`) to stop trivial
"plan a birthday party / trip / dinner" → reasoning_pro.

Confirmed empirically (re-probed each genuine task with the word `plan` removed):

| Task | Without `plan` | Verdict |
|---|---|---|
| "plan **the system architecture** for a payments service" | cheap_chat (CR=False) | **regresses** |
| "plan **our go-to-market approach**" | cheap_chat (CR=False) | **regresses** |
| "plan **the quarterly product roadmap**" | cheap_chat (CR=False) | **regresses** |
| "plan a database migration **strategy**" | reasoning_pro (via `strategy`) | safe |
| "**implementation plan** / **strategic plan** …" | covered by compound | safe |

The proposed compounds are all **noun phrases**, but genuine planning often uses
`plan` as a **verb** ("plan the architecture/roadmap/go-to-market/data pipeline").
Those carry no other reasoning keyword, so narrowing under-routes them to
`cheap_chat` (Gemini Flash Lite). That trade is net-negative: it fixes a mild, rare
over-route (party-planning → Opus 4.6) at the cost of a quality failure on a core
use case (technical/business planning → cheapest model). No keyword set cleanly
separates "plan a party" from "plan an architecture" — only intent does. **Decision:
leave `plan` unchanged; defer to the tier-path semantic matcher.**

**Status:** Tier 1 read-only investigation. Findings only — fixes proposed separately.
**Date:** 2026-06-12. Grounded against live `POST /api/route/model` (deploy current).

---

## Where the code lives

Two tier resolvers exist, used by different endpoints:

| Resolver | File | Used by | Can emit `best_available`? |
|---|---|---|---|
| `resolveModelTier(signals, task)` | `src/lib/model-routing.ts:167` | **`/api/route/model`** (always); `/api/route` only on keyword fallback | Yes — but narrowly (see Q2) |
| `classificationToModelTier(c, priority)` | `src/lib/task-classifier.ts:329` | `/api/route` skill path, **when LLM classifier is up** (the common case) | **No — structurally impossible** |

Both run `detectCostAwareTier(task)` afterward as a cheap-tier override.

- `/api/route/model:114` → `resolveModelTier` → `detectCostAwareTier` → `resolveTierToModel` (tiers.ts maps tier→model).
- `/api/route:671-687` → if `method==='llm'` use `classificationToModelTier`, else `resolveModelTier`; then `detectCostAwareTier`.

The `best_available` tier IS fully mapped in `tiers.ts` (→ `claude-opus-4-7`, `required_effort_level: xhigh`) for all profiles. The gap is entirely in **which tier the classifiers decide**, not in resolution.

---

## Q1 — What signals does it check?

`detectTaskSignals` (model-routing.ts:142) sets 5 booleans by keyword match + a `signal_count`:

| Signal | Match style | Example keywords |
|---|---|---|
| `tools_needed` | substring | `tool use`, `function call`, `api call`, `use mcp` |
| `structured_output_needed` | substring | `json`, `csv`, `extract fields`, `structured output` |
| `code_present` | **word-boundary** (`matchesWordBoundary`) | `code`, `function`, `python`, `express`, `rest api` |
| `complex_reasoning` | substring | `plan`, `design`, `analyze`, `comprehensive`, `architectural` |
| `creative_writing` | substring | `blog post`, `tone`, `voice`, `article`, `haiku` |

`resolveModelTier` then maps (first match wins):
1. `BEST_AVAILABLE_KEYWORDS` substring in task → `best_available`
2. `tools_needed && complex_reasoning` → `best_available`
3. `tools_needed` → `tool_agent`
4. `complex_reasoning` → `reasoning_pro`
5. `creative_writing` → `creative_writing`
6. `code_present` → `fast_code`
7. `structured_output_needed` → `cheap_structured`
8. else → `cheap_chat`

**Only `code_present` uses word-boundary matching. The other four use plain `.includes()`** — this is the root cause of Q4.

---

## Q2 — Why is `best_available` (effectively) never emitted?

Two distinct reasons, one per resolver:

### (i) `classificationToModelTier` — structurally cannot emit it
The LLM-path mapper (task-classifier.ts:329-369) has **no branch that returns `best_available`** in any priority mode. The ceiling is `reasoning_pro` (complex analysis/writing) or `tool_agent`. Since the LLM classifier is up in normal operation, **the entire `/api/route` skill path can never recommend `best_available`.** It is a dead tier there.

### (ii) `resolveModelTier` — reachable, but gated behind narrow triggers
- **Path A** (`BEST_AVAILABLE_KEYWORDS`) is a list of exact magic phrases (`comprehensive technical`, `whitepaper`, `formal proof`, `dissertation`, `best possible`, `highest quality`…). Realistic high-effort prompts that don't contain one of these fall through.
- **Path B** (`tools_needed && complex_reasoning`) almost never fires: `tools_needed` keywords are narrow and rarely co-occur with reasoning phrasing.

**Live evidence:**

| Task | Tier | Why |
|---|---|---|
| "write a **comprehensive technical** specification…" | `best_available` ✅ | Path A phrase hit |
| "**design a complete technical architecture document** for our microservices" | **`reasoning_pro`** ❌ | No Path A phrase; only `complex_reasoning` → reasoning_pro |
| "use the **best possible** model to produce an exhaustive market analysis" | `best_available` ✅ | Path A phrase |
| "write a **dissertation**-length analysis…" | `best_available` ✅ | Path A phrase |
| "produce the **highest quality** strategic plan…" | `best_available` ✅ | Path A phrase |
| "use tools to research competitors and extract pricing data into JSON" | **`tool_agent`** ❌ | Path B needs `complex_reasoning`; this is `tools+structured` → falls to tool_agent |

So `best_available` only appears when the user literally writes a premium phrase. The natural high-effort case — a complex task described on its merits without magic words — caps at `reasoning_pro`. That matches the original bug report.

---

## Q3 — Keyword coverage gaps (right tier, missed)

1. **`best_available` trigger too narrow.** Genuine high-effort tasks ("design a complete technical architecture document", "produce an exhaustive multi-section report") reach only `reasoning_pro`. There's no escalation based on *intensity* (multi-signal, length cues like "exhaustive/complete/end-to-end/full", or `complexity` from the LLM classifier) — only exact phrases.
2. **Path B mismatch with documentation.** The GET `/api/route/model` guide (model/route.ts:62-65) documents `tools + structured → best_available`, but the code requires `tools && complex_reasoning`. The documented example actually returns `tool_agent`. Either the doc or the rule is wrong (doc/code mismatch).
3. **LLM path has no `best_available` at all** (Q2-i) — the biggest coverage gap: even `highest_quality` priority caps at `reasoning_pro`.

---

## Q4 — False positives (wrong tier, cheap task → expensive model)

**Root cause:** `complex_reasoning` and `creative_writing` use substring `.includes()`, so short keywords match inside unrelated words. `best_available` = `claude-opus-4-7` at `xhigh` effort (the most expensive route), so these are real cost errors.

**Live evidence — all cheap/factual tasks mis-escalated:**

| Task (should be cheap) | Tier emitted | Bad keyword → substring of |
|---|---|---|
| "tell me about **Yellowstone** national park" | `creative_writing` | `tone` ⊂ "Yellows**tone**" |
| "process this **invoice** and tell me the total" | `creative_writing` | `voice` ⊂ "in**voice**" |
| "give me an **explanation** of how photosynthesis works" | **`best_available`** 🔴 | `plan` ⊂ "ex**plan**ation" → most expensive tier for a trivial explain |
| "explain **particle** physics to a beginner" | `creative_writing` | `article` ⊂ "p**article**" |
| "**plan** a birthday party for my kid" | `reasoning_pro` | literal `plan` (trivial task, legit word) |

The worst case — `"explanation of photosynthesis" → best_available (Opus 4.7 xhigh)` — is roughly a 100× cost error on a task `cheap_chat` (Gemini Flash Lite) handles fine. This is the exact failure `detectCostAwareTier` was built to prevent, but it only covers SEO/moderation/synonym patterns, not these substring accidents.

Other latent substring traps in the lists (not yet probed): `tone`→`intone/stone/atone`, `thread`→`threaded/threadbare`, `pitch`→`pitcher`, `plan`→`airplane/complaint`.

---

## Severity & impact

- **Cost, both directions of the same root cause:** narrow `best_available` triggers under-route genuine premium work to `reasoning_pro` (mild), while substring false positives over-route trivial work to `creative_writing`/`reasoning_pro`/`best_available` (severe — up to ~100× on the `best_available` case).
- **LLM path can never reach `best_available`** — a whole tier of `tiers.ts` (and the `claude-opus-4-7` mapping) is unused in normal `/api/route` operation.
- **Doc/code mismatch** in the GET guide will mislead integrators.

---

## Proposed fix directions (to be detailed + approved separately — Tier 2, routing logic)

1. **Word-boundary all signal lists.** Reuse `matchesWordBoundary` for `complex_reasoning`, `creative_writing`, `tools_needed`, `structured_output_needed` — not just `code_present`. Kills the Yellowstone/invoice/explanation/particle class outright. *(Highest value, lowest risk.)*
2. **Broaden `best_available` to intensity, not magic phrases.** e.g. escalate when `complex_reasoning && signal_count ≥ 2`, or on length/scope cues ("exhaustive", "complete", "end-to-end", "full specification"), in addition to the keyword list. Re-examine Path B.
3. **Give `classificationToModelTier` a `best_available` branch** for `highest_quality` + complex analysis/writing (and optionally fold `BEST_AVAILABLE_KEYWORDS`/`complexity` into the LLM path), so the skill path can reach it.
4. **Reconcile the GET-guide example** with Path B (fix one to match the other).

Each touches routing logic → propose-then-approve, with a before/after probe set (the queries above) and a regression pass on the tier battery before shipping.
