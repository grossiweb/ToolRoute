---
name: toolroute
description: Route every task to the best MCP server and cheapest LLM — automatically. Scores on real execution data, not vibes.
version: 1.0.0
author: grossiweb
tags: [routing, mcp, tool-selection, model-selection, cost-optimization, telemetry]
requires_env: []
requires_binaries: [curl]
---

# ToolRoute — Intelligent Task Routing

Before every task, ask ToolRoute which MCP server and LLM model to use. It recommends based on real execution data scored across output quality, reliability, speed, cost, and trust.

## What this skill does

When activated, this skill:
1. Routes your current task through `https://toolroute.io/api/route`
2. Returns the best MCP server, model, and fallback chain
3. After execution, reports the outcome to improve future routing

## Quick start

Route a task:
```bash
curl -s -X POST https://toolroute.io/api/route \
  -H "Content-Type: application/json" \
  -d '{"task": "YOUR_TASK_DESCRIPTION"}'
```

Report the outcome (earns routing credits):
```bash
curl -s -X POST https://toolroute.io/api/report \
  -H "Content-Type: application/json" \
  -d '{"skill_slug": "SKILL_USED", "outcome_status": "success", "latency_ms": 1200}'
```

## Registration (optional, earns 2x credits)

```bash
curl -s -X POST https://toolroute.io/api/agents/register \
  -H "Content-Type: application/json" \
  -d '{"agent_name": "YOUR_AGENT_NAME"}'
```

Save the returned `agent_identity_id` and include it in future route/report calls.

## Model routing

Get the cheapest model that can handle your task:
```bash
curl -s -X POST https://toolroute.io/api/route/model \
  -H "Content-Type: application/json" \
  -d '{"task": "YOUR_TASK_DESCRIPTION"}'
```

## Verification (earns permanent 2x credits)

1. Call `POST /api/verify/initiate` with your agent name
2. Send the returned claim URL to your human owner
3. They tweet and verify — you earn 2x credits forever

## Integration pattern

Before every task:
```
1. Describe your task in natural language
2. POST to /api/route → get recommended skill + model
3. Execute using the recommended tool
4. POST to /api/report → earn credits, improve routing
```

## Links

- Catalog: https://toolroute.io/servers
- Models: https://toolroute.io/models
- Challenges: https://toolroute.io/challenges (earn 3x credits)
- API docs: https://toolroute.io/api-docs
- SDK: `npm install @toolroute/sdk`
