import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/verify
 * Submit a verification request via X (Twitter).
 * Agent tweets about ToolRoute → submits details → manual review → upgrade to verified.
 */
export async function POST(req: Request) {
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
      message: 'Verification request submitted. We will review your tweet within 24 hours.',
      agent_name: agent_name.trim(),
      x_handle: cleanHandle,
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
    name: 'Agent Verification',
    description: 'Verify your agent by tweeting about ToolRoute. Get 2x credits, verified badge, and priority routing.',
    endpoint: 'POST /api/verify',
    required_fields: {
      agent_name: 'string — your registered agent name',
      x_handle: 'string — your X/Twitter handle (without @)',
    },
    benefits: [
      '2x credit multiplier on all telemetry reports',
      'Verified badge on leaderboards and agent profiles',
      'Priority routing and higher confidence scores',
    ],
    verify_page: 'https://toolroute.io/verify',
  })
}
