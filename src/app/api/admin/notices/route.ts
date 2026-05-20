// POST /api/admin/notices — create a migration notice (ADMIN_SECRET-gated).
//
// This is the canonical way to push messages to agents going forward. The
// notice is then attached to /api/route and /api/route/model responses by
// getActiveNotices() in src/lib/notices.ts.
//
// Auth: Authorization: Bearer ${ADMIN_SECRET}
//
// Body:
//   {
//     "message":          string  (required)
//     "severity":         "info" | "warning" | "critical"  (required)
//     "hint":             string  (optional)
//     "correct_endpoint": string  (optional)
//     "docs_url":         string  (optional)
//     "target_agent_id":  uuid    (optional — null = broadcast)
//     "target_endpoint":  string  (optional — e.g. "/api/contributions";
//                                  null = any route call)
//     "effective_date":   "YYYY-MM-DD"  (optional, defaults to today)
//     "expires_at":       ISO-8601 timestamp  (optional, no expiry by default)
//   }

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { apiError } from '@/lib/api-error'

const VALID_SEVERITIES = ['info', 'warning', 'critical'] as const
type Severity = (typeof VALID_SEVERITIES)[number]

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const adminSecret = process.env.ADMIN_SECRET || process.env.CRON_SECRET
  if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
    return apiError(401, 'Unauthorized', 'Set Authorization: Bearer ${ADMIN_SECRET}.')
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return apiError(400, 'Invalid JSON', 'Request body must be valid JSON with Content-Type: application/json')
  }

  const {
    message,
    severity,
    hint,
    correct_endpoint,
    docs_url,
    target_agent_id,
    target_endpoint,
    effective_date,
    expires_at,
  } = body

  // ── Validation ────────────────────────────────────────────────────────────
  if (typeof message !== 'string' || message.trim().length === 0) {
    return apiError(400, 'message is required (non-empty string)')
  }
  if (!VALID_SEVERITIES.includes(severity)) {
    return apiError(
      400,
      `severity must be one of: ${VALID_SEVERITIES.join(', ')}`,
      'Use "info" for new features, "warning" for caller-fixable shape issues, "critical" for breaking changes.',
    )
  }
  for (const [name, val] of [['hint', hint], ['correct_endpoint', correct_endpoint], ['docs_url', docs_url], ['target_endpoint', target_endpoint]] as const) {
    if (val != null && typeof val !== 'string') {
      return apiError(400, `${name} must be a string if provided`)
    }
  }
  if (target_agent_id != null && typeof target_agent_id !== 'string') {
    return apiError(400, 'target_agent_id must be a UUID string if provided')
  }
  if (effective_date != null && typeof effective_date !== 'string') {
    return apiError(400, 'effective_date must be a YYYY-MM-DD string if provided')
  }
  if (expires_at != null && typeof expires_at !== 'string') {
    return apiError(400, 'expires_at must be an ISO-8601 timestamp string if provided')
  }

  // ── Insert ────────────────────────────────────────────────────────────────
  const supabase = createServerSupabaseClient()
  const insert: Record<string, unknown> = {
    message: message.trim(),
    severity: severity as Severity,
    is_active: true,
  }
  if (hint != null) insert.hint = hint
  if (correct_endpoint != null) insert.correct_endpoint = correct_endpoint
  if (docs_url != null) insert.docs_url = docs_url
  if (target_agent_id != null) insert.target_agent_id = target_agent_id
  if (target_endpoint != null) insert.target_endpoint = target_endpoint
  if (effective_date != null) insert.effective_date = effective_date
  if (expires_at != null) insert.expires_at = expires_at

  const { data, error } = await supabase
    .from('migration_notices')
    .insert(insert)
    .select('*')
    .single()

  if (error || !data) {
    return apiError(
      500,
      'Failed to create notice',
      error?.message || 'Internal database error. Confirm migration 050 has been applied.',
    )
  }

  return NextResponse.json({ notice: data }, { status: 201 })
}
