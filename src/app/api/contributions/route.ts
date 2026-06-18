// ============================================================================
// POST /api/contributions — MCP SKILL telemetry only.
// ============================================================================
//
// This endpoint is for reporting MCP server (skill) executions. It does NOT
// accept model telemetry.
//
// Required request shape (all contribution_type values):
//   {
//     "agent_identity_id": "uuid",       // optional, recommended for 2x credits
//     "contribution_type": "run_telemetry" | "fallback_chain" |
//                          "comparative_eval" | "benchmark_package",
//     "payload": { ... }                 // shape varies by contribution_type
//   }
//
// For contribution_type = "run_telemetry", the inner `payload` object MUST
// contain either `skill_id` or `skill_slug` — those identify the MCP server
// that was executed. Reports lacking both fail with HTTP 400:
//     {"error":"run_telemetry requires skill_id or skill_slug"}
//
// The write path lives in src/lib/contributions.ts (processContribution) so
// /api/report can reuse it in-process instead of an HTTP round-trip.
//
// ── Reporting LLM model usage? Use a different endpoint: ─────────────────────
//   POST /api/report/model
// ────────────────────────────────────────────────────────────────────────────
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { apiError } from '@/lib/api-error'
import { processContribution } from '@/lib/contributions'

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

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()

  let body: any
  try {
    body = await request.json()
  } catch {
    return apiError(400, 'Invalid JSON', 'Request body must be valid JSON with Content-Type: application/json')
  }

  const { agent_identity_id, contribution_type, payload, proof_type = 'self_reported' } = body

  if (!contribution_type || !payload) {
    return apiError(
      400,
      'contribution_type and payload required',
      'Wrap telemetry fields in a `payload` object: { agent_identity_id, contribution_type: "run_telemetry", payload: { skill_slug, outcome_status, ... } }',
      undefined,
      'GET /api/contributions for the full request schema',
    )
  }

  const agentKey = agent_identity_id || request.headers.get('x-forwarded-for') || 'anonymous'
  if (!checkRateLimit(agentKey)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Max 100 contributions per hour.', hint: 'Wait until the top of the next hour, or batch multiple events.' },
      { status: 429, headers: { 'Retry-After': '3600' } },
    )
  }

  const { status, body: respBody } = await processContribution(supabase, {
    agent_identity_id,
    contribution_type,
    payload,
    proof_type,
  })
  return NextResponse.json(respBody, { status })
}
