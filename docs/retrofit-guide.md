# Add ToolRoute to an existing project in 5 minutes

This guide is for projects that already have working LLM calls. We'll use **Sol Coloring** as the running example — a project with existing `axios.post` calls directly to the Anthropic Messages API. By the end you'll have routing + telemetry without restructuring anything.

**No API key needed.** All ToolRoute endpoints are open. You'll use `agent_identity_id` (a UUID, not a secret) to attribute telemetry to your agent. That ID comes back from a single idempotent registration call, so calling `register()` on every cold start is safe.

The three things to know going in:

1. **Registration is idempotent** — re-calling `tr.register({ agent_name: 'sol-coloring' })` with the same name returns the same UUID every time. You don't need to gate it.
2. **Reporting is fire-and-forget** — don't `await tr.reportModel(...)`. The SDK times out at 800ms and never throws, but you shouldn't put it on the critical path anyway.
3. **No API key, anywhere** — there is no `Authorization` header, no token to rotate, no rate limit tied to credentials. Rate limits are per-IP (120 routes/hr, 30 registrations/hr).

---

## Step 1 — Install

```bash
npm install @toolroute/sdk
```

That's the only dependency.

---

## Step 2 — Bootstrap (one place, once)

Somewhere your app initializes — a `lib/toolroute.ts`, the bottom of your config file, wherever. This is the only "setup" code.

```ts
// lib/toolroute.ts
import { ToolRoute } from '@toolroute/sdk'

export const tr = new ToolRoute({
  agentName: 'sol-coloring',
  agentKind: 'workflow-agent',
})

// Idempotent — safe to call on every cold start
export const agentIdPromise = tr.register().then(r => r.agent_identity_id)
```

If you want to persist the ID instead of re-registering on each cold start, see [agent-identity-persistence](./agent-identity-persistence.md). For most projects, "call register on startup, cache the resulting promise in module scope" is enough.

---

## Step 3 — The diff

Here's the actual change at the call site. Sol Coloring currently uses raw `axios` to hit Anthropic directly. Find your equivalent and apply the same three-line pattern.

### Before

```ts
// src/services/coloring.ts
import axios from 'axios'

export async function generateColoringPage(theme: string) {
  const res = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Generate an SVG coloring page for: ${theme}`,
      }],
    },
    {
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
    },
  )

  return res.data.content[0].text
}
```

### After

```ts
// src/services/coloring.ts
import axios from 'axios'
import { tr } from '../lib/toolroute'

export async function generateColoringPage(theme: string) {
  const task = `Generate an SVG coloring page for: ${theme}`

  // 1. routeModel → tells you which model to use
  const route = await tr.routeModel({ task })

  const start = Date.now()
  const res = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: route.model_details.slug,  // ← was hardcoded 'claude-sonnet-4-5'
      max_tokens: 1024,
      messages: [{ role: 'user', content: task }],
    },
    {
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
    },
  )

  // 2. reportModel → fire-and-forget telemetry
  tr.reportModel({
    model_slug: route.model_details.slug,
    outcome_status: 'success',
    decision_id: route.routing_metadata.decision_id,
    latency_ms: Date.now() - start,
    input_tokens: res.data.usage.input_tokens,
    output_tokens: res.data.usage.output_tokens,
  })

  return res.data.content[0].text
}
```

The diff in plain terms:
- **+1 line** for `routeModel` before the Anthropic call.
- **Change 1 line** in the body — `model: route.model_details.slug` instead of a hardcoded string.
- **+1 block** for `reportModel` after — note: **no `await`**.

That's it. Your existing Anthropic API key is still the only credential needed for the actual LLM call. ToolRoute itself requires no credential.

---

## What you should verify before pushing

1. **Look at one routing response.** Log `route.reasoning` once to see what tier ToolRoute picked and why. If it picks something cheaper than you expected (e.g. `gemini-2.5-flash` instead of Sonnet), that's the win — but make sure output quality holds.
2. **Confirm telemetry lands.** Check `https://toolroute.io/agent/<agent_identity_id>` after a few runs. You should see contributions accumulating.
3. **Confirm fire-and-forget actually doesn't block.** Time your endpoint before and after — the `tr.reportModel(...)` call should not show up in your p50 latency.

---

## Common retrofit gotchas

**"I'm using the Anthropic SDK, not axios."** Same diff. Replace `route.model_details.slug` into `anthropic.messages.create({ model: ... })`. The SDK doesn't care.

**"I have a different LLM per route."** Don't pin `task` to a hardcoded string. Build it from the request — `const task = \`Generate ${kind} for ${context}\`` — so ToolRoute can see different signals and route differently per call.

**"My latency budget can't accept 50–150ms before the LLM call."** Skip `routeModel` and use [telemetry-only mode](./telemetry-only-mode.md). You still keep your existing hardcoded model, but `reportModel` builds the history that makes future routing accurate.

**"What if ToolRoute is down?"** `tr.routeModel(...)` returns a fallback shape with `routing_metadata.error: 'unreachable'` and `model_details.slug: ''`. Check for empty slug and fall back to your old hardcoded model — that one-line guard is your circuit breaker.

```ts
const route = await tr.routeModel({ task })
const modelSlug = route.model_details.slug || 'claude-sonnet-4-5'  // fallback
```

**"Do I need to register more than one agent?"** Usually no. Register one agent per *project*, not per request or per user. If you have genuinely independent surfaces (web app + Discord bot), one agent each, since their task distributions differ.

---

## What you get after 24 hours

Once you've shipped this and accumulated ~100 reports:

- `routing_memory` starts appearing on routing responses, showing `{ historical_model, success_rate, sample_size }` scoped to your agent.
- `confirmed_by_history: true` shows up when the live recommendation matches what's worked on your past traffic.
- Your agent page shows accumulated credits, model usage breakdown, and average quality per model on *your* workload — not the public benchmark.

That's the whole loop. Five-minute install, zero secrets, project-specific recommendations within a day.
