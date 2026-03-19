<h1 align="center">toolroute.</h1>

<p align="center">
  <strong>Your agent is using the wrong model.</strong><br/>
  ToolRoute picks the cheapest LLM that actually works — automatically.
</p>

<p align="center">
  <a href="https://toolroute.io">Website</a> ·
  <a href="https://toolroute.io/api-docs">API Docs</a> ·
  <a href="https://toolroute.io/models">Browse Models</a> ·
  <a href="https://toolroute.io/servers">Browse Servers</a> ·
  <a href="https://www.npmjs.com/package/@toolroute/sdk">SDK</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/LLM_Models-20+-6C47D8" alt="20+ LLM models" />
  <img src="https://img.shields.io/badge/MCP_Servers-200+-06b6d4" alt="200+ MCP servers" />
  <img src="https://img.shields.io/badge/Cost-Free-0F6E56" alt="Free" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT license" />
</p>

---

## The Problem

Your agent sends every task to GPT-4o. A simple CSV parse costs the same as a complex architecture review. No fallbacks. No learning. Just burning tokens.

**ToolRoute fixes this.** Ask which model to use before every call. Get the cheapest one that works. If it fails, we tell your agent what to try next.

## Quick Start

### Add as MCP Server (30 seconds, zero code)

Works with Claude Code, Cursor, Windsurf, Replit, or any MCP client.

```json
{
  "mcpServers": {
    "toolroute": {
      "url": "https://toolroute.io/api/mcp"
    }
  }
}
```

Your agent gets 11 tools: `model_route`, `model_report`, `model_verify`, `route`, `search`, `compare`, `report`, and more.

### Use with OpenRouter

```typescript
import { ToolRoute } from '@toolroute/sdk'
import OpenAI from 'openai'

const tr = new ToolRoute()
const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
})

// 1. Ask ToolRoute which model to use
const rec = await tr.model.route({ task: "parse CSV file" })
// → { model: "gpt-4o-mini", tier: "cheap_structured", cost: $0.002 }

// 2. Call via OpenRouter with the recommended model
const result = await openrouter.chat.completions.create({
  model: rec.model_details.provider_model_id,
  messages: [{ role: "user", content: "Parse this CSV..." }],
})

// 3. Report outcome → routing gets smarter for everyone
await tr.model.report({
  model_slug: rec.model_details.slug,
  outcome_status: "success"
})
```

### cURL

```bash
# Which model should I use?
curl -X POST https://toolroute.io/api/route/model \
  -H "Content-Type: application/json" \
  -d '{"task": "parse CSV file"}'

# Which MCP server should I use?
curl -X POST https://toolroute.io/api/route \
  -H "Content-Type: application/json" \
  -d '{"task": "web scraping"}'
```

---

## What You Get

### Model Routing
- **6 tiers**: cheap_chat, cheap_structured, fast_code, reasoning_pro, tool_agent, best_available
- **20+ models** across OpenAI, Anthropic, Google, Meta, Mistral, DeepSeek
- **Cost estimates** before you call
- **Fallback chains** within the same tier
- **Auto-escalation** to a higher tier if the model fails
- **60-90% cheaper** than defaulting to GPT-4o

### Tool Routing
- **200+ MCP servers** scored on real execution data
- **5-dimension scoring**: Output Quality, Reliability, Efficiency, Cost, Trust
- **Confidence-scored recommendations** with alternatives
- **Fallback chains** if the primary tool fails

### Works With

OpenRouter · LiteLLM · Claude Code · Cursor · Windsurf · Replit · Lovable · v0

---

## How It Works

```
Your Agent                    ToolRoute                     LLM Provider
    │                             │                              │
    │  "Which model for this?"    │                              │
    ├────────────────────────────▶│                              │
    │                             │  Analyze task signals        │
    │                             │  Match to cheapest tier      │
    │    model + cost + fallback  │  Build fallback chain        │
    │◀────────────────────────────┤                              │
    │                             │                              │
    │  Call recommended model     │                              │
    ├─────────────────────────────┼─────────────────────────────▶│
    │                             │                              │
    │  Report outcome (optional)  │                              │
    ├────────────────────────────▶│  Update routing scores       │
    │                             │  Award credits               │
```

1. **Route** — Agent asks which model/tool to use (~20ms)
2. **Execute** — Agent calls the model with its own API keys (ToolRoute never proxies)
3. **Escalate** — If the model fails, ToolRoute says what to try next
4. **Report** — Agent reports outcome. Routing gets smarter for all agents.

---

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/route/model` | POST | Which LLM model should I use? |
| `/api/route` | POST | Which MCP server should I use? |
| `/api/report/model` | POST | Report model execution outcome |
| `/api/report` | POST | Report tool execution outcome |
| `/api/verify/model` | POST | Verify model output quality |
| `/api/mcp` | POST | MCP JSON-RPC server (11 tools) |
| `/api/agents/register` | POST | Register agent identity |
| `/api/verify` | POST | Verify agent via tweet |
| `/api/skills` | GET | Search MCP server catalog |

Full documentation at [toolroute.io/api-docs](https://toolroute.io/api-docs)

---

## Agent Verification

Verify your agent by tweeting about ToolRoute. Get 2x credits, verified badge, and priority routing.

Visit [toolroute.io/verify](https://toolroute.io/verify)

---

## Self-Hosting

```bash
git clone https://github.com/grossiweb/ToolRoute.git
cd ToolRoute
cp .env.local.example .env.local
# Fill in Supabase credentials
npm install
npm run dev
```

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |

---

**Stack**: Next.js 14 (App Router) · Supabase (Postgres) · Tailwind CSS · Vercel

## Contributing

1. **Use ToolRoute** — Report outcomes to improve routing for everyone
2. **Submit servers** — Know an MCP server we're missing? [Submit it](https://toolroute.io/submit)
3. **Verify your agent** — Tweet about ToolRoute at [/verify](https://toolroute.io/verify)
4. **Code** — PRs welcome

## License

MIT

---

<p align="center">
  <strong>Stop overspending on LLM tokens.</strong><br/>
  Add ToolRoute. Route smarter. Spend less.<br/><br/>
  <a href="https://toolroute.io">toolroute.io</a>
</p>
