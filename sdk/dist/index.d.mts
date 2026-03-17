/**
 * @toolroute/sdk — Agent tool routing in two lines.
 *
 * Usage:
 *   const tr = new ToolRoute()
 *   const route = await tr.route({ task: 'web research' })
 *   // ... execute the tool ...
 *   await tr.report({ skill: route.recommended_skill, outcome: 'success', latency_ms: 1200 })
 */
interface ToolRouteConfig {
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
interface RouteRequest {
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
interface RouteResponse {
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
interface ReportRequest {
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
interface ReportResponse {
    accepted: boolean;
    contribution_score?: number;
    rewards?: {
        routing_credits: number;
        economic_credits_usd: number;
        reputation_points: number;
    };
}
interface PreflightResponse {
    healthy: boolean;
    latency_ms: number;
    version: string;
}
declare class ToolRoute {
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
     * List available benchmark missions.
     */
    missions(eventSlug?: string): Promise<any>;
    private fetch;
    private fallbackRouteResponse;
}
/** @deprecated Use ToolRoute instead */
declare const NeoSkill: typeof ToolRoute;

export { NeoSkill, type PreflightResponse, type ReportRequest, type ReportResponse, type RouteRequest, type RouteResponse, ToolRoute, type ToolRouteConfig, ToolRoute as default };
