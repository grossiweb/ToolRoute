<p align="center">
  <img src="docs/assets/toolroute-banner.svg" alt="ToolRoute" width="720" />
</p>

<h1 align="center">ToolRoute</h1>

<p align="center">
  <strong>The intelligent routing layer for MCP servers.</strong><br/>
  Find the best tool for every agent task — scored on real execution data.
</p>

<p align="center">
  <a href="https://toolroute.io">Website</a> ·
  <a href="https://toolroute.io/api-docs">API Docs</a> ·
  <a href="https://toolroute.io/servers">Browse Servers</a> ·
  <a href="#quickstart">Quick Start</a> ·
  <a href="https://www.npmjs.com/package/@toolroute/sdk">SDK</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/MCP_Servers-100+-8b5cf6" alt="100+ MCP servers" />
  <img src="https://img.shields.io/badge/Score_Dimensions-5-06b6d4" alt="5 score dimensions" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT license" />
  <img src="https://img.shields.io/badge/Agent_First-Always-f97316" alt="Agent first" />
</p>

---

## The Problem

You're building an AI agent. You need to pick MCP servers. There are hundreds of them. Which one actually works best for your task? Which one is cheapest? Most reliable? Which combination should you deploy together?

**Nobody benchmarks MCP servers.** Until now.

## What ToolRoute Does

ToolRoute scores every MCP server on **5 dimensions** using real execution telemetry — not GitHub stars, not vibes:

| Dimension | Weight | What It Measures |
|-----------|--------|-----------------|
| **Output Quality** | 35% | How good are the results? |
| **Reliability** | 25% | Does it fail? How often? |
| **Efficiency** | 15% | Speed and token usage |
| **Cost** | 15% | Actual dollar cost per run |
| **Trust** | 10% | Security, permissions, data handling |

Every server gets a **ToolRoute Score** (0–10) that combines these into a single number you can sort by, filter on, and route with.

---

## Works With

<p align="center">
  <img src="docs/assets/works-with.svg" alt="Works with Claude Desktop, Cursor, VS Code, any MCP client, REST API + SDK" width="720" />
</p>

---

## At a Glance

<table>
<tr>
<td width="50%">
<img src="docs/assets/feature-route.svg" alt="Intelligent Routing" width="100%" />
</td>
<td width="50%">
<img src="docs/assets/feature-scores.svg" alt="5-Dimension Scoring" width="100%" />
</td>
</tr>
<tr>
<td width="50%">
<img src="docs/assets/feature-deploy.svg" alt="One-Click Deploy" width="100%" />
</td>
<td width="50%">
<img src="docs/assets/feature-telemetry.svg" alt="Telemetry Flywheel" width="100%" />
</td>
</tr>
</table>

---

## Quick Start

### Option A: Use the SDK (2 lines)

```bash
npm install @toolroute/sdk
```

```typescript
import { ToolRoute } from '@toolroute/sdk'

const tr = new ToolRoute({ agentName: 'my-agent' })

// Ask: "What's the best tool for this task?"
const rec = await tr.route({ task: 'scrape product pages and extract pricing' })
console.log(rec.recommended_skill)  // → "firecrawl-mcp"
console.log(rec.confidence)         // → 0.89
console.log(rec.alternatives)       // → ["browserbase-mcp", "playwright-mcp"]

// After execution, report back (earns routing credits)
await tr.report({
  skill: 'firecrawl-mcp',
  outcome: 'success',
  latency_ms: 1200,
  cost_usd: 0.003,
  quality_rating: 9
})
```

### Option B: Add as MCP Server (zero code)

ToolRoute is itself an MCP server. Your agent can query it like any other tool.

<details>
<summary><strong>Claude Desktop</strong></summary>

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "toolroute": {
      "command": "npx",
      "args": ["-y", "@toolroute/sdk", "--mcp"],
      "env": {}
    }
  }
}
```

Your Claude agent now has access to `toolroute_route`, `toolroute_search`, `toolroute_compare`, `toolroute_report`, and `toolroute_missions`.

</details>

<details>
<summary><strong>Cursor / VS Code</strong></summary>

Add to `.cursor/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "toolroute": {
      "url": "https://toolroute.io/api/mcp",
      "transport": "http"
    }
  }
}
```

</details>

<details>
<summary><strong>Direct HTTP</strong></summary>

```bash
# Route a task
curl -X POST https://toolroute.io/api/route \
  -H "Content-Type: application/json" \
  -d '{"task": "find and summarize recent AI research papers"}'

# Report execution outcome
curl -X POST https://toolroute.io/api/report \
  -H "Content-Type: application/json" \
  -d '{"skill_slug": "exa-mcp-server", "outcome": "success", "latency_ms": 800}'
```

</details>

---

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                        THE ROUTING LOOP                         │
│                                                                 │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐ │
│   │          │    │  SCORE   │    │  ROUTE   │    │  REPORT  │ │
│   │  QUERY   │───▶│    &     │───▶│    &     │───▶│    &     │ │
│   │          │    │  RANK    │    │ EXECUTE  │    │  EARN    │ │
│   └──────────┘    └──────────┘    └──────────┘    └────┬─────┘ │
│        ▲                                               │       │
│        └───────────────────────────────────────────────┘       │
│                     scores improve over time                    │
└─────────────────────────────────────────────────────────────────┘
```

1. **Query** — Your agent describes a task in natural language
2. **Score & Rank** — ToolRoute evaluates 100+ MCP servers across 5 dimensions
3. **Route & Execute** — Returns the best match with confidence score + fallback chain
4. **Report & Earn** — Agent submits execution telemetry → earns routing credits → scores improve

The more agents use ToolRoute, the better the routing gets. It's a flywheel.

---

## Features

### For Agent Developers

| Feature | Description |
|---------|-------------|
| **Task-based routing** | Describe what you need in plain English. Get the best MCP server. |
| **Confidence scoring** | Every recommendation comes with a 0–1 confidence score |
| **Fallback chains** | If the primary tool fails, ToolRoute suggests ranked alternatives |
| **Constraint routing** | Optimize for quality, cost, speed, reliability, or trust |
| **Deploy configs** | One-click config generation for Claude, Cursor, and JSON |
| **Pre-built stacks** | Curated tool combinations: Research, Developer, Content, Sales, DevOps, Data |
| **Never blocks** | SDK has 800ms timeout — routing never slows your agent down |

### For MCP Server Maintainers

| Feature | Description |
|---------|-------------|
| **Score badges** | Embed your ToolRoute score in your README |
| **Benchmark visibility** | See how your server ranks against alternatives |
| **Telemetry insights** | Aggregated usage data from real agent workflows |
| **Listing** | Get discovered by agents searching for your capability |

### Score Badge

Add your server's ToolRoute score to your README:

```markdown
[![ToolRoute Score](https://toolroute.io/api/badge/your-server-slug)](https://toolroute.io/skills/your-server-slug)
```

---

## Browse & Explore

| Page | What You'll Find |
|------|-----------------|
| [**Servers**](https://toolroute.io/servers) | All 100+ MCP servers with scores, search, and filters |
| [**Tasks**](https://toolroute.io/tasks/web-search) | Best tools for each task (web search, code review, data analysis...) |
| [**Leaderboards**](https://toolroute.io/leaderboards/web-search) | Head-to-head rankings by category |
| [**Stacks**](https://toolroute.io/stacks) | Pre-built tool combinations with deploy configs |
| [**Compare**](https://toolroute.io/compare) | Side-by-side comparison of up to 4 servers |
| [**Benchmarks**](https://toolroute.io/olympics) | Competition-style benchmark events |

---

## API Reference

### `POST /api/route` — Get a Recommendation

```json
// Request
{
  "task": "extract data from 50 product pages",
  "constraints": {
    "priority": "best_efficiency",
    "max_cost_usd": 0.10
  }
}

// Response
{
  "recommended_skill": "firecrawl-mcp",
  "confidence": 0.91,
  "scores": {
    "value_score": 8.7,
    "output_score": 9.1,
    "reliability_score": 8.8,
    "efficiency_score": 8.2,
    "cost_score": 7.9,
    "trust_score": 8.5
  },
  "alternatives": [
    { "skill": "browserbase-mcp", "confidence": 0.82 },
    { "skill": "playwright-mcp", "confidence": 0.74 }
  ],
  "recommended_combo": {
    "name": "Research Stack",
    "skills": ["brave-search-mcp", "firecrawl-mcp", "context7"]
  }
}
```

### `POST /api/report` — Submit Telemetry

```json
{
  "skill_slug": "firecrawl-mcp",
  "outcome": "success",
  "latency_ms": 1200,
  "cost_usd": 0.003,
  "quality_rating": 9
}
```

### `POST /api/mcp` — JSON-RPC MCP Endpoint

5 tools available: `toolroute_route`, `toolroute_search`, `toolroute_compare`, `toolroute_missions`, `toolroute_report`

Full API documentation at [toolroute.io/api-docs](https://toolroute.io/api-docs)

---

## Contribution Economy

Agents that report execution outcomes earn **routing credits**:

| Contribution Type | Multiplier | Credits |
|-------------------|-----------|---------|
| Single run report | 1.0× | 3–10 |
| Comparative eval (A/B test) | 2.5× | 8–25 |
| Fallback chain report | 1.5× | 5–15 |
| Benchmark package | 4.0× | 15–40 |

Credits unlock priority routing and higher rate limits. The telemetry you submit makes every agent's routing better.

---

## Scoring Methodology

ToolRoute scores are **outcome-backed**, not opinion-based. Think Consumer Reports for AI tools.

```
Value Score = 0.35 × Output + 0.25 × Reliability + 0.15 × Efficiency
            + 0.15 × Cost + 0.10 × Trust

Overall Score = Value Score × 0.60 + Adoption × 0.20 + Freshness × 0.20
```

- Scores are on a **0–10 scale**, capped at **9.8** (no perfect 10s)
- Scores update based on aggregated telemetry from real agent executions
- Minimum sample size required before scores are considered stable
- Transparent methodology — no pay-to-rank, no hidden boosts

---

## Self-Hosting

```bash
# Clone
git clone https://github.com/grossiweb/ToolRoute.git
cd ToolRoute

# Environment
cp .env.local.example .env.local
# Fill in your Supabase credentials

# Install & run
npm install
npm run dev
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-side only) |
| `GITHUB_TOKEN` | Optional | GitHub PAT for health signal cron |

### Database Setup

Run migrations in order in your Supabase SQL Editor:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_seed_data.sql
...through...
supabase/migrations/018_fill_orphan_task_mappings.sql
```

---

## Architecture

```
toolroute.io
├── src/app/
│   ├── api/
│   │   ├── route/    → POST /api/route    (task routing engine)
│   │   ├── mcp/      → POST /api/mcp      (MCP JSON-RPC server)
│   │   ├── report/   → POST /api/report   (telemetry ingestion)
│   │   ├── skills/   → GET  /api/skills   (catalog search)
│   │   └── cron/     → Score recalculation pipeline
│   ├── servers/      → Browse all MCP servers
│   ├── tasks/        → Best tools per task
│   ├── stacks/       → Deploy pre-built tool stacks
│   ├── compare/      → Side-by-side comparison
│   ├── leaderboards/ → Category rankings
│   └── olympics/     → Benchmark competitions
├── sdk/              → @toolroute/sdk npm package
└── supabase/         → Database migrations (001-018)
```

**Stack**: Next.js 14 (App Router) · Supabase (Postgres) · Tailwind CSS · Vercel

---

## Roadmap

- [ ] Automated benchmark runner (agents compete in real-time)
- [ ] MCP server health monitoring (uptime, latency tracking)
- [ ] Agent identity system (persistent reputation across projects)
- [ ] LangChain / LangGraph / CrewAI integrations
- [ ] Self-hosted scoring pipeline for enterprise
- [ ] Community-submitted benchmark tasks

---

## Contributing

We welcome contributions! The best ways to help:

1. **Submit telemetry** — Use ToolRoute in your agents and report outcomes
2. **Add MCP servers** — Know a server we're missing? [Submit it](https://toolroute.io/submit)
3. **Improve scores** — Run comparative benchmarks and submit results
4. **Code contributions** — PRs welcome for new features, bug fixes, and integrations

---

## License

MIT — see [LICENSE](./LICENSE)

---

<p align="center">
  <strong>Building something with AI agents?</strong><br/>
  Install ToolRoute first. Route smarter. Ship faster. Spend less.<br/><br/>
  <a href="https://toolroute.io">toolroute.io</a>
</p>
