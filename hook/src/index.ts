/**
 * @toolroute/hook — Auto-route every task through ToolRoute.
 *
 * Install once. Every task your agent runs gets:
 * - Best MCP server recommendation
 * - Best LLM model recommendation
 * - Automatic outcome reporting (earns credits)
 *
 * Usage:
 *   import { createHook } from '@toolroute/hook'
 *   const hook = createHook({ agentName: 'my-agent' })
 *
 *   // Wrap any task
 *   const result = await hook.run('research competitor pricing', async (routing) => {
 *     console.log(`Using: ${routing.skill} + ${routing.model}`)
 *     // ... your task logic ...
 *     return { data: 'your result' }
 *   })
 */

const TOOLROUTE_API = 'https://toolroute.io'
const DEFAULT_TIMEOUT = 1500

export interface HookConfig {
  /** Your registered agent name */
  agentName?: string
  /** Your agent_identity_id (from /api/agents/register) */
  agentIdentityId?: string
  /** Timeout in ms for routing calls. Default: 1500 */
  timeoutMs?: number
  /** Base URL override. Default: https://toolroute.io */
  baseUrl?: string
  /** Log routing decisions to console. Default: false */
  verbose?: boolean
  /** Skip routing and just execute. Useful for A/B testing. Default: false */
  bypass?: boolean
}

export interface RoutingContext {
  /** Recommended MCP server slug */
  skill: string | null
  /** Recommended MCP server name */
  skillName: string | null
  /** Routing confidence (0-1) */
  confidence: number
  /** Recommended LLM model alias */
  model: string | null
  /** Model provider ID */
  modelProvider: string | null
  /** Fallback skill if primary fails */
  fallback: string | null
  /** Alternative skills to consider */
  alternatives: string[]
  /** Whether routing was successful */
  routed: boolean
  /** Raw routing response */
  raw: any
}

export interface TaskResult<T> {
  /** Your task's return value */
  data: T
  /** Routing context used for this task */
  routing: RoutingContext
  /** Total execution time in ms */
  executionMs: number
  /** Whether outcome was reported to ToolRoute */
  reported: boolean
  /** Credits earned from reporting */
  creditsEarned: number
}

interface ToolRouteHook {
  /**
   * Route and execute a task. Wraps your function with automatic
   * routing before and reporting after.
   */
  run: <T>(task: string, fn: (routing: RoutingContext) => Promise<T>) => Promise<TaskResult<T>>

  /**
   * Just get a routing recommendation without executing anything.
   */
  route: (task: string) => Promise<RoutingContext>

  /**
   * Report an outcome manually (if not using run()).
   */
  report: (skill: string, outcome: 'success' | 'partial_success' | 'failure', latencyMs?: number) => Promise<boolean>

  /**
   * Register your agent (idempotent).
   */
  register: () => Promise<{ agentIdentityId: string | null; agentName: string | null }>
}

async function fetchWithTimeout(url: string, opts: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...opts, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

export function createHook(config: HookConfig = {}): ToolRouteHook {
  const baseUrl = (config.baseUrl || TOOLROUTE_API).replace(/\/$/, '')
  const timeout = config.timeoutMs ?? DEFAULT_TIMEOUT
  const verbose = config.verbose ?? false
  const bypass = config.bypass ?? false

  let agentIdentityId = config.agentIdentityId || null

  function log(...args: any[]) {
    if (verbose) console.log('[toolroute]', ...args)
  }

  async function routeTask(task: string): Promise<RoutingContext> {
    if (bypass) {
      return { skill: null, skillName: null, confidence: 0, model: null, modelProvider: null, fallback: null, alternatives: [], routed: false, raw: null }
    }

    try {
      const body: any = { task }
      if (agentIdentityId) body.agent_identity_id = agentIdentityId

      const res = await fetchWithTimeout(`${baseUrl}/api/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }, timeout)

      if (!res.ok) {
        log('Route failed:', res.status)
        return { skill: null, skillName: null, confidence: 0, model: null, modelProvider: null, fallback: null, alternatives: [], routed: false, raw: null }
      }

      const data = await res.json()

      const ctx: RoutingContext = {
        skill: data.recommended_skill,
        skillName: data.recommended_skill_name || null,
        confidence: data.confidence || 0,
        model: data.recommended_model?.alias || data.recommended_model?.recommended_alias || null,
        modelProvider: data.recommended_model?.provider_model_id || null,
        fallback: data.fallback || null,
        alternatives: data.alternatives || [],
        routed: true,
        raw: data,
      }

      log(`Routed → ${ctx.skillName || ctx.skill} (${(ctx.confidence * 100).toFixed(0)}% confidence)`)
      if (ctx.model) log(`Model → ${ctx.model}`)

      return ctx
    } catch (err) {
      log('Route error:', err)
      return { skill: null, skillName: null, confidence: 0, model: null, modelProvider: null, fallback: null, alternatives: [], routed: false, raw: null }
    }
  }

  async function reportOutcome(skill: string, outcome: 'success' | 'partial_success' | 'failure', latencyMs?: number): Promise<boolean> {
    try {
      const body: any = {
        contribution_type: 'run_telemetry',
        payload: {
          skill_slug: skill,
          outcome_status: outcome,
          latency_ms: latencyMs,
        },
        proof_type: 'self_reported',
      }
      if (agentIdentityId) body.agent_identity_id = agentIdentityId

      const res = await fetchWithTimeout(`${baseUrl}/api/contributions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }, timeout)

      if (res.ok) {
        log(`Reported ${outcome} for ${skill}`)
        return true
      }
      return false
    } catch {
      return false
    }
  }

  return {
    async run<T>(task: string, fn: (routing: RoutingContext) => Promise<T>): Promise<TaskResult<T>> {
      const start = Date.now()

      // Route
      const routing = await routeTask(task)

      // Execute
      let data: T
      let outcome: 'success' | 'failure' = 'success'
      try {
        data = await fn(routing)
      } catch (err) {
        outcome = 'failure'
        throw err
      } finally {
        const executionMs = Date.now() - start

        // Report (fire-and-forget)
        let reported = false
        let creditsEarned = 0
        if (routing.skill) {
          reported = await reportOutcome(routing.skill, outcome, executionMs)
          if (reported) creditsEarned = outcome === 'success' ? 5 : 2
        }
      }

      const executionMs = Date.now() - start
      let reported = false
      let creditsEarned = 0
      if (routing.skill) {
        reported = await reportOutcome(routing.skill, outcome, executionMs)
        if (reported) creditsEarned = outcome === 'success' ? 5 : 2
      }

      return { data: data!, routing, executionMs, reported, creditsEarned }
    },

    route: routeTask,
    report: reportOutcome,

    async register() {
      if (!config.agentName) return { agentIdentityId: null, agentName: null }

      try {
        const res = await fetchWithTimeout(`${baseUrl}/api/agents/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent_name: config.agentName }),
        }, timeout)

        if (res.ok) {
          const data = await res.json()
          agentIdentityId = data.agent_identity_id || null
          log(`Registered as ${config.agentName} (${agentIdentityId})`)
          return { agentIdentityId, agentName: config.agentName }
        }
      } catch {}

      return { agentIdentityId: null, agentName: null }
    },
  }
}

export default createHook
