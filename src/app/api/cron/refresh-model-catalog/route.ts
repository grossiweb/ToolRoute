// Weekly audit of the model catalog against OpenRouter's live registry.
// Read-only by design: logs any models present upstream but missing
// locally. No auto-insert — bad pricing or wrong tier on a fresh model
// would silently corrupt routing if we ever auto-merged.
//
// Schedule: every Monday at 03:00 UTC (vercel.json: "0 3 * * 1").
// Auth: Bearer CRON_SECRET, same as /api/cron/recalculate-scores.

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models'
const FETCH_TIMEOUT_MS = 10_000

interface OpenRouterModel {
  id: string                   // e.g. "anthropic/claude-haiku-4-5"
  name?: string
  pricing?: { prompt?: string; completion?: string }
  context_length?: number
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = Date.now()

  // 1. Fetch OpenRouter catalog (timeout-guarded — never hang the cron).
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  let upstream: { data?: OpenRouterModel[] }
  try {
    const res = await fetch(OPENROUTER_MODELS_URL, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) {
      return NextResponse.json({
        error: 'OpenRouter request failed',
        status: res.status,
        statusText: res.statusText,
      }, { status: 502 })
    }
    upstream = await res.json()
  } catch (err: any) {
    return NextResponse.json({
      error: 'OpenRouter fetch failed',
      detail: err?.message ?? 'unknown',
    }, { status: 502 })
  } finally {
    clearTimeout(timer)
  }

  const upstreamModels = Array.isArray(upstream.data) ? upstream.data : []
  if (upstreamModels.length === 0) {
    return NextResponse.json({
      error: 'OpenRouter returned no models',
      hint: 'Upstream may have changed the response shape — check `data` array.',
    }, { status: 502 })
  }

  // 2. Load the local catalog. Each row keys on `id` which the local
  // schema uses as the canonical slug (e.g. "claude-haiku-4-5"); the
  // OpenRouter id includes the provider prefix.
  const supabase = createServerSupabaseClient()
  const { data: localRows, error: localErr } = await supabase
    .from('models')
    .select('id, provider')

  if (localErr) {
    return NextResponse.json({
      error: 'Failed to load local models catalog',
      detail: localErr.message,
    }, { status: 500 })
  }

  const localSet = new Set(
    (localRows ?? []).map((r: any) => `${r.provider}/${r.id}`.toLowerCase()),
  )

  // 3. Diff: anything upstream not in local.
  const missing = upstreamModels
    .filter(m => typeof m.id === 'string' && !localSet.has(m.id.toLowerCase()))
    .map(m => ({
      openrouter_id: m.id,
      display_name: m.name ?? null,
      input_price_per_m: m.pricing?.prompt
        ? toPerMillion(m.pricing.prompt)
        : null,
      output_price_per_m: m.pricing?.completion
        ? toPerMillion(m.pricing.completion)
        : null,
      context_length: m.context_length ?? null,
    }))

  const report = {
    generated_at: new Date().toISOString(),
    duration_ms: Date.now() - startedAt,
    upstream_count: upstreamModels.length,
    local_count: localRows?.length ?? 0,
    missing_count: missing.length,
    // Cap the detail list at 50 to keep the response bounded. If we ever
    // legitimately see >50 missing, it means upstream blew up and the
    // count alone is the actionable signal.
    missing_models: missing.slice(0, 50),
    truncated: missing.length > 50,
    next_run: 'In 7 days (Monday 03:00 UTC)',
  }

  // Log to server console too so it's discoverable in Vercel logs even
  // if no one polls the endpoint directly.
  console.log(
    `[refresh-model-catalog] upstream=${report.upstream_count} ` +
    `local=${report.local_count} missing=${report.missing_count}`,
  )

  return NextResponse.json(report)
}

// OpenRouter prices come as "$ per token" strings (e.g. "0.000003").
// Local catalog stores "$ per million tokens" (e.g. 3.0). Convert here
// so the diff payload uses the same units as `models.input_price_per_m`.
function toPerMillion(raw: string): number | null {
  const v = Number(raw)
  if (!Number.isFinite(v)) return null
  return Math.round(v * 1_000_000 * 10000) / 10000
}
