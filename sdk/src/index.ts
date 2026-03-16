/**
 * @neoskill/sdk — Agent skill routing in two lines.
 *
 * Usage:
 *   const neo = new NeoSkill()
 *   const route = await neo.route({ task: 'web research' })
 *   // ... execute the skill ...
 *   await neo.report({ skill: route.recommended_skill, outcome: 'success', latency_ms: 1200 })
 */

export interface NeoSkillConfig {
  /** Base URL of the NeoSkill API. Default: https://neo-skill.vercel.app */
  baseUrl?: string
  /** Hard timeout in ms. Default: 800. NeoSkill never blocks your agent. */
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

export class NeoSkill {
  private baseUrl: string
  private timeoutMs: number
  private agentName?: string
  private agentKind?: string
  private modelFamily?: string
  private hostClient?: string

  constructor(config: NeoSkillConfig = {}) {
    this.baseUrl = (config.baseUrl || 'https://neo-skill.vercel.app').replace(/\/$/, '')
    this.timeoutMs = config.timeoutMs ?? 800
    this.agentName = config.agentName
    this.agentKind = config.agentKind
    this.modelFamily = config.modelFamily
    this.hostClient = config.hostClient
  }

  /**
   * Check if NeoSkill is reachable. Never throws — returns health status.
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
   * Get a skill recommendation for a task. Never throws — returns null on failure.
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
      const payload = {
        contribution_type: request.fallback_skill ? 'fallback_chain' : 'run_telemetry',
        agent_name: this.agentName || 'anonymous',
        agent_kind: this.agentKind || 'autonomous',
        model_family: this.modelFamily,
        host_client: this.hostClient,
        skill_slug: request.skill,
        runs: [
          {
            task_fingerprint: request.task_fingerprint || 'sdk-report',
            outcome: request.outcome,
            latency_ms: request.latency_ms,
            estimated_cost_usd: request.cost_usd,
            output_quality_rating: request.quality_rating,
            human_correction_minutes: request.human_correction_minutes,
            fallback_used_skill_slug: request.fallback_skill,
          },
        ],
      }

      const res = await this.fetch('POST', '/api/contributions', payload)
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
      reasoning: 'NeoSkill unreachable — proceed with your default skill.',
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

export default NeoSkill
