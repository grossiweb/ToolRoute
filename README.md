# ToolRoute

Routing layer for AI agents. One call returns the best MCP server and LLM for any task — scored on 132 real benchmark executions.

[![MIT](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

---

## Quick start

Add to any MCP client (Claude Code, Cursor, Windsurf, Cline):

```json
{
  "mcpServers": {
    "toolroute": {
      "url": "https://toolroute.io/api/mcp"
    }
  }
}
```

Or via HTTP:

```bash
curl -X POST https://toolroute.io/api/route \
  -H "Content-Type: application/json" \
  -d '{"task": "search the web for recent AI papers"}'
```

```json
{
  "approach": "mcp_server",
  "recommended_skill": "exa-mcp-server",
  "recommended_model": "gemini-flash-2.0",
  "confidence": 0.91
}
```

---

## How it works

Every task falls into one of three approaches:

| Approach | When | Returns |
|---|---|---|
| `direct_llm` | Task needs only an LLM (code, writing, analysis) | Best model + cost estimate |
| `mcp_server` | Task needs an external tool (search, email, calendar) | Best tool + best model |
| `multi_tool` | Compound task ("send Slack AND update Jira AND email") | Ordered orchestration chain |

Routing uses an LLM classifier (~$0.00001/call) for task understanding, then ranks candidates on a 5-dimension score:

```
Value Score = 0.35 × Output Quality
            + 0.25 × Reliability
            + 0.15 × Efficiency
            + 0.15 × Cost
            + 0.10 × Trust
```

Every reported outcome updates the scores. The routing gets more accurate as more agents use it.

---

## Benchmark results

132 blind A/B executions across code, writing, analysis, structured output, and translation.

| | ToolRoute | Fixed GPT-4o |
|---|---|---|
| Quality wins | 6 | 0 |
| Ties | 9 | 9 |
| Losses | 0 | — |
| Avg cost | $0.001–0.01 | $0.03–0.10 |

---

## API

| Endpoint | Method | Description |
|---|---|---|
| `/api/route` | POST | Route a task to best MCP server + LLM |
| `/api/mcp` | POST (JSON-RPC) | MCP server — 16 tools |
| `/api/mcp` | GET (SSE) | SSE transport for MCP clients |
| `/api/report/model` | POST | Report model outcome |
| `/api/verify/model` | POST | Verify model output quality |
| `/api/skills` | GET | Search MCP server catalog |
| `/api/agents/register` | POST | Register agent identity |

Full reference at [toolroute.io/api-docs](https://toolroute.io/api-docs)

---

## SDK

```bash
npm install @toolroute/sdk
```

```typescript
import { ToolRoute } from '@toolroute/sdk'

const tr = new ToolRoute()
const rec = await tr.route({ task: 'parse this CSV and summarize it' })
// execute with rec.recommended_model ...
await tr.report({ skill: rec.recommended_skill, outcome: 'success', latency_ms: 1400 })
```

---

## Self-hosting

```bash
git clone https://github.com/grossiweb/ToolRoute.git
cd ToolRoute
cp .env.local.example .env.local
npm install
npm run dev
```

Requires: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

---

## How routing works

ToolRoute classifies each task using an LLM classifier (Gemini Flash Lite,
~$0.00001/call) with a keyword fallback. The resulting tier maps to a specific
model via `src/lib/routing/tiers.ts`. Live pricing and capability data come
from the `models` table. See [docs/architecture.md](./docs/architecture.md)
for the full picture.

---

## Stack

Next.js 14 (App Router) · Supabase (Postgres) · Vercel

## License

MIT
