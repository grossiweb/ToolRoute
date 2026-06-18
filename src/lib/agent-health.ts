// Agent integration-health: activity rollup + anomaly detection.
//
// Pure functions over the agent_health_30d RPC row (no DB access) so they are
// reused by GET /api/agent/status and the integration_health embed in the
// telemetry responses, and are unit-testable in isolation.

export interface AgentHealth30dRow {
  routing_decisions: number | string
  outcomes_reported: number | string
  contributions_accepted: number | string
  avg_verified_quality: number | string | null
  success_count: number | string
  outcome_total: number | string
  distinct_quality_values: number | string
  last_activity_at: string | null
}

export interface AgentActivity30d {
  routing_decisions: number
  outcomes_reported: number
  contributions_accepted: number
  avg_verified_quality: number | null
  success_rate_pct: number | null
  distinct_quality_values: number
  last_activity_at: string | null
}

export type Severity = 'advisory' | 'warning'

export interface HealthCheck {
  code: string
  severity: Severity
  message: string
  docs: string
}

export interface IntegrationHealth {
  status: 'ok' | 'advisory' | 'warning'
  checks: HealthCheck[]
}

const n = (v: number | string | null | undefined): number => {
  const x = typeof v === 'string' ? Number(v) : (v ?? 0)
  return Number.isFinite(x) ? x : 0
}

/** Normalize the raw RPC row into typed activity numbers. */
export function normalizeActivity(row: AgentHealth30dRow): AgentActivity30d {
  const outcomeTotal = n(row.outcome_total)
  const successCount = n(row.success_count)
  // The RPC returns GREATEST(..., 'epoch') when there is no activity — treat
  // the 1970 sentinel as "never".
  let lastActivity = row.last_activity_at
  if (lastActivity && new Date(lastActivity).getUTCFullYear() < 2000) lastActivity = null
  return {
    routing_decisions: n(row.routing_decisions),
    outcomes_reported: n(row.outcomes_reported),
    contributions_accepted: n(row.contributions_accepted),
    avg_verified_quality: row.avg_verified_quality == null ? null : n(row.avg_verified_quality),
    success_rate_pct: outcomeTotal > 0 ? parseFloat(((successCount / outcomeTotal) * 100).toFixed(1)) : null,
    distinct_quality_values: n(row.distinct_quality_values),
    last_activity_at: lastActivity,
  }
}

/**
 * Four anomaly checks over the last 30 days of agent activity.
 * advisory: NO_ROUTING_CALLS, NO_TELEMETRY_FEEDBACK
 * warning:  LOW_QUALITY_VARIANCE, UNREALISTIC_SUCCESS_RATE
 */
export function computeAnomalyChecks(a: AgentActivity30d): HealthCheck[] {
  const checks: HealthCheck[] = []

  if (a.routing_decisions === 0 && a.outcomes_reported >= 10) {
    checks.push({
      code: 'NO_ROUTING_CALLS',
      severity: 'advisory',
      message: `You've reported ${a.outcomes_reported} outcomes but made 0 routing calls. ToolRoute routing learns from your telemetry and improves model selection over time. See POST /api/route.`,
      docs: '/api/route',
    })
  }

  if (a.distinct_quality_values <= 5 && a.outcomes_reported >= 20) {
    checks.push({
      code: 'LOW_QUALITY_VARIANCE',
      severity: 'warning',
      message: `Your quality ratings have very low variance (only ${a.distinct_quality_values} distinct values across ${a.outcomes_reported} submissions). If hardcoded, this limits routing improvement. Measure actual task quality for best results.`,
      docs: '/api/report/model',
    })
  }

  if (a.success_rate_pct != null && a.success_rate_pct > 98 && a.outcomes_reported >= 20) {
    checks.push({
      code: 'UNREALISTIC_SUCCESS_RATE',
      severity: 'warning',
      message: `Success rate of ${a.success_rate_pct}% is unusually high. If filtering out failures before reporting, add them — failure patterns improve routing quality.`,
      docs: '/api/report/model',
    })
  }

  if (a.routing_decisions >= 20 && a.outcomes_reported === 0) {
    checks.push({
      code: 'NO_TELEMETRY_FEEDBACK',
      severity: 'advisory',
      message: `You're routing but not reporting outcomes. Outcome reports are how ToolRoute learns which models work best for your tasks.`,
      docs: '/api/report/model',
    })
  }

  return checks
}

export function buildIntegrationHealth(checks: HealthCheck[]): IntegrationHealth {
  const status = checks.some(c => c.severity === 'warning')
    ? 'warning'
    : checks.some(c => c.severity === 'advisory')
      ? 'advisory'
      : 'ok'
  return { status, checks }
}

const TIER_ORDER = ['unverified', 'baseline', 'trusted', 'production'] as const
const TIER_MIN_SCORE: Record<string, number> = { baseline: 25, trusted: 50, production: 75 }

/**
 * Score-based tier progress. Advancement is a function of trust_score (DB
 * trigger sync_trust_tier_from_score), NOT contribution count. trust_score
 * moves only via POST /api/report/model (+0.5 / +2.0 with a decision_id);
 * verification jumps straight to 'trusted'.
 */
export function buildTierProgress(tier: string, trustScore: number) {
  const shadow_mode = trustScore < 25

  if (tier === 'enterprise') {
    return {
      current: 'enterprise',
      next: null as string | null,
      current_trust_score: trustScore,
      next_tier_at_trust_score: null as number | null,
      shadow_mode,
      requirements: ['Enterprise is the top tier and is granted manually.'],
      hint: 'trust_tier is derived from trust_score; enterprise is set manually by ToolRoute.',
    }
  }

  const idx = TIER_ORDER.indexOf(tier as (typeof TIER_ORDER)[number])
  const nextTier = idx >= 0 && idx < TIER_ORDER.length - 1 ? TIER_ORDER[idx + 1] : null

  if (!nextTier) {
    // production — only enterprise remains, manual-only
    return {
      current: tier,
      next: 'enterprise',
      current_trust_score: trustScore,
      next_tier_at_trust_score: null as number | null,
      shadow_mode,
      requirements: ['Enterprise tier is granted manually — contact ToolRoute.'],
      hint: 'trust_tier is derived from trust_score (production = score >= 75).',
    }
  }

  const nextAt = TIER_MIN_SCORE[nextTier]
  const gap = Math.max(0, nextAt - trustScore)
  const requirements = [
    `Raise trust_score from ${trustScore} to ${nextAt} (+${gap.toFixed(1)}). Reports via POST /api/report/model move trust_score: +0.5 each, or +2.0 when linked to a decision_id from POST /api/route/model.`,
  ]
  // Verification only helps reach 'trusted' (it sets trust_tier directly).
  if (idx < TIER_ORDER.indexOf('trusted')) {
    requirements.push(`Or get verified to jump straight to 'trusted': see GET /api/verify.`)
  }

  return {
    current: tier,
    next: nextTier,
    current_trust_score: trustScore,
    next_tier_at_trust_score: nextAt,
    shadow_mode,
    requirements,
    hint: 'trust_tier is derived from trust_score, not contribution count. Skill-only telemetry (/api/report, /api/contributions) does not move trust_score — route and report via the model endpoints, or get verified.',
  }
}

const SIX_HOURS_MS = 6 * 60 * 60 * 1000

/** True when the anomaly check is stale (never run, or > 6h ago). */
export function shouldRunAnomalyCheck(lastAnomalyCheckAt: string | null | undefined): boolean {
  if (!lastAnomalyCheckAt) return true
  const last = new Date(lastAnomalyCheckAt).getTime()
  if (!Number.isFinite(last)) return true
  return Date.now() - last > SIX_HOURS_MS
}
