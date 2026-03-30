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
  /**
   * Ed25519 private key (PEM, pkcs8 format) for cryptographic report signing.
   * When set, reportModel() auto-signs every call — anti-gaming penalties bypassed,
   * proof_type becomes 'client_signed', full credit multiplier always applied.
   *
   * Generate: crypto.generateKeyPairSync('ed25519', { privateKeyEncoding: { type: 'pkcs8', format: 'pem' } })
   * Register public key: include public_key in POST /api/agents/register
   */
  signingKey?: string
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

export interface ModelRouteRequest {
  /** Natural language task description */
  task: string
  /** Constraints for model selection */
  constraints?: {
    max_cost_per_mtok?: number
    max_latency_ms?: number
    min_context_window?: number
    preferred_providers?: string[]
    excluded_providers?: string[]
  }
}

export interface ModelRouteResponse {
  recommended_model: string
  recommended_alias: string
  provider: string
  tier: string
  confidence: number
  reasoning: string
  fallback_chain: string[]
  escalation: { next_tier: string; alias: string } | null
  cost_estimate: { input_per_mtok: number; output_per_mtok: number; estimated_task_cost: number }
  routing_metadata: Record<string, any>
  decision_id: string
}

export interface ModelReportRequest {
  /** Model slug that was used */
  model_slug: string
  /** Outcome status */
  outcome_status: 'success' | 'partial_success' | 'failure' | 'aborted'
  /** Decision ID from model route response */
  decision_id?: string
  /** Latency in ms */
  latency_ms?: number
  /** Input tokens consumed */
  input_tokens?: number
  /** Output tokens generated */
  output_tokens?: number
  /** Estimated cost in USD */
  estimated_cost_usd?: number
  /** Output quality rating (0-10). Lowest trust weight — prefer output_snippet for LLM verification */
  output_quality_rating?: number
  /** First 500 chars of model output — enables async LLM quality verification (highest trust) */
  output_snippet?: string
  /** The task/prompt sent to the model — required alongside output_snippet for LLM evaluation */
  task?: string
  /** How many retries were needed (0 = clean run) */
  retry_count?: number
  /** Did structured output parse correctly? */
  structured_output_valid?: boolean
  /** Did tool calls succeed? */
  tool_calls_succeeded?: boolean
  /** Was hallucination detected? */
  hallucination_detected?: boolean
}

export interface ModelVerifyRequest {
  /** Model slug */
  model_slug: string
  /** Original task description */
  task: string
  /** First 500 chars of model output */
  output_snippet: string
  /** Decision ID from model route */
  decision_id?: string
  /** Expected output format */
  expected_format?: 'json' | 'code' | 'markdown' | 'text'
}

export interface ModelVerifyResponse {
  verified: boolean
  quality_score: number
  model_slug: string
  checks: Record<string, { pass: boolean; detail?: string; overlap?: number }>
  recommendation: 'output_acceptable' | 'retry_suggested' | 'escalate_model'
  credits_earned: number
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
  private signingKey?: string

  constructor(config: ToolRouteConfig = {}) {
    this.baseUrl = (config.baseUrl || 'https://toolroute.io').replace(/\/$/, '')
    this.timeoutMs = config.timeoutMs ?? 800
    this.agentName = config.agentName
    this.agentKind = config.agentKind
    this.modelFamily = config.modelFamily
    this.hostClient = config.hostClient
    this.signingKey = config.signingKey
  }

  /**
   * Build a cryptographic commitment for a model report.
   * Returns commitment_hash, report_signature, report_timestamp.
   * Only available in Node.js environments (uses built-in crypto).
   * Returns null in browser environments or if signingKey is not set.
   */
  private buildCommitment(
    modelSlug: string,
    outcomeStatus: string,
    outputSnippet?: string
  ): { commitment_hash: string; report_signature: string; report_timestamp: number } | null {
    if (!this.signingKey) return null

    try {
      // Dynamic import for Node.js — keeps SDK browser-compatible
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createHash, sign: cryptoSign, createPrivateKey } = require('crypto')

      const timestamp = Math.floor(Date.now() / 1000)
      const outputHash = createHash('sha256').update(outputSnippet || '', 'utf8').digest('hex')
      const commitment = `${modelSlug}:${outcomeStatus}:${timestamp}:${outputHash}`
      const commitmentHash = createHash('sha256').update(commitment, 'utf8').digest('hex')

      const privKey = createPrivateKey(this.signingKey)
      const sig = cryptoSign(null, Buffer.from(commitmentHash, 'utf8'), privKey)

      return {
        commitment_hash: commitmentHash,
        report_signature: sig.toString('base64'),
        report_timestamp: timestamp,
      }
    } catch {
      return null
    }
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
   * Model routing namespace — route, report, and verify LLM model outputs.
   */
  model = {
    /**
     * Get an LLM model recommendation for a task. Returns alias, provider model ID,
     * fallback chain, escalation path, and cost estimate.
     */
    route: async (request: ModelRouteRequest): Promise<ModelRouteResponse> => {
      try {
        const res = await this.fetch('POST', '/api/route/model', request)
        if (!res.ok) {
          return {
            recommended_model: '', recommended_alias: '', provider: '', tier: 'fast_code',
            confidence: 0, reasoning: 'ToolRoute unreachable — use your default model.',
            fallback_chain: [], escalation: null, cost_estimate: { input_per_mtok: 0, output_per_mtok: 0, estimated_task_cost: 0 },
            routing_metadata: { error: 'unreachable' }, decision_id: '',
          }
        }
        return await res.json()
      } catch {
        return {
          recommended_model: '', recommended_alias: '', provider: '', tier: 'fast_code',
          confidence: 0, reasoning: 'ToolRoute unreachable — use your default model.',
          fallback_chain: [], escalation: null, cost_estimate: { input_per_mtok: 0, output_per_mtok: 0, estimated_task_cost: 0 },
          routing_metadata: { error: 'timeout' }, decision_id: '',
        }
      }
    },

    /**
     * Report LLM model execution outcome. Earns routing credits.
     * If signingKey is configured, auto-signs the report for proof_type: client_signed.
     */
    report: async (request: ModelReportRequest): Promise<{ accepted: boolean; credits_earned?: number; proof_type?: string }> => {
      try {
        const body: Record<string, any> = { ...request }

        // Auto-sign if private key is configured
        const commitment = this.buildCommitment(
          request.model_slug,
          request.outcome_status,
          request.output_snippet
        )
        if (commitment) {
          body.commitment_hash = commitment.commitment_hash
          body.report_signature = commitment.report_signature
          body.report_timestamp = commitment.report_timestamp
        }

        const res = await this.fetch('POST', '/api/report/model', body)
        if (!res.ok) return { accepted: false }
        return await res.json()
      } catch {
        return { accepted: false }
      }
    },

    /**
     * Lightweight output verification — deterministic checks, no LLM needed.
     * Run after model execution to validate format, detect refusals, measure coherence.
     */
    verify: async (request: ModelVerifyRequest): Promise<ModelVerifyResponse> => {
      try {
        const res = await this.fetch('POST', '/api/verify/model', request)
        if (!res.ok) {
          return { verified: false, quality_score: 0, model_slug: request.model_slug, checks: {}, recommendation: 'retry_suggested', credits_earned: 0 }
        }
        return await res.json()
      } catch {
        return { verified: false, quality_score: 0, model_slug: request.model_slug, checks: {}, recommendation: 'retry_suggested', credits_earned: 0 }
      }
    },
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

  /** Register your agent. Idempotent — safe to call every time. */
  async register(opts: { agent_name: string; agent_kind?: string; host_client_slug?: string; model_family?: string; webhook_url?: string; public_key?: string }): Promise<any> {
    try {
      const res = await this.fetch('POST', '/api/agents/register', opts)
      if (!res.ok) return { error: 'Registration failed' }
      return await res.json()
    } catch { return { error: 'unreachable' } }
  }

  /** Check your real credit balance. */
  async balance(agentIdentityId: string): Promise<any> {
    try {
      const res = await this.fetch('GET', `/api/agent-dashboard?agent_identity_id=${agentIdentityId}`)
      if (!res.ok) return { total_routing_credits: 0, total_reputation_points: 0 }
      return await res.json()
    } catch { return { total_routing_credits: 0, total_reputation_points: 0 } }
  }

  /** Get guided walkthrough. */
  async help(agentIdentityId?: string): Promise<any> {
    try {
      const body = agentIdentityId ? { agent_identity_id: agentIdentityId } : {}
      const res = await this.fetch('POST', '/api/mcp', {
        jsonrpc: '2.0', id: 1, method: 'tools/call',
        params: { name: 'toolroute_help', arguments: body },
      })
      if (!res.ok) return {}
      const data = await res.json()
      return JSON.parse(data?.result?.content?.[0]?.text || '{}')
    } catch { return {} }
  }

  /** Claim a benchmark mission. */
  async claimMission(opts: { mission_id: string; agent_identity_id: string }): Promise<any> {
    try {
      const res = await this.fetch('POST', '/api/missions/claim', opts)
      if (!res.ok) return { error: 'Claim failed' }
      return await res.json()
    } catch { return { error: 'unreachable' } }
  }

  /** Submit mission results. */
  async completeMission(opts: { claim_id: string; results: any[] }): Promise<any> {
    try {
      const res = await this.fetch('POST', '/api/missions/complete', opts)
      if (!res.ok) return { error: 'Completion failed' }
      return await res.json()
    } catch { return { error: 'unreachable' } }
  }

  /** List workflow challenges. */
  async challenges(opts?: { category?: string; difficulty?: string }): Promise<any> {
    try {
      const params = new URLSearchParams()
      if (opts?.category) params.set('category', opts.category)
      if (opts?.difficulty) params.set('difficulty', opts.difficulty)
      const qs = params.toString() ? `?${params.toString()}` : ''
      const res = await this.fetch('GET', `/api/challenges${qs}`)
      if (!res.ok) return { challenges: [] }
      return await res.json()
    } catch { return { challenges: [] } }
  }

  /** Submit challenge results. */
  async submitChallenge(opts: { challenge_slug: string; agent_identity_id: string; tools_used: any[]; steps_taken: number; [key: string]: any }): Promise<any> {
    try {
      const res = await this.fetch('POST', '/api/challenges/submit', opts)
      if (!res.ok) return { error: 'Submission failed' }
      return await res.json()
    } catch { return { error: 'unreachable' } }
  }

  /** Search the MCP server catalog. */
  async search(opts?: { query?: string; workflow?: string; vertical?: string; limit?: number }): Promise<any> {
    try {
      const params = new URLSearchParams()
      if (opts?.query) params.set('q', opts.query)
      if (opts?.workflow) params.set('workflow', opts.workflow)
      if (opts?.vertical) params.set('vertical', opts.vertical)
      if (opts?.limit) params.set('limit', String(opts.limit))
      const qs = params.toString() ? `?${params.toString()}` : ''
      const res = await this.fetch('GET', `/api/skills${qs}`)
      if (!res.ok) return []
      return await res.json()
    } catch { return [] }
  }

  /** Compare 2-4 skills side by side. */
  async compare(skillSlugs: string[]): Promise<any> {
    try {
      const res = await this.fetch('POST', '/api/mcp', {
        jsonrpc: '2.0', id: 1, method: 'tools/call',
        params: { name: 'toolroute_compare', arguments: { skill_slugs: skillSlugs } },
      })
      if (!res.ok) return []
      const data = await res.json()
      return JSON.parse(data?.result?.content?.[0]?.text || '[]')
    } catch { return [] }
  }

  /** Route to best model (convenience wrapper for model.route). */
  async routeModel(request: ModelRouteRequest): Promise<ModelRouteResponse> {
    return this.model.route(request)
  }

  /** Report model outcome (convenience wrapper for model.report). */
  async reportModel(request: ModelReportRequest): Promise<{ accepted: boolean; credits_earned?: number }> {
    return this.model.report(request)
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
