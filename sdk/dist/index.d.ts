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
    baseUrl?: string;
    /** Hard timeout in ms. Default: 800. ToolRoute never blocks your agent. */
    timeoutMs?: number;
    /** Agent name for telemetry attribution */
    agentName?: string;
    /** Agent kind: autonomous, copilot, workflow, evaluation, hybrid */
    agentKind?: 'autonomous' | 'copilot' | 'workflow-agent' | 'evaluation-agent' | 'hybrid';
    /** Model family (e.g., 'claude-4', 'gpt-4o') */
    modelFamily?: string;
    /** Host client slug (e.g., 'claude-code', 'cursor') */
    hostClient?: string;
}
export interface RouteRequest {
    /** Natural language task description */
    task?: string;
    /** Explicit workflow slug */
    workflow_slug?: string;
    /** Industry vertical slug */
    vertical_slug?: string;
    /** Routing constraints */
    constraints?: {
        priority?: 'best_value' | 'best_quality' | 'best_efficiency' | 'lowest_cost' | 'highest_trust' | 'most_reliable';
        max_cost_usd?: number;
        trust_floor?: number;
        latency_preference?: 'low' | 'medium' | 'high';
    };
}
export interface RouteResponse {
    recommended_skill: string | null;
    recommended_skill_name?: string;
    confidence: number;
    reasoning: string;
    alternatives: string[];
    recommended_combo: string[] | null;
    fallback: string | null;
    scores: Record<string, number> | null;
    non_mcp_alternative: Record<string, string> | null;
    routing_metadata: Record<string, any>;
    wanted_telemetry: Record<string, any>;
}
export interface ReportRequest {
    /** Skill slug that was used */
    skill: string;
    /** Outcome status */
    outcome: 'success' | 'partial_success' | 'failure' | 'aborted';
    /** Latency in milliseconds */
    latency_ms?: number;
    /** Estimated cost in USD */
    cost_usd?: number;
    /** Output quality rating (0-10) */
    quality_rating?: number;
    /** Task fingerprint for correlation */
    task_fingerprint?: string;
    /** Whether a fallback was used */
    fallback_skill?: string;
    /** Whether human correction was needed */
    human_correction_minutes?: number;
}
export interface ReportResponse {
    accepted: boolean;
    contribution_score?: number;
    rewards?: {
        routing_credits: number;
        economic_credits_usd: number;
        reputation_points: number;
    };
}
export interface ModelRouteRequest {
    /** Natural language task description */
    task: string;
    /** Constraints for model selection */
    constraints?: {
        max_cost_per_mtok?: number;
        max_latency_ms?: number;
        min_context_window?: number;
        preferred_providers?: string[];
        excluded_providers?: string[];
    };
}
export interface ModelRouteResponse {
    recommended_model: string;
    recommended_alias: string;
    provider: string;
    tier: string;
    confidence: number;
    reasoning: string;
    fallback_chain: string[];
    escalation: {
        next_tier: string;
        alias: string;
    } | null;
    cost_estimate: {
        input_per_mtok: number;
        output_per_mtok: number;
        estimated_task_cost: number;
    };
    routing_metadata: Record<string, any>;
    decision_id: string;
}
export interface ModelReportRequest {
    /** Model slug that was used */
    model_slug: string;
    /** Outcome status */
    outcome_status: 'success' | 'partial_success' | 'failure' | 'aborted';
    /** Decision ID from model route response */
    decision_id?: string;
    /** Latency in ms */
    latency_ms?: number;
    /** Input tokens consumed */
    input_tokens?: number;
    /** Output tokens generated */
    output_tokens?: number;
    /** Estimated cost in USD */
    estimated_cost_usd?: number;
    /** Output quality rating (0-10) */
    output_quality_rating?: number;
    /** Did structured output parse correctly? */
    structured_output_valid?: boolean;
    /** Did tool calls succeed? */
    tool_calls_succeeded?: boolean;
    /** Was hallucination detected? */
    hallucination_detected?: boolean;
}
export interface ModelVerifyRequest {
    /** Model slug */
    model_slug: string;
    /** Original task description */
    task: string;
    /** First 500 chars of model output */
    output_snippet: string;
    /** Decision ID from model route */
    decision_id?: string;
    /** Expected output format */
    expected_format?: 'json' | 'code' | 'markdown' | 'text';
}
export interface ModelVerifyResponse {
    verified: boolean;
    quality_score: number;
    model_slug: string;
    checks: Record<string, {
        pass: boolean;
        detail?: string;
        overlap?: number;
    }>;
    recommendation: 'output_acceptable' | 'retry_suggested' | 'escalate_model';
    credits_earned: number;
}
export interface PreflightResponse {
    healthy: boolean;
    latency_ms: number;
    version: string;
}
export declare class ToolRoute {
    private baseUrl;
    private timeoutMs;
    private agentName?;
    private agentKind?;
    private modelFamily?;
    private hostClient?;
    constructor(config?: ToolRouteConfig);
    /**
     * Check if ToolRoute is reachable. Never throws — returns health status.
     */
    preflight(): Promise<PreflightResponse>;
    /**
     * Get a tool recommendation for a task. Never throws — returns null on failure.
     */
    route(request: RouteRequest): Promise<RouteResponse>;
    /**
     * Report execution outcome. Fire-and-forget — never blocks your agent.
     */
    report(request: ReportRequest): Promise<ReportResponse>;
    /**
     * Model routing namespace — route, report, and verify LLM model outputs.
     */
    model: {
        /**
         * Get an LLM model recommendation for a task. Returns alias, provider model ID,
         * fallback chain, escalation path, and cost estimate.
         */
        route: (request: ModelRouteRequest) => Promise<ModelRouteResponse>;
        /**
         * Report LLM model execution outcome. Earns routing credits.
         */
        report: (request: ModelReportRequest) => Promise<{
            accepted: boolean;
            credits_earned?: number;
        }>;
        /**
         * Lightweight output verification — deterministic checks, no LLM needed.
         * Run after model execution to validate format, detect refusals, measure coherence.
         */
        verify: (request: ModelVerifyRequest) => Promise<ModelVerifyResponse>;
    };
    /**
     * List available benchmark missions.
     */
    missions(eventSlug?: string): Promise<any>;
    /** Register your agent. Idempotent — safe to call every time. */
    register(opts: {
        agent_name: string;
        agent_kind?: string;
        host_client_slug?: string;
        model_family?: string;
        webhook_url?: string;
    }): Promise<any>;
    /** Check your real credit balance. */
    balance(agentIdentityId: string): Promise<any>;
    /** Get guided walkthrough. */
    help(agentIdentityId?: string): Promise<any>;
    /** Claim a benchmark mission. */
    claimMission(opts: {
        mission_id: string;
        agent_identity_id: string;
    }): Promise<any>;
    /** Submit mission results. */
    completeMission(opts: {
        claim_id: string;
        results: any[];
    }): Promise<any>;
    /** List workflow challenges. */
    challenges(opts?: {
        category?: string;
        difficulty?: string;
    }): Promise<any>;
    /** Submit challenge results. */
    submitChallenge(opts: {
        challenge_slug: string;
        agent_identity_id: string;
        tools_used: any[];
        steps_taken: number;
        [key: string]: any;
    }): Promise<any>;
    /** Search the MCP server catalog. */
    search(opts?: {
        query?: string;
        workflow?: string;
        vertical?: string;
        limit?: number;
    }): Promise<any>;
    /** Compare 2-4 skills side by side. */
    compare(skillSlugs: string[]): Promise<any>;
    /** Route to best model (convenience wrapper for model.route). */
    routeModel(request: ModelRouteRequest): Promise<ModelRouteResponse>;
    /** Report model outcome (convenience wrapper for model.report). */
    reportModel(request: ModelReportRequest): Promise<{
        accepted: boolean;
        credits_earned?: number;
    }>;
    private fetch;
    private fallbackRouteResponse;
}
/** @deprecated Use ToolRoute instead */
export declare const NeoSkill: typeof ToolRoute;
export default ToolRoute;
