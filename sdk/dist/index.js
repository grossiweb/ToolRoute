"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  NeoSkill: () => NeoSkill,
  ToolRoute: () => ToolRoute,
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);
var ToolRoute = class {
  constructor(config = {}) {
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
var index_default = ToolRoute;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  NeoSkill,
  ToolRoute
});
