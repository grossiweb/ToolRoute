import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { agent_name, x_handle, github_username, method } = body

    if (!agent_name) {
      return NextResponse.json({ error: 'agent_name is required' }, { status: 400 })
    }

    const verifyMethod = method || (github_username ? 'github' : 'x')

    if (verifyMethod === 'x' && !x_handle) {
      return NextResponse.json({ error: 'x_handle is required for X verification' }, { status: 400 })
    }
    if (verifyMethod === 'github' && !github_username) {
      return NextResponse.json({ error: 'github_username is required for GitHub verification' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey)

      await supabase
        .from('verification_requests')
        .insert({
          agent_name: agent_name.trim(),
          method: verifyMethod,
          x_handle: x_handle ? x_handle.trim().replace('@', '') : null,
          github_username: github_username ? github_username.trim() : null,
          status: 'pending',
          submitted_at: new Date().toISOString(),
        })
        .select()
    }

    const handle = verifyMethod === 'x'
      ? x_handle.replace('@', '')
      : github_username

    console.log(`[VERIFY] New ${verifyMethod} verification: agent=${agent_name}, handle=${handle}`)

    return NextResponse.json({
      status: 'submitted',
      message: `Verification request submitted via ${verifyMethod}. We will review within 24 hours.`,
      agent_name,
      method: verifyMethod,
      ...(verifyMethod === 'x'
        ? { x_handle: x_handle.replace('@', '') }
        : { github_username }),
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
    description: 'Verify your agent via X (tweet) or GitHub (star the repo). Get 2x credits, verified badge, and priority routing.',
    methods: {
      x: {
        description: 'Tweet about ToolRoute',
        body: { agent_name: 'string', x_handle: 'string (without @)', method: 'x' },
      },
      github: {
        description: 'Star the ToolRoute repo on GitHub',
        body: { agent_name: 'string', github_username: 'string', method: 'github' },
      },
    },
    benefits: [
      '2x credit multiplier on all telemetry reports',
      'Verified badge on leaderboards and agent profiles',
      'Priority routing and higher confidence scores',
    ],
    endpoint: 'POST /api/verify',
    verify_page: 'https://toolroute.io/verify',
  })
}
