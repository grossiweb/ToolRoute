import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { agent_name, x_handle } = body

    if (!agent_name || !x_handle) {
      return NextResponse.json(
        { error: 'agent_name and x_handle are required' },
        { status: 400 }
      )
    }

    // Store verification request in Supabase
    // For MVP: just log it. Manual review via Supabase dashboard.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey)

      // Try to insert into a verification_requests table
      // If table doesn't exist yet, that's fine — we catch the error
      await supabase
        .from('verification_requests')
        .insert({
          agent_name: agent_name.trim(),
          x_handle: x_handle.trim().replace('@', ''),
          status: 'pending',
          submitted_at: new Date().toISOString(),
        })
        .select()
    }

    // Always return success — even if DB insert fails,
    // the verification request is logged in server logs
    console.log(`[VERIFY] New verification request: agent=${agent_name}, x=@${x_handle}`)

    return NextResponse.json({
      status: 'submitted',
      message: 'Verification request submitted. We will review your tweet within 24 hours.',
      agent_name,
      x_handle: x_handle.replace('@', ''),
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to submit verification request' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    name: 'Agent Verification',
    description: 'Verify your agent by tweeting about ToolRoute. Get 2x credits, verified badge, and priority routing.',
    steps: [
      '1. Tweet about ToolRoute using the template at /verify',
      '2. Submit your agent name and X handle',
      '3. We review and upgrade your agent within 24 hours',
    ],
    benefits: [
      '2x credit multiplier on all telemetry reports',
      'Verified badge on leaderboards and agent profiles',
      'Priority routing and higher confidence scores',
    ],
    endpoint: 'POST /api/verify',
    body: {
      agent_name: 'string (required)',
      x_handle: 'string (required, without @)',
    },
  })
}
