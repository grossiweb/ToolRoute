// src/index.ts
var ToolRoute = class {
  constructor(config = {}) {
    /**
     * Model routing namespace — route, report, and verify LLM model outputs.
     */
    this.model = {
      /**
       * Get an LLM model recommendation for a task. Returns alias, provider model ID,
       * fallback chain, escalation path, and cost estimate.
       */
      route: async (request) => {
        try {
          const res = await this.fetch("POST", "/api/route/model", request);
          if (!res.ok) {
            return {
              recommended_model: "",
              recommended_alias: "",
              provider: "",
              tier: "fast_code",
              confidence: 0,
              reasoning: "ToolRoute unreachable \u2014 use your default model.",
              fallback_chain: [],
              escalation: null,
              cost_estimate: { input_per_mtok: 0, output_per_mtok: 0, estimated_task_cost: 0 },
              routing_metadata: { error: "unreachable" },
              decision_id: ""
            };
          }
          return await res.json();
        } catch {
          return {
            recommended_model: "",
            recommended_alias: "",
            provider: "",
            tier: "fast_code",
            confidence: 0,
            reasoning: "ToolRoute unreachable \u2014 use your default model.",
            fallback_chain: [],
            escalation: null,
            cost_estimate: { input_per_mtok: 0, output_per_mtok: 0, estimated_task_cost: 0 },
            routing_metadata: { error: "timeout" },
            decision_id: ""
          };
        }
      },
      /**
       * Report LLM model execution outcome. Earns routing credits.
       */
      report: async (request) => {
        try {
          const res = await this.fetch("POST", "/api/report/model", request);
          if (!res.ok) return { accepted: false };
          return await res.json();
        } catch {
          return { accepted: false };
        }
      },
      /**
       * Lightweight output verification — deterministic checks, no LLM needed.
       * Run after model execution to validate format, detect refusals, measure coherence.
       */
      verify: async (request) => {
        try {
          const res = await this.fetch("POST", "/api/verify/model", request);
          if (!res.ok) {
            return { verified: false, quality_score: 0, model_slug: request.model_slug, checks: {}, recommendation: "retry_suggested", credits_earned: 0 };
          }
          return await res.json();
        } catch {
          return { verified: false, quality_score: 0, model_slug: request.model_slug, checks: {}, recommendation: "retry_suggested", credits_earned: 0 };
        }
      }
    };
    this.baseUrl = (config.baseUrl || "https://toolroute.io").replace(/\/$/, "");
    this.timeoutMs = config.timeoutMs ?? 800;
    this.agentName = config.agentName;
    this.agentKind = config.agentKind;
    this.modelFamily = config.modelFamily;
    this.hostClient = config.hostClient;
  }
  /**
   * Check if ToolRoute is reachable. Never throws — returns health status.
   */
  async preflight() {
    const start = Date.now();
    try {
      const res = await this.fetch("GET", "/.well-known");
      const data = await res.json();
      return {
        healthy: res.ok,
        latency_ms: Date.now() - start,
        version: data?.version || "unknown"
      };
    } catch {
      return {
        healthy: false,
        latency_ms: Date.now() - start,
        version: "unreachable"
      };
    }
  }
  /**
   * Get a tool recommendation for a task. Never throws — returns null on failure.
   */
  async route(request) {
    try {
      const res = await this.fetch("POST", "/api/route", request);
      if (!res.ok) {
        return this.fallbackRouteResponse(request);
      }
      return await res.json();
    } catch {
      return this.fallbackRouteResponse(request);
    }
  }
  /**
   * Report execution outcome. Fire-and-forget — never blocks your agent.
   */
  async report(request) {
    try {
      const isFallback = !!request.fallback_skill;
      const contributionType = isFallback ? "fallback_chain" : "run_telemetry";
      let payload;
      if (isFallback) {
        payload = {
          chain: [
            {
              skill_slug: request.skill,
              outcome: request.outcome,
              latency_ms: request.latency_ms,
              estimated_cost_usd: request.cost_usd,
              output_quality_rating: request.quality_rating,
              task_fingerprint: request.task_fingerprint
            },
            {
              skill_slug: request.fallback_skill,
              outcome: request.outcome,
              latency_ms: request.latency_ms,
              task_fingerprint: request.task_fingerprint
            }
          ]
        };
      } else {
        payload = {
          skill_slug: request.skill,
          outcome_status: request.outcome,
          latency_ms: request.latency_ms,
          estimated_cost_usd: request.cost_usd,
          output_quality_rating: request.quality_rating,
          task_fingerprint: request.task_fingerprint,
          human_correction_minutes: request.human_correction_minutes
        };
      }
      const body = {
        contribution_type: contributionType,
        payload,
        proof_type: "self_reported"
      };
      const res = await this.fetch("POST", "/api/contributions", body);
      if (!res.ok) {
        return { accepted: false };
      }
      return await res.json();
    } catch {
      return { accepted: false };
    }
  }
  /**
   * List available benchmark missions.
   */
  async missions(eventSlug) {
    try {
      const params = eventSlug ? `?event=${eventSlug}` : "";
      const res = await this.fetch("GET", `/api/missions/available${params}`);
      if (!res.ok) return { missions: [], total: 0 };
      return await res.json();
    } catch {
      return { missions: [], total: 0 };
    }
  }
  /** Register your agent. Idempotent — safe to call every time. */
  async register(opts) {
    try {
      const res = await this.fetch("POST", "/api/agents/register", opts);
      if (!res.ok) return { error: "Registration failed" };
      return await res.json();
    } catch {
      return { error: "unreachable" };
    }
  }
  /** Check your real credit balance. */
  async balance(agentIdentityId) {
    try {
      const res = await this.fetch("GET", `/api/agent-dashboard?agent_identity_id=${agentIdentityId}`);
      if (!res.ok) return { total_routing_credits: 0, total_reputation_points: 0 };
      return await res.json();
    } catch {
      return { total_routing_credits: 0, total_reputation_points: 0 };
    }
  }
  /** Get guided walkthrough. */
  async help(agentIdentityId) {
    try {
      const body = agentIdentityId ? { agent_identity_id: agentIdentityId } : {};
      const res = await this.fetch("POST", "/api/mcp", {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "toolroute_help", arguments: body }
      });
      if (!res.ok) return {};
      const data = await res.json();
      return JSON.parse(data?.result?.content?.[0]?.text || "{}");
    } catch {
      return {};
    }
  }
  /** Claim a benchmark mission. */
  async claimMission(opts) {
    try {
      const res = await this.fetch("POST", "/api/missions/claim", opts);
      if (!res.ok) return { error: "Claim failed" };
      return await res.json();
    } catch {
      return { error: "unreachable" };
    }
  }
  /** Submit mission results. */
  async completeMission(opts) {
    try {
      const res = await this.fetch("POST", "/api/missions/complete", opts);
      if (!res.ok) return { error: "Completion failed" };
      return await res.json();
    } catch {
      return { error: "unreachable" };
    }
  }
  /** List workflow challenges. */
  async challenges(opts) {
    try {
      const params = new URLSearchParams();
      if (opts?.category) params.set("category", opts.category);
      if (opts?.difficulty) params.set("difficulty", opts.difficulty);
      const qs = params.toString() ? `?${params.toString()}` : "";
      const res = await this.fetch("GET", `/api/challenges${qs}`);
      if (!res.ok) return { challenges: [] };
      return await res.json();
    } catch {
      return { challenges: [] };
    }
  }
  /** Submit challenge results. */
  async submitChallenge(opts) {
    try {
      const res = await this.fetch("POST", "/api/challenges/submit", opts);
      if (!res.ok) return { error: "Submission failed" };
      return await res.json();
    } catch {
      return { error: "unreachable" };
    }
  }
  /** Search the MCP server catalog. */
  async search(opts) {
    try {
      const params = new URLSearchParams();
      if (opts?.query) params.set("q", opts.query);
      if (opts?.workflow) params.set("workflow", opts.workflow);
      if (opts?.vertical) params.set("vertical", opts.vertical);
      if (opts?.limit) params.set("limit", String(opts.limit));
      const qs = params.toString() ? `?${params.toString()}` : "";
      const res = await this.fetch("GET", `/api/skills${qs}`);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  }
  /** Compare 2-4 skills side by side. */
  async compare(skillSlugs) {
    try {
      const res = await this.fetch("POST", "/api/mcp", {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "toolroute_compare", arguments: { skill_slugs: skillSlugs } }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return JSON.parse(data?.result?.content?.[0]?.text || "[]");
    } catch {
      return [];
    }
  }
  /** Route to best model (convenience wrapper for model.route). */
  async routeModel(request) {
    return this.model.route(request);
  }
  /** Report model outcome (convenience wrapper for model.report). */
  async reportModel(request) {
    return this.model.report(request);
  }
  // --- Internal ---
  async fetch(method, path, body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const options = {
        method,
        signal: controller.signal,
        headers: { "Content-Type": "application/json" }
      };
      if (body && method !== "GET") {
        options.body = JSON.stringify(body);
      }
      return await globalThis.fetch(`${this.baseUrl}${path}`, options);
    } finally {
      clearTimeout(timer);
    }
  }
  fallbackRouteResponse(request) {
    return {
      recommended_skill: null,
      confidence: 0,
      reasoning: "ToolRoute unreachable \u2014 proceed with your default tool.",
      alternatives: [],
      recommended_combo: null,
      fallback: null,
      scores: null,
      non_mcp_alternative: null,
      routing_metadata: { error: "timeout_or_unreachable" },
      wanted_telemetry: {}
    };
  }
};
var NeoSkill = ToolRoute;
var src_default = ToolRoute;
export {
  NeoSkill,
  ToolRoute,
  src_default as default
};
