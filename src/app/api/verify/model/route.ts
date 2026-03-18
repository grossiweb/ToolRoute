import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// GET /api/verify/model — Self-documenting guide
// ---------------------------------------------------------------------------
export async function GET() {
  return NextResponse.json({
    endpoint: 'POST /api/verify/model',
    description: 'Lightweight quality verification for LLM model output. Run this AFTER model execution to check output quality — closes the route → execute → verify loop.',
    purpose: 'Deterministic checks (no LLM needed). Validates format, detects refusals, measures coherence with the original task.',
    required_fields: {
      model_slug: 'The model slug (e.g. "gpt-4o", "claude-3-5-sonnet")',
      task: 'The original task description you sent to the model',
      output_snippet: 'First 500 chars of the model output',
    },
    optional_fields: {
      decision_id: 'The decision_id from /api/route/model (links verification to routing decision)',
      expected_format: 'json | code | markdown | text — enables format-specific validation',
      agent_identity_id: 'Your agent UUID for credit tracking',
    },
    checks_performed: {
      format_valid: 'If expected_format set, validates the output matches (JSON parseable, code markers, markdown headers)',
      length_adequate: 'Output is substantive (>50 chars)',
      not_refusal: 'Output is not a model refusal ("I cannot...", "As an AI...")',
      not_empty: 'Output is not empty/whitespace',
      coherent_with_task: 'Keyword overlap between task and output (0-1 score)',
    },
    response_fields: {
      verified: 'boolean — true if quality_score >= 0.6',
      quality_score: 'Overall quality score 0-1',
      checks: 'Object with individual check results { pass, detail }',
      recommendation: '"output_acceptable" | "retry_suggested" | "escalate_model"',
    },
    credit_rewards: {
      verification: '1-3 routing credits per verification',
      with_decision_id: '+50% bonus when linked to a routing decision',
    },
    examples: [
      {
        description: 'Verify JSON output from a coding task',
        body: {
          model_slug: 'gpt-4o-mini',
          task: 'Generate a JSON config for a webpack build',
          output_snippet: '{"entry":"./src/index.ts","output":{"path":"dist","filename":"bundle.js"},...}',
          expected_format: 'json',
          decision_id: 'uuid-from-route-response',
        },
      },
      {
        description: 'Verify markdown output',
        body: {
          model_slug: 'claude-3-5-sonnet',
          task: 'Write documentation for the auth module',
          output_snippet: '# Auth Module\\n\\n## Overview\\n\\nThe auth module handles...',
          expected_format: 'markdown',
        },
      },
    ],
    full_loop: {
      step_1: 'POST /api/route/model — get model recommendation',
      step_2: 'Call the recommended model yourself (via OpenRouter, provider API, etc.)',
      step_3: 'POST /api/verify/model — verify output quality (this endpoint)',
      step_4: 'POST /api/report/model — report execution outcome (earn credits)',
    },
  })
}

// ---------------------------------------------------------------------------
// POST /api/verify/model — Lightweight output verification
// ---------------------------------------------------------------------------

// Refusal patterns that indicate the model declined the task
const REFUSAL_PATTERNS = [
  /\bi('m| am) unable to\b/i,
  /\bi can(not|'t) (help|assist|provide|generate|create)\b/i,
  /\bas an ai\b/i,
  /\bi('m| am) sorry,? (but )?i (can(not|'t)|don't)\b/i,
  /\bmy (guidelines|policies|programming) (prevent|don't allow)\b/i,
  /\bi('m| am) not able to\b/i,
  /\bi must (decline|refuse)\b/i,
]

function checkFormatValid(output: string, expectedFormat?: string): { pass: boolean; detail: string } {
  if (!expectedFormat) return { pass: true, detail: 'No format specified — skipped' }

  switch (expectedFormat) {
    case 'json': {
      try {
        JSON.parse(output.trim())
        return { pass: true, detail: 'Valid JSON' }
      } catch {
        // Maybe it's wrapped in markdown code block
        const jsonMatch = output.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (jsonMatch) {
          try {
            JSON.parse(jsonMatch[1].trim())
            return { pass: true, detail: 'Valid JSON (extracted from code block)' }
          } catch { /* fall through */ }
        }
        return { pass: false, detail: 'Invalid JSON — parse failed' }
      }
    }
    case 'code': {
      const hasCodeMarkers = /```/.test(output) ||
        /^(import |from |const |let |var |function |class |def |pub fn|package )/.test(output.trim()) ||
        /[{}\[\]();]/.test(output)
      return hasCodeMarkers
        ? { pass: true, detail: 'Code markers detected' }
        : { pass: false, detail: 'No code markers found' }
    }
    case 'markdown': {
      const hasMarkdown = /^#{1,6}\s/m.test(output) ||
        /\*\*[^*]+\*\*/.test(output) ||
        /^[-*]\s/m.test(output) ||
        /^\d+\.\s/m.test(output)
      return hasMarkdown
        ? { pass: true, detail: 'Markdown formatting detected' }
        : { pass: false, detail: 'No markdown formatting found' }
    }
    case 'text':
      return { pass: true, detail: 'Plain text — always valid' }
    default:
      return { pass: true, detail: `Unknown format "${expectedFormat}" — skipped` }
  }
}

function checkCoherence(task: string, output: string): { pass: boolean; overlap: number; detail: string } {
  // Extract meaningful words (3+ chars, lowercased)
  const extractWords = (text: string) => {
    const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || []
    // Deduplicate without using Set spread
    const unique: Record<string, boolean> = {}
    words.forEach(w => { unique[w] = true })
    return Object.keys(unique)
  }

  const taskWords = extractWords(task)
  if (taskWords.length === 0) return { pass: true, overlap: 1, detail: 'No task keywords to check' }

  const outputWords = extractWords(output)
  const outputSet: Record<string, boolean> = {}
  outputWords.forEach(w => { outputSet[w] = true })

  let matches = 0
  taskWords.forEach(w => {
    if (outputSet[w]) matches++
  })

  const overlap = Math.round((matches / taskWords.length) * 100) / 100
  return {
    pass: overlap >= 0.15,
    overlap,
    detail: `${matches}/${taskWords.length} task keywords found in output (${Math.round(overlap * 100)}%)`,
  }
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const {
    model_slug,
    task,
    output_snippet,
    decision_id,
    expected_format,
    agent_identity_id,
  } = body as {
    model_slug?: string
    task?: string
    output_snippet?: string
    decision_id?: string
    expected_format?: string
    agent_identity_id?: string
  }

  // Validate required fields
  if (!model_slug || !task || output_snippet === undefined) {
    return NextResponse.json({
      error: 'Missing required fields',
      required: ['model_slug', 'task', 'output_snippet'],
      hint: 'GET /api/verify/model for full documentation',
    }, { status: 400 })
  }

  const snippet = String(output_snippet).slice(0, 2000) // Cap at 2000 chars

  // Run all checks
  const notEmpty = {
    pass: snippet.trim().length > 0,
    detail: snippet.trim().length > 0 ? `${snippet.trim().length} chars` : 'Empty output',
  }

  const lengthAdequate = {
    pass: snippet.trim().length > 50,
    detail: snippet.trim().length > 50
      ? `${snippet.trim().length} chars (adequate)`
      : `Only ${snippet.trim().length} chars (very short)`,
  }

  const notRefusal = (() => {
    for (const pattern of REFUSAL_PATTERNS) {
      if (pattern.test(snippet)) {
        const match = snippet.match(pattern)
        return { pass: false, detail: `Refusal detected: "${match ? match[0] : ''}"` }
      }
    }
    return { pass: true, detail: 'No refusal patterns detected' }
  })()

  const formatValid = checkFormatValid(snippet, expected_format)
  const coherence = checkCoherence(task, snippet)

  // Calculate weighted quality score
  const weights = {
    not_empty: 0.15,
    length_adequate: 0.15,
    not_refusal: 0.25,
    format_valid: 0.20,
    coherent_with_task: 0.25,
  }

  const scores = {
    not_empty: notEmpty.pass ? 1 : 0,
    length_adequate: lengthAdequate.pass ? 1 : 0,
    not_refusal: notRefusal.pass ? 1 : 0,
    format_valid: formatValid.pass ? 1 : 0,
    coherent_with_task: coherence.overlap,
  }

  const qualityScore = Math.round((
    scores.not_empty * weights.not_empty +
    scores.length_adequate * weights.length_adequate +
    scores.not_refusal * weights.not_refusal +
    scores.format_valid * weights.format_valid +
    scores.coherent_with_task * weights.coherent_with_task
  ) * 100) / 100

  const verified = qualityScore >= 0.6
  const recommendation = qualityScore >= 0.75
    ? 'output_acceptable'
    : qualityScore >= 0.45
      ? 'retry_suggested'
      : 'escalate_model'

  // Fire-and-forget: log verification to model_outcome_records
  const supabase = createServerSupabaseClient()

  // Look up model
  supabase
    .from('model_registry')
    .select('id')
    .eq('slug', model_slug)
    .single()
    .then(({ data: model }) => {
      if (!model) return

      // Insert outcome record
      supabase.from('model_outcome_records').insert({
        model_id: model.id,
        outcome_status: verified ? 'success' : 'failure',
        output_quality_rating: Math.round(qualityScore * 10),
        proof_type: 'automated_verification',
        notes: JSON.stringify({
          recommendation,
          checks: { not_empty: notEmpty.pass, length_adequate: lengthAdequate.pass, not_refusal: notRefusal.pass, format_valid: formatValid.pass, coherence: coherence.overlap },
        }),
      }).then(() => {})

      // If decision_id provided, update the routing decision
      if (decision_id) {
        supabase.from('model_routing_decisions').update({
          verification_score: qualityScore,
          verified_at: new Date().toISOString(),
        }).eq('id', decision_id).then(() => {})
      }
    })

  // Credit calculation
  let credits = 1
  if (expected_format) credits += 1
  if (decision_id) credits = Math.ceil(credits * 1.5)

  // Fire-and-forget: reward agent
  if (agent_identity_id) {
    supabase.rpc('increment_counter', {
      table_name: 'reward_ledgers',
      id_value: agent_identity_id,
      column_name: 'routing_credits',
      increment_by: credits,
    }).then(() => {})
  }

  return NextResponse.json({
    verified,
    quality_score: qualityScore,
    model_slug,
    checks: {
      not_empty: notEmpty,
      length_adequate: lengthAdequate,
      not_refusal: notRefusal,
      format_valid: formatValid,
      coherent_with_task: { pass: coherence.pass, overlap: coherence.overlap, detail: coherence.detail },
    },
    recommendation,
    credits_earned: credits,
    ...(decision_id ? { decision_linked: true } : {}),
    earn_more: {
      challenges: 'GET /api/challenges — 3x credit multiplier on challenge completion',
      model_report: 'POST /api/report/model — full execution telemetry earns 3-12 credits',
      missions: 'GET /api/missions/available — 4x credit multiplier',
    },
  })
}
