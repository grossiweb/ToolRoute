// Standardized error response helper for ToolRoute API handlers.
//
// Every handler should return errors via apiError(...) rather than bare
// NextResponse.json({ error: '...' }) so callers get a consistent shape:
//
//   {
//     "error":            <human-readable message>,
//     "hint":             <optional: how to fix this specific failure>,
//     "correct_endpoint": <optional: redirect when caller hit the wrong route>,
//     "docs":             <optional: link to relevant docs section>
//   }
//
// Examples:
//
//   apiError(400, 'task is required (string)',
//     'POST a JSON body with { "task": "..." }',
//     undefined,
//     'GET /api/route for full documentation')
//
//   apiError(400, 'run_telemetry requires skill_id or skill_slug',
//     'Add skill_slug to payload. Model telemetry goes to /api/report/model.',
//     'POST /api/report/model')

import { NextResponse } from 'next/server'

export function apiError(
  status: number,
  message: string,
  hint?: string,
  correctEndpoint?: string,
  docs?: string,
  extra?: Record<string, unknown>,
): NextResponse {
  const body: Record<string, unknown> = { error: message }
  if (hint) body.hint = hint
  if (correctEndpoint) body.correct_endpoint = correctEndpoint
  if (docs) body.docs = docs
  if (extra) Object.assign(body, extra)
  return NextResponse.json(body, { status })
}
