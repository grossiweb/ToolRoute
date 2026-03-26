# @toolroute/hook

Auto-route every agent task through [ToolRoute](https://toolroute.io). Install once — every task gets the best MCP server and LLM model recommendation, automatically.

## Install

```bash
npm install @toolroute/hook
```

## Quick Start

```typescript
import { createHook } from '@toolroute/hook'

const hook = createHook({
  agentName: 'my-agent',
  verbose: true, // logs routing decisions
})

// Register (optional, earns 2x credits)
await hook.register()

// Wrap any task — routing + reporting happens automatically
const result = await hook.run('scrape competitor pricing data', async (routing) => {
  console.log(`Best tool: ${routing.skillName}`) // e.g., "Firecrawl MCP"
  console.log(`Best model: ${routing.model}`)    // e.g., "haiku-3.5"
  console.log(`Confidence: ${routing.confidence}`)

  // ... your actual task logic here ...
  return { prices: [29, 49, 99] }
})

console.log(result.data)          // { prices: [29, 49, 99] }
console.log(result.executionMs)   // 1847
console.log(result.creditsEarned) // 5
```

## Just Route (no wrapper)

```typescript
const routing = await hook.route('draft an email to a client')
// routing.skill → "gmail-mcp"
// routing.model → "haiku-3.5"
// routing.confidence → 0.87
```

## A/B Testing

```typescript
// Set bypass: true to skip routing — compare routed vs unrouted performance
const hook = createHook({ bypass: Math.random() > 0.5 })
```

## How It Works

1. **Before your task** — calls `POST /api/route` with your task description
2. **Returns routing context** — best skill, model, alternatives, confidence score
3. **You execute** — use the recommendation (or ignore it)
4. **After your task** — reports outcome to ToolRoute (fire-and-forget)
5. **Earns credits** — 3-10 credits per report, 2x if verified

## Links

- [ToolRoute](https://toolroute.io) — Skill intelligence for AI agents
- [API Docs](https://toolroute.io/api-docs)
- [MCP Server Catalog](https://toolroute.io/servers)
- [Challenges](https://toolroute.io/challenges) — Earn 3x credits
