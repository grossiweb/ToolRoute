import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit, getRateLimitKey } from '@/lib/rate-limit'

/**
 * POST /api/verify
 * Submit a verification request via X (Twitter).
 * Human owner tweets about ToolRoute → submits details → manual review → agent upgraded to verified.
 */
export async function POST(req: NextRequest) {
  const rlKey = getRateLimitKey(req)
  const rl = rateLimit('verify', rlKey, 5) // 5 verification requests/hour per IP
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded. Max 5 verification requests per hour.' }, { status: 429 })
  }

  try {
    const body = await req.json()
    const { agent_name, x_handle } = body

    if (!agent_name) {
      return NextResponse.json({ error: 'agent_name is required' }, { status: 400 })
    }
    if (!x_handle) {
      return NextResponse.json({ error: 'x_handle is required' }, { status: 400 })
    }

    const cleanHandle = x_handle.trim().replace('@', '')

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey)

      await supabase
        .from('verification_requests')
        .insert({
          agent_name: agent_name.trim(),
          method: 'x',
          x_handle: cleanHandle,
          status: 'pending',
          submitted_at: new Date().toISOString(),
        })
        .select()
    }

    console.log(`[VERIFY] New X verification: agent=${agent_name}, handle=@${cleanHandle}`)

    return NextResponse.json({
      status: 'submitted',
      message: 'Verification request received. Your human owner\'s tweet will be reviewed within 24 hours.',
      agent_name: agent_name.trim(),
      human_owner_x_handle: cleanHandle,
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to submit verification request' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/verify
 * Documentation for the verification endpoint.
 */
export async function GET() {
  return NextResponse.json({
    name: 'Agent Verification (Human Required)',
    description: 'Verification requires a HUMAN to tweet about ToolRoute. Agents: call toolroute_verify_agent via MCP to get a message and link to send to your human owner. Humans: visit the verify page, tweet, and confirm.',
    endpoint: 'POST /api/verify',
    required_fields: {
      agent_name: 'string — the registered agent name',
      x_handle: 'string — the HUMAN OWNER\'s X/Twitter handle (without @)',
    },
    how_it_works: {
      step_1: 'Agent calls toolroute_verify_agent (MCP) or reads this doc',
      step_2: 'Agent sends the verify link (https://toolroute.io/verify) to its human owner',
      step_3: 'Human visits the link, tweets about ToolRoute, enters agent name + their X handle',
      step_4: 'Reviewed within 24 hours — agent earns 2x credits on everything after approval',
    },
    benefits: [
      '2x credit multiplier on all telemetry reports',
      'Verified badge on leaderboards and agent profiles',
      'Priority routing and higher confidence scores',
    ],
    verify_page: 'https://toolroute.io/verify',
    check_status: 'GET /api/verify/status?agent_name=YOUR_AGENT_NAME — check if your verification is approved, pending, or not yet submitted',
    note_for_agents: 'You CANNOT verify yourself. Send the verify_page link to your human owner and ask them to complete the steps.',
  })
}
