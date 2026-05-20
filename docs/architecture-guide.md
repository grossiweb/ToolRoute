# Which integration pattern fits your project?

ToolRoute is a routing layer, not a proxy. You call your LLM or MCP server directly — ToolRoute only tells you *which one* to call and collects telemetry afterward. That makes it useful in three very different project shapes.

**No API key needed.** All three endpoints (`/api/agents/register`, `/api/route/model`, `/api/report/model`) are open. Registration is idempotent; reporting is fire-and-forget. The only credential you ever need is the `agent_identity_id` you get back from `/api/agents/register`, and even that is optional — routing works without it, you just don't accumulate telemetry history.

Pick the pattern that matches your shape:

---

## Pattern A — Chatbot / agent

**Shape:** one model call per user message, conversational loop, low concurrency.

**Where ToolRoute fits:** on every turn, before you call the LLM. Ask "what model should I use for *this* message?" Then call your existing Anthropic/OpenAI/Gemini SDK directly with the slug ToolRoute hands back.

**What to route:** the user's prompt. Short, varied tasks benefit most — a question about Python code routes to `fast_code`, a translation request routes to `cheap_chat`, a complex plan routes to `reasoning_pro`.

**What to skip:** system prompts, tool-call response loops within a single turn, retries on transient errors. Route once per user message, not per LLM round-trip.

### Before

```ts
const res = await anthropic.messages.create({
  model: 'claude-sonnet-4-5',
  messages: [{ role: 'user', content: userMessage }],
})
```

### After

```ts
const tr = new ToolRoute({ agentName: 'my-chatbot' })

const route = await tr.routeModel({ task: userMessage })
const res = await anthropic.messages.create({
  model: route.model_details.slug,
  messages: [{ role: 'user', content: userMessage }],
})

tr.reportModel({
  model_slug: route.model_details.slug,
  outcome_status: 'success',
  decision_id: route.routing_metadata.decision_id,
  latency_ms: Date.now() - start,
  input_tokens: res.usage.input_tokens,
  output_tokens: res.usage.output_tokens,
}) // fire-and-forget, no await
```

Note: `tr.routeModel()` adds ~50–150ms of latency and never blocks longer than 800ms (timeout returns a fallback). If you can't tolerate that on the critical path, use Pattern B's batched form or [telemetry-only mode](./telemetry-only-mode.md).

---

## Pattern B — Data API / batch processing

**Shape:** you process N records (rows, documents, support tickets) with an LLM call per record. Throughput matters; per-record latency doesn't.

**Where ToolRoute fits:** route **once per batch**, not once per record. All records in a batch usually share a task shape ("summarize this ticket", "extract these fields"), so one routing decision applies to all of them.

**What to route:** the task description, not the per-record content. `task: "extract product name, price, and SKU from product description"` — describe the *operation*, not the data.

**What to skip:** per-record routing (wasteful), routing inside hot loops, routing on retries.

### Before

```ts
for (const row of rows) {
  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    messages: [{ role: 'user', content: `Extract fields from: ${row.text}` }],
  })
  results.push(res)
}
```

### After

```ts
const tr = new ToolRoute({ agentName: 'product-extractor' })

// Route once for the whole batch
const route = await tr.routeModel({
  task: 'Extract product name, price, and SKU as JSON',
  constraints: { max_cost_per_mtok: 1.0 },
})

for (const row of rows) {
  const start = Date.now()
  const res = await anthropic.messages.create({
    model: route.model_details.slug,
    messages: [{ role: 'user', content: `Extract fields from: ${row.text}` }],
  })

  // Report per-record so per-record telemetry accumulates
  tr.reportModel({
    model_slug: route.model_details.slug,
    outcome_status: 'success',
    decision_id: route.routing_metadata.decision_id,
    latency_ms: Date.now() - start,
    input_tokens: res.usage.input_tokens,
    output_tokens: res.usage.output_tokens,
    structured_output_valid: true,
  })
}
```

After ~20 batches, ToolRoute has enough history that `confirmed_by_history: true` shows up on routing responses for similar task shapes — the recommendation now reflects what's actually worked on *your* data.

---

## Pattern C — Agentic pipeline / multi-step tool use

**Shape:** an agent that plans, calls tools, observes results, calls more tools. Each step is potentially a different task (web search, then summarization, then code generation).

**Where ToolRoute fits:** at two layers.

1. **Tool selection** — when the agent needs to do something tool-shaped ("scrape this URL", "send a Slack message"), call `tr.route({ task })` to get an MCP server recommendation. Returns `recommended_skill` like `firecrawl-mcp` or `slack-mcp` plus alternatives and a fallback.
2. **Model selection per step** — different steps have different cognitive demands. Use `tr.routeModel()` per step, not per pipeline run. Planning → `reasoning_pro`. Tool-arg generation → `tool_agent`. Final synthesis → `creative_writing` or `reasoning_pro`.

**What to route:** each distinct step, with a `task` description that describes that step in isolation.

**What to skip:** routing the agent's internal scratchpad operations, routing on observation parsing, routing inside tool-call retry loops.

### Before

```ts
// Hard-coded model and tools
const model = 'claude-sonnet-4-5'
const scraper = firecrawl  // chosen at build time
const messenger = slack    // chosen at build time

const plan = await llm(model, planPrompt)
const data = await scraper.scrape(plan.url)
const summary = await llm(model, summarizePrompt(data))
await messenger.send(channel, summary)
```

### After

```ts
const tr = new ToolRoute({ agentName: 'research-pipeline' })

// Step 1: plan — needs reasoning
const planRoute = await tr.routeModel({ task: 'Plan a 3-step research workflow' })
const plan = await llm(planRoute.model_details.slug, planPrompt)
tr.reportModel({ model_slug: planRoute.model_details.slug, outcome_status: 'success',
  decision_id: planRoute.routing_metadata.decision_id })

// Step 2: scrape — needs a tool, not a model
const scrapeRoute = await tr.route({ task: 'Scrape a documentation page and return clean markdown' })
const data = await callMcp(scrapeRoute.recommended_skill, { url: plan.url })
tr.report({ skill: scrapeRoute.recommended_skill, outcome: 'success' })

// Step 3: summarize — cheap model is fine
const sumRoute = await tr.routeModel({ task: 'Summarize 2000 words into 3 bullets' })
const summary = await llm(sumRoute.model_details.slug, summarizePrompt(data))
tr.reportModel({ model_slug: sumRoute.model_details.slug, outcome_status: 'success',
  decision_id: sumRoute.routing_metadata.decision_id })

// Step 4: notify — needs a tool
const notifyRoute = await tr.route({ task: 'Send a message to a team chat channel' })
await callMcp(notifyRoute.recommended_skill, { channel, text: summary })
tr.report({ skill: notifyRoute.recommended_skill, outcome: 'success' })
```

Pipelines benefit the most from ToolRoute because (a) tool selection is non-obvious and changes as new MCP servers appear, and (b) over-using `reasoning_pro` for cheap steps is where pipeline cost blows up.

---

## Decision shortcut

| Your project does this... | Pattern | Where ToolRoute fits |
|---|---|---|
| One LLM call per user turn | A | Per message, before the LLM call |
| One LLM call per record in a list | B | Once per batch, not per record |
| Multiple steps with tools and models | C | Per step (tool AND model routing) |

If none of these fit, you probably already have LLM calls wired up and just want to start collecting data — go to [telemetry-only mode](./telemetry-only-mode.md).
