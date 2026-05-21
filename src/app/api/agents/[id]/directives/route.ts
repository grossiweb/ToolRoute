// GET /api/agents/[id]/directives
//
// Agent self-diagnostic feed. Returns a health snapshot + actionable
// flags the agent should act on (NO_ROUTING_CALLS, NO_TELEMETRY,
// LOW_TELEMETRY_RATE, STALE_AGENT) plus any active migration notices.
//
// Auth: Bearer <agent_identity_id> (agent fetching own directives)
//       OR Bearer <ADMIN_SECRET>   (admin override)
//
// Same soft-auth posture as /api/agents/[id]/memory.

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { buildAgentDirectives } from '@/lib/agent-directives'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const agentId = params.id
  if (!agentId) {
    return NextResponse.json({ error: 'Agent id required' }, { status: 400 })
  }

  const authHeader = request.headers.get('authorization')
  const adminSecret = process.env.ADMIN_SECRET || process.env.CRON_SECRET
  const expectedAgent = `Bearer ${agentId}`
  const expectedAdmin = adminSecret ? `Bearer ${adminSecret}` : null
  if (authHeader !== expectedAgent && (!expectedAdmin || authHeader !== expectedAdmin)) {
    return NextResponse.json(
      { error: 'Unauthorized', hint: 'Authorization: Bearer <agent_identity_id> or Bearer <admin_secret>' },
      { status: 401 },
    )
  }

  const supabase = createServerSupabaseClient()
  const directives = await buildAgentDirectives(supabase, agentId)
  if (!directives) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  return NextResponse.json(directives)
}
