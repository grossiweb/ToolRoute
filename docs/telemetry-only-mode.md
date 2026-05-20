# Telemetry-only mode

You already have LLM calls wired up. You don't want to change your routing logic yet. But you'd like to start accumulating outcome data so that *later*, when you turn routing on, the recommendations reflect what's worked on your project.

That's telemetry-only mode. You skip `/api/route/model` entirely and just call `/api/report/model` after each LLM call you already make. After a few hundred reports, you'll have enough history that ToolRoute can make project-specific recommendations.

**No API key needed.** `/api/agents/register` and `/api/report/model` are both open. Registration is idempotent — call it on every cold start, it returns the same `agent_identity_id` for the same `agent_name`.

---

## What you get from telemetry-only mode

- **Project-specific routing memory.** Once a `(task_cluster, model_slug)` pair has ≥3 reports with ≥75% success rate, the next routing call for that cluster shows `routing_memory.historical_model` and `confirmed_by_history: true`. You're not committing to ToolRoute's recommendation — you're just teaching it what already works.
- **Cost and quality history** scoped to *your* agent. Public benchmarks tell you the average; telemetry tells you what's true on your traffic.
- **Credits.** Every accepted report earns routing credits (2× for registered agents, +50% if you also pass a `decision_id` — which you don't have in telemetry-only mode, so just the 2×). Spend them later on benchmark missions or challenge submissions.

## What you don't need

- An LLM call to ToolRoute. Reports are pure JSON, no model inference involved.
- An API key. There isn't one.
- Latency budget. `tr.reportModel(...)` is fire-and-forget — don't await it on your hot path.
- A schema migration on your side. You already have model name, outcome, and latency; that's all that's required.

---

## The 10-line snippet

Drop this in wherever you currently call your LLM. Keep your existing model selection logic untouched.

```ts
import { ToolRoute } from '@toolroute/sdk'

const tr = new ToolRoute({ agentName: 'sol-coloring' })
const { agent_identity_id } = await tr.register()  // idempotent — cache the ID

// ... your existing code ...
const start = Date.now()
const res = await anthropic.messages.create({ model: 'claude-sonnet-4-5', messages })

tr.reportModel({
  model_slug: 'claude-sonnet-4-5',
  outcome_status: 'success',
  latency_ms: Date.now() - start,
  input_tokens: res.usage.input_tokens,
  output_tokens: res.usage.output_tokens,
})  // no await — fire-and-forget
```

That's it. You're now building project-specific routing history without changing a single routing decision.

---

## Persisting `agent_identity_id`

Registration is idempotent, so re-calling `tr.register()` on every cold start is safe — it returns the same ID. But if you want to skip the network round-trip, cache the ID. See [agent-identity-persistence](./agent-identity-persistence.md) for the four common patterns (env var, KV store, local file, in-memory singleton).

---

## What to report — fields by trust weight

`/api/report/model` accepts ~15 fields. You can report just `model_slug` and `outcome_status`, but the more you include, the higher the quality verification tier and the more credits you earn.

| Field | Required? | Why include it |
|---|---|---|
| `model_slug` | yes | Which model was called (e.g. `claude-sonnet-4-5`, `gpt-4o-mini`) |
| `outcome_status` | yes | `success` / `partial_success` / `failure` / `aborted` |
| `latency_ms` | recommended | Drives structural quality verification (`computed` tier, weight 0.85) |
| `input_tokens`, `output_tokens` | recommended | Lets ToolRoute compute real cost-per-task on your traffic |
| `estimated_cost_usd` | optional | If you have it, include it; otherwise it's derived from tokens × price |
| `output_snippet` (first 500 chars) + `task` | recommended | Unlocks `verified` tier (LLM evaluator, weight 1.0). Highest credit tier. |
| `output_quality_rating` (0–10) | optional | Self-reported quality. Lowest trust weight (0.50) — prefer `output_snippet` |
| `structured_output_valid`, `tool_calls_succeeded`, `hallucination_detected` | optional | Boolean signals; included in structural quality computation |
| `retry_count` | optional | Clean runs (0 retries) score higher than runs that needed retries |

You don't need a `decision_id` in telemetry-only mode — that field links a report to a prior `/api/route/model` call, which you're not making. The endpoint accepts reports without it.

---

## When to graduate to routing

Watch `routing_memory.sample_size` on routing responses (you'll have to make one occasional `tr.routeModel(...)` call to see it). Once it consistently exceeds ~10 on your common task clusters, ToolRoute has enough data to make project-specific recommendations and you can flip from telemetry-only to routing — see [retrofit-guide](./retrofit-guide.md) for the diff.

Until then, keep reporting. The telemetry compounds.
