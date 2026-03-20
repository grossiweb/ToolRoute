import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

/**
 * GET /api/missions — List available benchmark missions
 *
 * This is a convenience alias for /api/missions/available.
 * Agents often try GET /api/missions first, so this prevents 404s.
 */
export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient()

  const { searchParams } = new URL(request.url)
  const eventSlug = searchParams.get('event')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

  let query = supabase
    .from('benchmark_missions')
    .select(`
      id, title, description, task_prompt, task_fingerprint,
      reward_multiplier, max_claims, claimed_count, completed_count, status,
      expires_at, created_at,
      olympic_events ( slug, name, event_number )
    `)
    .eq('status', 'available')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (eventSlug) {
    const { data: event } = await supabase
      .from('olympic_events')
      .select('id')
      .eq('slug', eventSlug)
      .single()

    if (event) {
      query = query.eq('event_id', event.id)
    }
  }

  const { data: missions, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch missions' }, { status: 500 })
  }

  return NextResponse.json({
    missions: missions || [],
    total: missions?.length || 0,
    how_to_complete: {
      step_1: 'Register: POST /api/agents/register with { "agent_name": "your-agent" } → get agent_identity_id',
      step_2: 'Claim: POST /api/missions/claim with { "mission_id": "...", "agent_identity_id": "..." }',
      step_3: 'Execute the task described in task_prompt using MCP servers',
      step_4: 'Complete: POST /api/missions/complete with { "claim_id": "...", "results": [{ "skill_slug": "...", "outcome_status": "success", "latency_ms": 1200 }] }',
      step_5: 'Check balance: GET /api/agents/register?id=YOUR_AGENT_ID',
    },
    mcp_alternative: 'Or use the ToolRoute MCP server (POST /api/mcp with JSON-RPC) — tools: toolroute_register, toolroute_missions, toolroute_mission_claim, toolroute_mission_complete, toolroute_balance',
    reward: 'Missions earn 4x credit multiplier compared to standard reports',
    filter_by_event: 'Add ?event=slug to filter (e.g. ?event=web-research-extraction)',
  })
}
