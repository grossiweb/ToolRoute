import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

/**
 * GET /api/health — Health check endpoint for uptime monitoring.
 * Returns service status and dependency health.
 */
export async function GET() {
  const startMs = Date.now()
  let dbStatus = 'ok'
  let dbLatencyMs = 0
  let skillCount = 0

  try {
    const supabase = createServerSupabaseClient()
    const dbStart = Date.now()
    const { count, error } = await supabase
      .from('skills')
      .select('id', { count: 'exact', head: true })
    dbLatencyMs = Date.now() - dbStart

    if (error) {
      dbStatus = `error: ${error.message}`
    } else {
      skillCount = count || 0
    }
  } catch (err: any) {
    dbStatus = `unreachable: ${err.message}`
  }

  const healthy = dbStatus === 'ok'

  return NextResponse.json(
    {
      status: healthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime_ms: Date.now() - startMs,
      dependencies: {
        database: {
          status: dbStatus,
          latency_ms: dbLatencyMs,
          skill_count: skillCount,
        },
      },
    },
    { status: healthy ? 200 : 503 }
  )
}
