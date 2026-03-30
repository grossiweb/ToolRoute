import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { calcContributionScore, calcRoutingCredits, CONTRIBUTION_MULTIPLIERS, TRUST_TIER_MODIFIERS } from '@/lib/scoring'
import { detectAntiGamingPatterns } from '@/lib/quality-verifier'

// GET /api/contributions — Self-documenting guide for advanced telemetry
export async function GET() {
  return NextResponse.json({
    endpoint: 'POST /api/contributions',
    description: 'Advanced telemetry submission for agents. Supports 4 contribution types with different credit multipliers. For simple single-execution reports, use POST /api/report instead.',
    important: 'Report ANY MCP server execution — not limited to ToolRoute recommendations or missions.',
    contribution_types: {
      run_telemetry: {
        description: 'Report a single skill execution (same as /api/report but via the contributions pipeline)',
        multiplier: '1x base',
        credits: '3-10 routing credits',
        required_payload: { skill_slug: 'string', outcome_status: 'success | partial_success | failure | aborted' },
        optional_payload: { latency_ms: 'number', estimated_cost_usd: 'number', output_quality_rating: '0-10', task_fingerprint: 'string' },
      },
      comparative_eval: {
        description: 'Compare 2+ skills on the same task — most valuable contribution type',
        multiplier: '2.5x base',
        credits: '8-25 routing credits',
        required_payload: {
          candidates: '[{ skill_slug, outcome_status, latency_ms?, output_quality_rating? }, ...]  (2+ entries)',
        },
        example: {
          candidates: [
            { skill_slug: 'firecrawl-mcp', outcome_status: 'success', latency_ms: 1200, output_quality_rating: 8 },
            { skill_slug: 'exa-mcp-server', outcome_status: 'success', latency_ms: 800, output_quality_rating: 9 },
          ],
        },
      },
      fallback_chain: {
        description: 'Report a sequence of skills tried when the primary failed',
        multiplier: '1.5x base',
        credits: '5-15 routing credits',
        required_payload: {
          chain: '[{ skill_slug, outcome_status, latency_ms? }, ...] (2+ entries, ordered by attempt)',
        },
        example: {
          chain: [
            { skill_slug: 'firecrawl-mcp', outcome_status: 'failure', latency_ms: 5000 },
            { skill_slug: 'exa-mcp-server', outcome_status: 'success', latency_ms: 800 },
          ],
        },
      },
      benchmark_package: {
        description: 'Submit a batch of benchmark runs against a standardized profile',
        multiplier: '4x base',
        credits: '15-40 routing credits',
        required_payload: {
          benchmark_profile_slug: 'string',
          runs: '[{ skill_slug, outcome_status, latency_ms, output_quality_rating }, ...]',
        },
      },
    },
    request_body: {
      agent_identity_id: 'UUID from POST /api/agents/register (optional but earns 2x trust modifier)',
      contribution_type: 'run_telemetry | comparative_eval | fallback_chain | benchmark_package',
      payload: 'Type-specific payload (see contribution_types above)',
      proof_type: 'self_reported (default) | automated | verified',
    },
    tip: 'Comparative evals (testing 2+ skills on the same task) are the most valuable contribution and earn the highest credits.',
  })
}

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(agentId: string): boolean {
  const now = Date.now()
  const windowMs = 60 * 60 * 1000
  const maxRequests = 100
  const record = rateLimitMap.get(agentId)
  if (!record || now > record.resetAt) {
    rateLimitMap.set(agentId, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (record.count >= maxRequests) return false
  record.count++
  return true
}

// Type-specific payload validation
interface ValidationResult {
  valid: boolean
  error?: string
  runCount: number
}

function validatePayload(payload: any, type: string): ValidationResult {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'payload must be a non-empty object', runCount: 0 }
  }

  switch (type) {
    case 'run_telemetry': {
      if (!payload.skill_id && !payload.skill_slug) {
        return { valid: false, error: 'run_telemetry requires skill_id or skill_slug', runCount: 0 }
      }
      if (!payload.outcome_status && !payload.outcome) {
        return { valid: false, error: 'run_telemetry requires outcome_status', runCount: 0 }
      }
      return { valid: true, runCount: 1 }
    }

    case 'comparative_eval': {
      const candidates = payload.candidates || payload.results || []
      if (!Array.isArray(candidates) || candidates.length < 2) {
        return { valid: false, error: 'comparative_eval requires at least 2 candidates/results', runCount: 0 }
      }
      for (const c of candidates) {
        if (!c.skill_id && !c.skill_slug) {
          return { valid: false, error: 'Each candidate must have skill_id or skill_slug', runCount: 0 }
        }
      }
      return { valid: true, runCount: candidates.length }
    }

    case 'fallback_chain': {
      const chain = payload.chain || []
      if (!Array.isArray(chain) || chain.length < 2) {
        return { valid: false, error: 'fallback_chain requires a chain array with at least 2 entries', runCount: 0 }
      }
      return { valid: true, runCount: chain.length }
    }

    case 'benchmark_package': {
      const runs = payload.runs || []
      if (!Array.isArray(runs) || runs.length === 0) {
        return { valid: false, error: 'benchmark_package requires a non-empty runs array', runCount: 0 }
      }
      if (!payload.benchmark_profile_slug && !payload.benchmark_profile_id) {
        return { valid: false, error: 'benchmark_package requires benchmark_profile_slug or benchmark_profile_id', runCount: 0 }
      }
      return { valid: true, runCount: runs.length }
    }

    default:
      return { valid: false, error: 'Unknown contribution type', runCount: 0 }
  }
}

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { agent_identity_id, contribution_type, payload, proof_type = 'self_reported' } = body

  if (!contribution_type || !payload) {
    return NextResponse.json({ error: 'contribution_type and payload required' }, { status: 400 })
  }

  const validTypes = ['run_telemetry', 'comparative_eval', 'fallback_chain', 'benchmark_package']
  if (!validTypes.includes(contribution_type)) {
    return NextResponse.json({ error: `Invalid contribution_type. Must be one of: ${validTypes.join(', ')}` }, { status: 400 })
  }

  // Type-specific validation
  const validation = validatePayload(payload, contribution_type)
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  const agentKey = agent_identity_id || request.headers.get('x-forwarded-for') || 'anonymous'
  if (!checkRateLimit(agentKey)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Max 100 contributions per hour.' },
      { status: 429, headers: { 'Retry-After': '3600' } }
    )
  }

  // Resolve or create contributor
  let contributorId: string
  if (agent_identity_id) {
    // Look up existing agent's contributor
    const { data: agent } = await supabase
      .from('agent_identities')
      .select('contributor_id')
      .eq('id', agent_identity_id)
      .single()

    if (agent?.contributor_id) {
      contributorId = agent.contributor_id
    } else {
      const { data: contrib } = await supabase
        .from('contributors')
        .insert({ contributor_type: 'individual', display_name: agent_identity_id })
        .select('id')
        .single()
      contributorId = contrib!.id
    }
  } else {
    const { data: contrib } = await supabase
      .from('contributors')
      .insert({ contributor_type: 'individual', display_name: 'Anonymous' })
      .select('id')
      .single()
    contributorId = contrib!.id
  }

  // Insert contribution event
  const { data: event } = await supabase
    .from('contribution_events')
    .insert({
      contributor_id: contributorId,
      agent_identity_id: agent_identity_id || null,
      contribution_type,
      run_count: validation.runCount,
      payload_json: payload,
      proof_type,
      accepted: false,
    })
    .select('id')
    .single()

  if (!event) {
    return NextResponse.json({ error: 'Failed to record contribution' }, { status: 500 })
  }

  // Score the contribution
  const validity = estimateValidity(payload, contribution_type)
  const usefulness = estimateUsefulness(payload, contribution_type)
  const novelty = await estimateNovelty(supabase, payload, contribution_type)
  const consistency = await estimateConsistency(supabase, contributorId)

  // Anti-gaming: combine payload heuristics with pattern detection for registered agents
  let antiGaming = estimateAntiGaming(payload, contribution_type)
  if (agent_identity_id) {
    const gaming = await detectAntiGamingPatterns(supabase, agent_identity_id)
    antiGaming = Math.min(antiGaming, gaming.multiplier)
  }

  const overallScore = calcContributionScore({
    validity, usefulness, novelty, consistency, antiGaming,
  })
  const accepted = overallScore >= 0.4

  await supabase.from('contribution_events').update({ accepted }).eq('id', event.id)
  await supabase.from('contribution_scores').insert({
    contribution_event_id: event.id,
    validity_score: validity,
    usefulness_score: usefulness,
    novelty_score: novelty,
    consistency_score: consistency,
    anti_gaming_score: antiGaming,
    overall_contribution_score: overallScore,
  })

  // Calculate and issue rewards
  const rewards = { routing_credits: 0, economic_credits_usd: 0, reputation_points: 0 }
  if (accepted) {
    const mult = CONTRIBUTION_MULTIPLIERS[contribution_type as keyof typeof CONTRIBUTION_MULTIPLIERS]

    // Apply trust tier modifier if agent is known
    let trustMod = 1.0
    if (agent_identity_id) {
      const { data: agent } = await supabase
        .from('agent_identities')
        .select('trust_tier')
        .eq('id', agent_identity_id)
        .single()
      if (agent?.trust_tier) {
        trustMod = TRUST_TIER_MODIFIERS[agent.trust_tier as keyof typeof TRUST_TIER_MODIFIERS] || 1.0
      }
    }

    rewards.routing_credits = calcRoutingCredits(10, overallScore, mult * trustMod)
    rewards.economic_credits_usd = parseFloat((0.01 * overallScore * mult * trustMod).toFixed(4))
    rewards.reputation_points = Math.round(5 * overallScore * mult * trustMod)

    await supabase.from('reward_ledgers').insert({
      contributor_id: contributorId,
      agent_identity_id: agent_identity_id || null,
      contribution_event_id: event.id,
      ...rewards,
      reason: `${contribution_type} accepted (score: ${overallScore.toFixed(2)})`,
    })
  }

  // Track telemetry rate (increment reported runs)
  await trackTelemetryRate(supabase, 'report')

  return NextResponse.json({
    accepted,
    contribution_score: parseFloat(overallScore.toFixed(2)),
    contribution_type,
    run_count: validation.runCount,
    scores: {
      validity: parseFloat(validity.toFixed(2)),
      usefulness: parseFloat(usefulness.toFixed(2)),
      novelty: parseFloat(novelty.toFixed(2)),
      consistency: parseFloat(consistency.toFixed(2)),
      anti_gaming: parseFloat(antiGaming.toFixed(2)),
    },
    rewards,
    earn_more: {
      challenges: {
        message: 'Workflow Challenges pay 3x credits — pick a real business task, choose your own tools, compete for Gold/Silver/Bronze.',
        endpoint: 'GET /api/challenges',
      },
      missions: {
        message: 'Benchmark Missions pay 4x credits — claim one at GET /api/missions/available.',
      },
    },
  })
}

function estimateValidity(payload: any, type: string): number {
  if (!payload) return 0

  switch (type) {
    case 'run_telemetry': {
      let score = 0.3 // base for having skill + outcome
      if (payload.latency_ms != null) score += 0.2
      if (payload.estimated_cost_usd != null) score += 0.15
      if (payload.output_quality_rating != null) score += 0.15
      if (payload.task_fingerprint) score += 0.1
      if (payload.structured_output_valid != null) score += 0.1
      return Math.min(score, 1.0)
    }
    case 'comparative_eval': {
      const candidates = payload.candidates || payload.results || []
      if (candidates.length < 2) return 0.2
      const hasMetrics = candidates.every((c: any) => c.latency_ms != null || c.output_quality_rating != null)
      return hasMetrics ? 0.9 : 0.6
    }
    case 'fallback_chain': {
      const chain = payload.chain || []
      if (chain.length < 2) return 0.2
      const hasOutcomes = chain.every((c: any) => c.outcome_status || c.outcome)
      return hasOutcomes ? 0.9 : 0.5
    }
    case 'benchmark_package': {
      const runs = payload.runs || []
      if (runs.length === 0) return 0.1
      const completeness = runs.filter((r: any) =>
        r.outcome_status && r.latency_ms != null && r.output_quality_rating != null
      ).length / runs.length
      return 0.5 + completeness * 0.5
    }
    default:
      return 0.5
  }
}

function estimateUsefulness(payload: any, type: string): number {
  switch (type) {
    case 'benchmark_package': return 1.0
    case 'comparative_eval': return 0.95
    case 'fallback_chain': return 0.9
    case 'run_telemetry': {
      // More fields = more useful
      const fields = ['latency_ms', 'estimated_cost_usd', 'output_quality_rating',
        'task_fingerprint', 'structured_output_valid', 'human_correction_minutes']
      const present = fields.filter(f => payload[f] != null).length
      return Math.min(0.4 + present * 0.1, 0.9)
    }
    default:
      return 0.5
  }
}

async function estimateNovelty(supabase: any, payload: any, type: string): Promise<number> {
  // Check if we've seen this task_fingerprint before
  if (payload.task_fingerprint) {
    const { count } = await supabase
      .from('outcome_records')
      .select('*', { count: 'exact', head: true })
      .eq('task_fingerprint', payload.task_fingerprint)

    if (count === 0) return 1.0 // Brand new task
    if (count != null && count < 5) return 0.8 // Low sample, still valuable
    if (count != null && count < 20) return 0.5 // Moderate coverage
    return 0.3 // Well-covered, less novel
  }

  // No fingerprint — moderate novelty assumption
  return 0.6
}

async function estimateConsistency(supabase: any, contributorId: string): Promise<number> {
  // Check contributor's history
  const { data: rep } = await supabase
    .from('contributor_reputation')
    .select('total_contributions, accepted_contributions')
    .eq('contributor_id', contributorId)
    .single()

  if (!rep || rep.total_contributions === 0) return 0.7 // New contributor, neutral
  const acceptanceRate = rep.accepted_contributions / rep.total_contributions
  return Math.min(0.5 + acceptanceRate * 0.5, 1.0)
}

function estimateAntiGaming(payload: any, type: string): number {
  let score = 0.85 // Default: trust the agent

  // Suspiciously perfect scores
  if (payload.output_quality_rating === 10 && payload.human_correction_required) {
    score -= 0.4
  }

  // Zero latency with retries is suspicious
  if (payload.latency_ms === 0 && (payload.retries || 0) > 0) {
    score -= 0.7
  }

  // All candidates in comparative eval have identical scores
  if (type === 'comparative_eval') {
    const candidates = payload.candidates || payload.results || []
    if (candidates.length >= 2) {
      const ratings = candidates.map((c: any) => c.output_quality_rating).filter((r: any) => r != null)
      if (ratings.length >= 2 && new Set(ratings).size === 1) {
        score -= 0.3 // Identical ratings across all candidates is suspicious
      }
    }
  }

  // Extremely fast benchmark packages
  if (type === 'benchmark_package') {
    const runs = payload.runs || []
    const allInstant = runs.every((r: any) => r.latency_ms != null && r.latency_ms < 10)
    if (allInstant && runs.length > 3) {
      score -= 0.5
    }
  }

  return Math.max(score, 0)
}

async function trackTelemetryRate(supabase: any, eventType: 'recommendation' | 'report') {
  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const periodEnd = new Date(periodStart.getTime() + 24 * 60 * 60 * 1000)

  // Use maybeSingle + order to get the first matching row (avoids error when multiple exist)
  const { data: existing } = await supabase
    .from('telemetry_rate_tracking')
    .select('id, total_recommendations, total_reported_runs')
    .gte('period_start', periodStart.toISOString())
    .lt('period_end', periodEnd.toISOString())
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (existing) {
    const recs = existing.total_recommendations + (eventType === 'recommendation' ? 1 : 0)
    const runs = existing.total_reported_runs + (eventType === 'report' ? 1 : 0)
    const rate = recs > 0 ? runs / recs : 0

    await supabase.from('telemetry_rate_tracking')
      .update({
        total_recommendations: recs,
        total_reported_runs: runs,
        telemetry_rate: parseFloat(rate.toFixed(4)),
      })
      .eq('id', existing.id)
  } else {
    const recs = eventType === 'recommendation' ? 1 : 0
    const runs = eventType === 'report' ? 1 : 0
    await supabase.from('telemetry_rate_tracking').insert({
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      total_recommendations: recs,
      total_reported_runs: runs,
      telemetry_rate: 0,
    })
  }
}
