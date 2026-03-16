# @neoskills/sdk

**Agent skill routing in two lines.** NeoSkill tells your agent which MCP skill to use — backed by real execution data from thousands of agents.

## Quick Start

```typescript
import { NeoSkill } from '@neoskills/sdk'

const neo = new NeoSkill()

// 1. Get a recommendation
const route = await neo.route({ task: 'extract pricing data from competitor websites' })
console.log(route.recommended_skill) // "firecrawl-mcp"

// 2. Execute the skill (your code)
const result = await runSkill(route.recommended_skill, task)

// 3. Report the outcome — earns routing credits
await neo.report({
  skill: route.recommended_skill,
  outcome: result.success ? 'success' : 'failure',
  latency_ms: result.latency,
  cost_usd: result.cost
})
```

That's it. Three calls. Your agent now routes intelligently and contributes to the global benchmark dataset.

## Install

```bash
npm install @neoskills/sdk
```

## API

### `new NeoSkill(config?)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `baseUrl` | string | `https://neo-skill.vercel.app` | NeoSkill API base URL |
| `timeoutMs` | number | `800` | Hard timeout — NeoSkill never blocks your agent |
| `agentName` | string | — | Agent name for telemetry attribution |
| `agentKind` | string | — | `autonomous`, `copilot`, `workflow-agent`, `evaluation-agent`, `hybrid` |
| `modelFamily` | string | — | e.g., `claude-4`, `gpt-4o` |
| `hostClient` | string | — | e.g., `claude-code`, `cursor` |

### `neo.route(request)`

Get a confidence-scored skill recommendation.

```typescript
const route = await neo.route({
  task: 'browser automation for form filling',    // natural language
  constraints: {
    priority: 'best_value',     // best_value | best_quality | lowest_cost | ...
    trust_floor: 7,             // minimum trust score (0-10)
    max_cost_usd: 0.05,        // cost ceiling
  }
})

// Response:
// {
//   recommended_skill: "playwright-mcp",
//   confidence: 0.85,
//   alternatives: ["skyvern-mcp", "chrome-devtools-mcp"],
//   recommended_combo: ["playwright-mcp", "firecrawl-mcp"],
//   fallback: "skyvern-mcp",
//   scores: { value_score: 9.1, output_score: 9.3, ... }
// }
```

### `neo.report(request)`

Report execution outcome. Fire-and-forget — never blocks.

```typescript
await neo.report({
  skill: 'firecrawl-mcp',
  outcome: 'success',           // success | partial_success | failure | aborted
  latency_ms: 2400,
  cost_usd: 0.003,
  quality_rating: 8.5,          // 0-10
  task_fingerprint: 'pricing-extraction-001',
  fallback_skill: 'exa-mcp',   // if a fallback was used
})
```

### `neo.preflight()`

Health check. Never throws.

```typescript
const health = await neo.preflight()
// { healthy: true, latency_ms: 45, version: "1.1.0" }
```

### `neo.missions(eventSlug?)`

List available benchmark missions for bonus rewards.

```typescript
const { missions } = await neo.missions('web-research-extraction')
```

## Design Principles

1. **Never blocks your agent.** 800ms hard timeout. Always returns gracefully on failure.
2. **Telemetry is opt-out.** Default is anonymous reporting. One-line disable.
3. **The loop is sacred:** recommend → execute → report → reward → route better.
4. **Comparative evals earn 2.5x rewards.** Run two skills on the same task, report both.
5. **Benchmark packages earn 4.0x rewards.** Full benchmark runs with multiple tasks.

## Reward Multipliers

| Contribution Type | Multiplier |
|-------------------|------------|
| Run telemetry | 1.0x |
| Fallback chain report | 1.5x |
| Comparative evaluation | **2.5x** |
| Benchmark package | **4.0x** |

## License

MIT
