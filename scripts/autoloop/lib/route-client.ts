/**
 * route-client.ts — thin POST helpers for the live routing endpoints.
 *
 * Base URL from BENCH_BASE_URL (default https://toolroute.io). These are normal,
 * anonymous routing calls (they create the same decision-log rows any agent
 * request would) — read-only with respect to code/schema.
 */

const BASE = process.env.BENCH_BASE_URL || 'https://toolroute.io'

async function post(path: string, body: unknown, timeoutMs = 30000): Promise<any> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!res.ok) throw new Error(`${path} HTTP ${res.status}`)
  return res.json()
}

export interface SkillResult { recommended_skill: string | null; approach: string | null; match_method: string | null }

/** POST /api/route — skill + approach (+ model tier when direct_llm). */
export async function routeSkill(task: string, priority?: string): Promise<SkillResult & { model_tier: string | null }> {
  const body: any = { task }
  if (priority) body.constraints = { priority }
  const d = await post('/api/route', body)
  return {
    recommended_skill: d?.recommended_skill ?? null,
    approach: d?.approach ?? null,
    match_method: d?.routing_metadata?.match_method ?? null,
    model_tier: d?.recommended_model?.tier ?? null,
  }
}

/** POST /api/route/model — heuristic tier path. */
export async function routeModelTier(task: string): Promise<string | null> {
  const d = await post('/api/route/model', { task })
  return d?.tier ?? null
}

/** Resolve a tier-benchmark row to its live tier per mode. */
export async function tierFor(query: string, mode: string): Promise<string | null> {
  if (mode === 'model') return routeModelTier(query)
  if (mode.startsWith('route:')) {
    const priority = mode.slice('route:'.length)
    const r = await routeSkill(query, priority)
    return r.model_tier
  }
  throw new Error(`unknown tier mode: ${mode}`)
}
