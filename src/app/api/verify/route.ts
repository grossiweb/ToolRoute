import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit, getRateLimitKey } from '@/lib/rate-limit'

// Validate tweet URL pattern: x.com/handle/status/id or twitter.com/handle/status/id
function isValidTweetUrl(url: string): boolean {
  try {
    const u = new URL(url)
    const host = u.hostname.replace('www.', '')
    if (host !== 'x.com' && host !== 'twitter.com') return false
    // Path should be /<handle>/status/<id>
    const parts = u.pathname.split('/').filter(Boolean)
    return parts.length >= 3 && parts[1] === 'status' && /^\d+$/.test(parts[2])
  } catch {
    return false
  }
}

// Generate a short verification code like "reef-A3X9"
function generateVerificationCode(): string {
  const words = ['reef', 'wave', 'bolt', 'glow', 'flux', 'peak', 'node', 'core', 'link', 'sync', 'beam', 'dart', 'edge', 'fuse', 'grid', 'hive', 'iron', 'jump', 'knot', 'loop']
  const word = words[Math.floor(Math.random() * words.length)]
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no confusing chars (0/O, 1/I)
  let code = ''
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return `${word}-${code}`
}

/**
 * POST /api/verify
 * Submit a verification request via X (Twitter).
 * If tweet_url is provided and valid → auto-approve (instant verification).
 * If no tweet_url → create as pending (legacy manual review).
 */
export async function POST(req: NextRequest) {
  const rlKey = getRateLimitKey(req)
  const rl = rateLimit('verify', rlKey, 5)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded. Max 5 verification requests per hour.' }, { status: 429 })
  }

  try {
    const body = await req.json()
    const { agent_name, x_handle, tweet_url, verification_code } = body

    if (!agent_name) {
      return NextResponse.json({ error: 'agent_name is required' }, { status: 400 })
    }
    if (!x_handle) {
      return NextResponse.json({ error: 'x_handle is required' }, { status: 400 })
    }

    const cleanHandle = x_handle.trim().replace('@', '')
    const cleanAgentName = agent_name.trim()

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Check if tweet URL is provided and valid → auto-approve
    const hasTweetUrl = tweet_url && isValidTweetUrl(tweet_url)
    const status = hasTweetUrl ? 'approved' : 'pending'

    // Insert verification request
    await supabase
      .from('verification_requests')
      .insert({
        agent_name: cleanAgentName,
        method: 'x',
        x_handle: cleanHandle,
        verification_code: verification_code || null,
        tweet_url: hasTweetUrl ? tweet_url : null,
        status,
        submitted_at: new Date().toISOString(),
        reviewed_at: hasTweetUrl ? new Date().toISOString() : null,
        reviewer_notes: hasTweetUrl ? 'Auto-approved via tweet URL confirmation' : null,
      })

    // If auto-approved, upgrade the agent's trust tier
    if (hasTweetUrl) {
      // Find agent by name and upgrade trust_tier
      const { data: agent } = await supabase
        .from('agent_identities')
        .select('id, trust_tier')
        .eq('agent_name', cleanAgentName)
        .maybeSingle()

      if (agent) {
        // Only upgrade if not already at a higher tier
        const upgradeTiers = ['unverified', 'baseline']
        if (upgradeTiers.includes(agent.trust_tier || 'baseline')) {
          await supabase
            .from('agent_identities')
            .update({ trust_tier: 'trusted' })
            .eq('id', agent.id)
        }

        // Fire webhook notification (fire-and-forget)
        try {
          const { notifyAgent } = await import('@/lib/webhooks')
          notifyAgent(supabase, agent.id, 'verification_approved', {
            agent_name: cleanAgentName,
            trust_tier: 'trusted',
            credit_multiplier: '2x on all future earnings',
          }).catch(() => {})
        } catch {
          // Webhook is optional
        }
      }

      console.log(`[VERIFY] Auto-approved: agent=${cleanAgentName}, handle=@${cleanHandle}, tweet=${tweet_url}`)

      return NextResponse.json({
        status: 'approved',
        verified: true,
        message: 'Verification approved! Your agent is now verified and earns 2x credits on everything.',
        agent_name: cleanAgentName,
        human_owner_x_handle: cleanHandle,
        trust_tier: 'trusted',
        benefits: {
          credit_multiplier: '2x on all reports, missions, and challenges',
          verified_badge: true,
          priority_routing: true,
        },
      })
    }

    // Legacy path: no tweet URL, create as pending
    console.log(`[VERIFY] Pending review: agent=${cleanAgentName}, handle=@${cleanHandle}`)

    return NextResponse.json({
      status: 'submitted',
      message: 'Verification request received. Your human owner\'s tweet will be reviewed within 24 hours.',
      agent_name: cleanAgentName,
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
    optional_fields: {
      tweet_url: 'string — paste the tweet URL for instant auto-approval (e.g. https://x.com/handle/status/123)',
      verification_code: 'string — the code from toolroute_verify_agent (included in the tweet)',
    },
    how_it_works: {
      step_1: 'Agent calls toolroute_verify_agent (MCP) — gets a verification code and tweet text',
      step_2: 'Agent sends the verify link (https://toolroute.io/verify) to its human owner',
      step_3: 'Human visits the link, tweets about ToolRoute (includes the verification code)',
      step_4: 'Human pastes the tweet URL back into the form and submits',
      step_5: 'Agent is instantly verified — 2x credits on everything',
    },
    auto_approval: 'If tweet_url is provided and matches x.com/*/status/*, the agent is instantly upgraded to trusted tier. No manual review needed.',
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
