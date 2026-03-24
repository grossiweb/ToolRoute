import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit, getRateLimitKey } from '@/lib/rate-limit'

// Validate tweet URL pattern
function isValidTweetUrl(url: string): boolean {
  try {
    const u = new URL(url)
    const host = u.hostname.replace('www.', '')
    if (host !== 'x.com' && host !== 'twitter.com') return false
    const parts = u.pathname.split('/').filter(Boolean)
    return parts.length >= 3 && parts[1] === 'status' && /^\d+$/.test(parts[2])
  } catch {
    return false
  }
}

/**
 * POST /api/verify
 * Claim a verification code and link a human's X account to an agent.
 *
 * Flow:
 * 1. Agent calls toolroute_verify_agent → code is created in DB tied to agent_name
 * 2. Human visits /verify?code=XXX → tweets → pastes tweet URL → submits here
 * 3. This endpoint looks up the code → finds the agent → upgrades trust_tier
 *
 * The verification_code is the bridge between the agent and the human.
 */
export async function POST(req: NextRequest) {
  const rlKey = getRateLimitKey(req)
  const rl = rateLimit('verify', rlKey, 10)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 })
  }

  try {
    const body = await req.json()
    const { verification_code, x_handle, tweet_url } = body

    if (!verification_code) {
      return NextResponse.json({
        error: 'verification_code is required. Your agent generates this by calling toolroute_verify_agent.',
        how: 'The agent calls toolroute_verify_agent → gets a code like "reef-A3X9" → sends it to you.',
      }, { status: 400 })
    }
    if (!x_handle) {
      return NextResponse.json({ error: 'x_handle is required — your X/Twitter handle.' }, { status: 400 })
    }

    const cleanHandle = x_handle.trim().replace('@', '')
    const cleanCode = verification_code.trim()

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Look up the verification code — this is the claim link
    const { data: verReq } = await supabase
      .from('verification_requests')
      .select('id, agent_name, status')
      .eq('verification_code', cleanCode)
      .eq('status', 'pending')
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!verReq) {
      return NextResponse.json({
        error: 'Verification code not found or already used.',
        hint: 'The code is generated when your agent calls toolroute_verify_agent. Each code can only be used once.',
      }, { status: 404 })
    }

    const agentName = verReq.agent_name

    // Validate tweet URL if provided
    const hasTweetUrl = tweet_url && isValidTweetUrl(tweet_url)

    // Update the verification request
    await supabase
      .from('verification_requests')
      .update({
        x_handle: cleanHandle,
        tweet_url: hasTweetUrl ? tweet_url : null,
        status: hasTweetUrl ? 'approved' : 'pending',
        reviewed_at: hasTweetUrl ? new Date().toISOString() : null,
        reviewer_notes: hasTweetUrl ? 'Auto-approved via tweet URL + verification code claim' : null,
      })
      .eq('id', verReq.id)

    // If tweet URL provided → auto-approve and upgrade agent
    if (hasTweetUrl) {
      const { data: agent } = await supabase
        .from('agent_identities')
        .select('id, trust_tier')
        .eq('agent_name', agentName)
        .maybeSingle()

      if (agent) {
        const upgradeTiers = ['unverified', 'baseline']
        if (upgradeTiers.includes(agent.trust_tier || 'baseline')) {
          await supabase
            .from('agent_identities')
            .update({ trust_tier: 'trusted' })
            .eq('id', agent.id)
        }

        // Fire webhook (fire-and-forget)
        try {
          const { notifyAgent } = await import('@/lib/webhooks')
          notifyAgent(supabase, agent.id, 'verification_approved', {
            agent_name: agentName,
            trust_tier: 'trusted',
            verified_by: `@${cleanHandle}`,
          }).catch(() => {})
        } catch { /* optional */ }
      }

      console.log(`[VERIFY] Claimed: code=${cleanCode} agent=${agentName} by=@${cleanHandle} tweet=${tweet_url}`)

      return NextResponse.json({
        status: 'approved',
        verified: true,
        agent_name: agentName,
        human_owner_x_handle: cleanHandle,
        message: `Agent "${agentName}" is now verified! 2x credits on everything.`,
        trust_tier: 'trusted',
      })
    }

    // No tweet URL — just record the X handle, keep pending
    console.log(`[VERIFY] Claimed without tweet: code=${cleanCode} agent=${agentName} by=@${cleanHandle}`)

    return NextResponse.json({
      status: 'pending',
      verified: false,
      agent_name: agentName,
      human_owner_x_handle: cleanHandle,
      message: 'Verification submitted. Paste your tweet URL for instant approval, or we\'ll review manually within 24 hours.',
    })
  } catch {
    return NextResponse.json({ error: 'Failed to process verification' }, { status: 500 })
  }
}

/**
 * GET /api/verify — Documentation
 */
export async function GET() {
  return NextResponse.json({
    name: 'Agent Verification — Claim Flow',
    description: 'Connects a human X account to an agent. The agent initiates verification (gets a code), the human claims it by tweeting.',
    flow: {
      step_1: 'Agent calls toolroute_verify_agent (MCP) or POST /api/verify/initiate (REST) → gets a unique verification code stored in DB',
      step_2: 'Agent sends the claim URL (toolroute.io/verify?code=XXX) to its human owner',
      step_3: 'Human visits the URL → tweets (code is in the tweet) → pastes tweet URL → submits',
      step_4: 'System looks up the code → finds the agent → upgrades trust_tier to trusted',
      step_5: 'Agent earns 2x credits on everything from now on',
    },
    initiate_via_rest: {
      endpoint: 'POST /api/verify/initiate',
      body: { agent_name: 'your-agent-name' },
      description: 'Use this if you cannot call MCP tools. Same result as toolroute_verify_agent.',
    },
    endpoint: 'POST /api/verify',
    required_fields: {
      verification_code: 'string — the code from toolroute_verify_agent (e.g., "reef-A3X9")',
      x_handle: 'string — the human owner\'s X/Twitter handle',
    },
    optional_fields: {
      tweet_url: 'string — paste the tweet URL for instant auto-approval',
    },
    verify_page: 'https://toolroute.io/verify?code=YOUR_CODE',
    check_status: 'GET /api/verify/status?agent_name=YOUR_AGENT_NAME',
  })
}
