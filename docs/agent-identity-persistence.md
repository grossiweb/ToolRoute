# Where to store `agent_identity_id`

When you call `POST /api/agents/register`, ToolRoute returns an `agent_identity_id` (a UUID). You pass it into subsequent `tr.routeModel(...)` and `tr.reportModel(...)` calls to get credit multipliers, routing memory, and project-specific recommendations.

**No API key is involved.** The `agent_identity_id` is not a secret — it's a stable identifier, like a user ID. You can commit it to your repo if you want to (most projects don't, just out of habit). The reason it matters: if you re-register without persisting the ID, you'll get a *different* UUID and lose your accumulated routing memory and credit balance for the original agent.

Registration is **idempotent**: calling `tr.register({ agent_name: 'my-agent' })` with the same name+host returns the same `agent_identity_id` every time. So the worst case of "forgot to persist" is a network round-trip on cold start, not data loss.

Four patterns, in order from "simplest" to "most robust":

---

## 1. Env var (simplest, serverless-friendly)

**Use when:** Vercel / Lambda / Cloudflare Workers / any serverless platform. You don't have a writable filesystem and you don't want to add Redis just for this.

**Trade-off:** you have to register once manually, copy the ID, and paste it into your platform's environment settings. After that, every cold start reads it for free with zero network overhead.

```ts
import { ToolRoute } from '@toolroute/sdk'

const tr = new ToolRoute({ agentName: 'sol-coloring' })

async function getAgentId(): Promise<string> {
  if (process.env.TOOLROUTE_AGENT_ID) return process.env.TOOLROUTE_AGENT_ID

  // First run only — register and tell the human to set the env var
  const { agent_identity_id } = await tr.register()
  console.warn(`Set TOOLROUTE_AGENT_ID=${agent_identity_id} in your environment`)
  return agent_identity_id
}
```

One-time bootstrap: run locally, copy the printed UUID, paste it into Vercel/Lambda config, redeploy.

---

## 2. Redis / KV store (for multi-instance)

**Use when:** you have multiple concurrent instances of the same agent (e.g. autoscaling web servers) and you want them to share the same `agent_identity_id`. Without shared state, each instance can race on registration — registration is idempotent so they'll converge, but it's wasted round-trips.

**Trade-off:** adds a dependency. Worth it only if you already have Redis/KV in your stack.

```ts
import { ToolRoute } from '@toolroute/sdk'
import { kv } from '@vercel/kv'  // or ioredis, upstash, etc.

const tr = new ToolRoute({ agentName: 'sol-coloring' })

async function getAgentId(): Promise<string> {
  const cached = await kv.get<string>('toolroute:agent_id')
  if (cached) return cached

  const { agent_identity_id } = await tr.register()
  await kv.set('toolroute:agent_id', agent_identity_id)  // permanent — no TTL
  return agent_identity_id
}
```

No TTL on the cache entry. The ID is stable forever; only invalidate it if you rotate `agent_name`.

---

## 3. Local file (for CLI agents like Claudia)

**Use when:** your agent runs on a single machine (laptop, VPS, container with a persistent volume). The filesystem is the cheapest persistent store.

**Trade-off:** doesn't survive container rebuilds unless you mount the path as a volume. For ephemeral CI runs, prefer pattern 1.

```ts
import { ToolRoute } from '@toolroute/sdk'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

const tr = new ToolRoute({ agentName: 'claudia' })
const idFile = path.join(os.homedir(), '.toolroute', 'agent-id')

async function getAgentId(): Promise<string> {
  try {
    return (await fs.readFile(idFile, 'utf8')).trim()
  } catch { /* not cached yet */ }

  const { agent_identity_id } = await tr.register()
  await fs.mkdir(path.dirname(idFile), { recursive: true })
  await fs.writeFile(idFile, agent_identity_id, 'utf8')
  return agent_identity_id
}
```

This is the pattern Claudia (the ToolRoute reference agent running on the VPS) uses. Survives reboots; trivial to inspect (`cat ~/.toolroute/agent-id`).

---

## 4. In-memory singleton (for long-running processes)

**Use when:** a single long-lived process — daemon, worker, IDE plugin, browser tab. You're happy to re-register on restart.

**Trade-off:** loses the ID on restart, so you'll do one extra registration call per process lifetime. Registration is idempotent, so this just costs a round-trip, not data integrity.

```ts
import { ToolRoute } from '@toolroute/sdk'

const tr = new ToolRoute({ agentName: 'sol-coloring' })

let cachedId: Promise<string> | null = null

function getAgentId(): Promise<string> {
  cachedId ??= tr.register().then(r => r.agent_identity_id)
  return cachedId  // resolves once, then returns instantly forever
}
```

The `??=` pattern means concurrent first calls all await the same in-flight promise — no thundering-herd registration on startup. After the first resolution, every call is synchronous-fast.

---

## Choosing between them

| You have... | Use |
|---|---|
| Serverless platform (Vercel, Lambda, Workers) | Env var |
| Multiple instances sharing state | Redis/KV |
| Single machine with persistent disk | Local file |
| Long-running single process | In-memory singleton |
| None of the above / unsure | Env var — easiest to migrate from later |

Whatever you pick, the underlying fact is: there's no API key to lose, no quota to manage, no rotation policy. `agent_identity_id` is just a UUID. Keep one around per agent_name and you're done.
