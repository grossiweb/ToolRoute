/**
 * @toolroute/sdk — Agent tool routing in two lines.
 *
 * Usage:
 *   const tr = new ToolRoute()
 *   const route = await tr.route({ task: 'web research' })
 *   // ... execute the tool ...
 *   await tr.report({ skill: route.recommended_skill, outcome: 'success', latency_ms: 1200 })
 */

export interface ToolRouteConfig {
  /** Base URL of the ToolRoute API. Default: https://toolroute.io */
  baseUrl?: string
  /** Hard timeout in ms. Default: 800. ToolRoute never blocks your agent. */
  timeoutMs?: number
  /** Agent name for telemetry attribution */
  agentName?: string
  /** Agent kind: autonomous, copilot, workflow, evaluation, hybrid */
  agentKind?: 'autonomous' | 'copilot' | 'workflow-agent' | 'evaluation-agent' | 'hybrid'
  /** Model family (e.g., 'claude-4', 'gpt-4o') */
  modelFamily?: string
  /** Host client slug (e.g., 'claude-code', 'cursor') */
  hostClient?: string
}

export interface RouteRequest {
  /** Natural language task description */
  task?: string
  /** Explicit workflow slug */
  workflow_slug?: string
  /** Industry vertical slug */
  vertical_slug?: string
  /** Routing constraints */
  constraints?: {
    priority?: 'best_value' | 'best_quality' | 'best_efficiency' | 'lowest_cost' | 'highest_trust' | 'most_reliable'
    max_cost_usd?: number
    trust_floor?: number
    latency_preference?: 'low' | 'medium' | 'high'
  }
}

export interface RouteResponse {
  recommended_skill: string | null
  recommended_skill_name?: string
  confidence: number
  reasoning: string
  alternatives: string[]
  recommended_combo: string[] | null
  fallback: string | null
  scores: Record<string, number> | null
  non_mcp_alternative: Record<string, string> | null
  routing_metadata: Record<string, any>
  wanted_telemetry: Record<string, any>
}

export interface ReportRequest {
  /** Skill slug that was used */
  skill: string
  /** Outcome status */
  outcome: 'success' | 'partial_success' | 'failure' | 'aborted'
  /** Latency in milliseconds */
  latency_ms?: number
  /** Estimated cost in USD */
  cost_usd?: number
  /** Output quality rating (0-10) */
  quality_rating?: number
  /** Task fingerprint for correlation */
  task_fingerprint?: string
  /** Whether a fallback was used */
  fallback_skill?: string
  /** Whether human correction was needed */
  human_correction_minutes?: number
}

export interface ReportResponse {
  accepted: boolean
  contribution_score?: number
  rewards?: {
    routing_credits: number
    economic_credits_usd: number
    reputation_points: number
  }
}

export interface PreflightResponse {
  healthy: boolean
  latency_ms: number
  version: string
}

export class ToolRoute {
  private baseUrl: string
  private timeoutMs: number
  private agentName?: string
  private agentKind?: string
  private modelFamily?: string
  private hostClient?: string

  constructor(config: ToolRouteConfig = {}) {
    this.baseUrl = (config.baseUrl || 'https://toolroute.io').replace(/\/$/, '')
    this.timeoutMs = config.timeoutMs ?? 800
    this.agentName = config.agentName
    this.agentKind = config.agentKind
    this.modelFamily = config.modelFamily
    this.hostClient = config.hostClient
  }

  /**
   * Check if ToolRoute is reachable. Never throws — returns health status.
   */
  async preflight(): Promise<PreflightResponse> {
    const start = Date.now()
    try {
      const res = await this.fetch('GET', '/.well-known')
      const data = await res.json()
      return {
        healthy: res.ok,
        latency_ms: Date.now() - start,
        version: data?.version || 'unknown',
      }
    } catch {
      return {
        healthy: false,
        latency_ms: Date.now() - start,
        version: 'unreachable',
      }
    }
  }

  /**
   * Get a tool recommendation for a task. Never throws — returns null on failure.
   */
  async route(request: RouteRequest): Promise<RouteResponse> {
    try {
      const res = await this.fetch('POST', '/api/route', request)
      if (!res.ok) {
        return this.fallbackRouteResponse(request)
      }
      return await res.json()
    } catch {
      return this.fallbackRouteResponse(request)
    }
  }

  /**
   * Report execution outcome. Fire-and-forget — never blocks your agent.
   */
  async report(request: ReportRequest): Promise<ReportResponse> {
    try {
      const isFallback = !!request.fallback_skill
      const contributionType = isFallback ? 'fallback_chain' : 'run_telemetry'

      let payload: Record<string, any>

      if (isFallback) {
        payload = {
          chain: [
            {
              skill_slug: request.skill,
              outcome: request.outcome,
              latency_ms: request.latency_ms,
              estimated_cost_usd: request.cost_usd,
              output_quality_rating: request.quality_rating,
              task_fingerprint: request.task_fingerprint,
            },
            {
              skill_slug: request.fallback_skill,
              outcome: request.outcome,
              latency_ms: request.latency_ms,
              task_fingerprint: request.task_fingerprint,
            },
          ],
        }
      } else {
        payload = {
          skill_slug: request.skill,
          outcome_status: request.outcome,
          latency_ms: request.latency_ms,
          estimated_cost_usd: request.cost_usd,
          output_quality_rating: request.quality_rating,
          task_fingerprint: request.task_fingerprint,
          human_correction_minutes: request.human_correction_minutes,
        }
      }

      const body = {
        contribution_type: contributionType,
        payload,
        proof_type: 'self_reported',
      }

      const res = await this.fetch('POST', '/api/contributions', body)
      if (!res.ok) {
        return { accepted: false }
      }
      return await res.json()
    } catch {
      return { accepted: false }
    }
  }

  /**
   * List available benchmark missions.
   */
  async missions(eventSlug?: string): Promise<any> {
    try {
      const params = eventSlug ? `?event=${eventSlug}` : ''
      const res = await this.fetch('GET', `/api/missions/available${params}`)
      if (!res.ok) return { missions: [], total: 0 }
      return await res.json()
    } catch {
      return { missions: [], total: 0 }
    }
  }

  // --- Internal ---

  private async fetch(method: string, path: string, body?: any): Promise<Response> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const options: RequestInit = {
        method,
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
      }
      if (body && method !== 'GET') {
        options.body = JSON.stringify(body)
      }
      return await globalThis.fetch(`${this.baseUrl}${path}`, options)
    } finally {
      clearTimeout(timer)
    }
  }

  private fallbackRouteResponse(request: RouteRequest): RouteResponse {
    return {
      recommended_skill: null,
      confidence: 0,
      reasoning: 'ToolRoute unreachable — proceed with your default tool.',
      alternatives: [],
      recommended_combo: null,
      fallback: null,
      scores: null,
      non_mcp_alternative: null,
      routing_metadata: { error: 'timeout_or_unreachable' },
      wanted_telemetry: {},
    }
  }
}

/** @deprecated Use ToolRoute instead */
export const NeoSkill = ToolRoute

export default ToolRoute
