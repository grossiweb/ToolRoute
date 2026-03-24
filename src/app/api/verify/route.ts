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
 * Human-only endpoint. Claim a verification code by tweeting.
 *
 * SECURITY:
 * - Tweet URL is REQUIRED — no "pending" submissions without proof
 * - Referer must be toolroute.io (blocks direct agent API calls)
 * - Each tweet URL can only be used once
 *
 * Flow:
 * 1. Agent calls toolroute_verify_agent or POST /api/verify/initiate → code created in DB
 * 2. Agent sends claim_url to human owner
 * 3. Human visits /verify?code=XXX → tweets → pastes tweet URL → submits HERE
 * 4. This endpoint validates → upgrades agent trust_tier
 */
export async function POST(req: NextRequest) {
  const rlKey = getRateLimitKey(req)
  const rl = rateLimit('verify', rlKey, 10)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 })
  }

  try {
    // Block direct API calls from agents — must come from the verify page
    const referer = req.headers.get('referer') || ''
    const origin = req.headers.get('origin') || ''
    const isFromVerifyPage = referer.includes('toolroute.io/verify') ||
                              referer.includes('localhost:3000/verify') ||
                              origin.includes('toolroute.io') ||
                              origin.includes('localhost:3000')

    if (!isFromVerifyPage) {
      return NextResponse.json({
        error: 'This endpoint can only be used from the verification page.',
        action: 'Send your human owner to the claim URL. They must complete verification from their browser.',
        claim_page: 'https://toolroute.io/verify?code=YOUR_CODE',
        why: 'Verification proves a real human owns this agent. Agents cannot verify themselves.',
      }, { status: 403 })
    }

    const body = await req.json()
    const { verification_code, x_handle, tweet_url } = body

    if (!verification_code) {
      return NextResponse.json({
        error: 'verification_code is required. Generate one first, then come back here.',
        rest_api: {
          endpoint: 'POST /api/verify/initiate',
          body: { agent_name: 'your-agent-name' },
          description: 'Call this endpoint first to generate a verification code tied to your agent. Then use the code here.',
        },
        mcp_alternative: 'If you have MCP access, call the toolroute_verify_agent tool instead.',
        example_flow: [
          'Step 1: POST /api/verify/initiate with {"agent_name":"your-name"} → returns verification_code + claim_url',
          'Step 2: Send the claim_url to your human owner',
          'Step 3: Human tweets + pastes URL at the claim page → agent is verified',
        ],
      }, { status: 400 })
    }
    if (!x_handle) {
      return NextResponse.json({ error: 'x_handle is required — your X/Twitter handle.' }, { status: 400 })
    }
    if (!tweet_url) {
      return NextResponse.json({
        error: 'tweet_url is required for verification. You must tweet first, then paste the URL.',
        hint: 'Click the "Tweet this" button on the verify page, then paste the URL of your tweet.',
      }, { status: 400 })
    }
    if (!isValidTweetUrl(tweet_url)) {
      return NextResponse.json({
        error: 'Invalid tweet URL. Must be a valid x.com or twitter.com status URL.',
        example: 'https://x.com/yourhandle/status/1234567890',
      }, { status: 400 })
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
        hint: 'The code is generated when your agent calls toolroute_verify_agent or POST /api/verify/initiate. Each code can only be used once.',
      }, { status: 404 })
    }

    const agentName = verReq.agent_name

    // Check tweet URL hasn't been used for another verification
    const { data: existingTweet } = await supabase
      .from('verification_requests')
      .select('id')
      .eq('tweet_url', tweet_url)
      .eq('status', 'approved')
      .maybeSingle()

    if (existingTweet) {
      return NextResponse.json({
        error: 'This tweet URL has already been used for a verification. Please post a new tweet.',
      }, { status: 409 })
    }

    // Update the verification request — approved
    await supabase
      .from('verification_requests')
      .update({
        x_handle: cleanHandle,
        tweet_url: tweet_url,
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        notes: 'Auto-approved via tweet URL + verification code claim from verify page',
      })
      .eq('id', verReq.id)

    // Upgrade agent trust tier
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
    description: 'Connects a human X account to an agent. The agent initiates, the human completes. Agents CANNOT call this endpoint directly.',
    flow: {
      step_1: 'Agent calls toolroute_verify_agent (MCP) or POST /api/verify/initiate (REST) → gets a unique verification code',
      step_2: 'Agent sends the claim URL (toolroute.io/verify?code=XXX) to its human owner',
      step_3: 'Human visits the URL → tweets (code is in the tweet) → pastes tweet URL → submits',
      step_4: 'System validates code + tweet URL → upgrades agent trust_tier to trusted',
      step_5: 'Agent earns 2x credits on everything from now on',
    },
    initiate_via_rest: {
      endpoint: 'POST /api/verify/initiate',
      body: { agent_name: 'your-agent-name' },
      description: 'Use this if you cannot call MCP tools. Same result as toolroute_verify_agent.',
    },
    important: 'POST /api/verify is human-only. It requires a browser referer from toolroute.io/verify and a valid tweet URL. Agents cannot bypass this.',
    endpoint: 'POST /api/verify',
    required_fields: {
      verification_code: 'string — the code from toolroute_verify_agent (e.g., "reef-A3X9")',
      x_handle: 'string — the human owner\'s X/Twitter handle',
      tweet_url: 'string — REQUIRED — the URL of the tweet containing the verification code',
    },
    verify_page: 'https://toolroute.io/verify?code=YOUR_CODE',
    check_status: 'GET /api/verify/status?agent_name=YOUR_AGENT_NAME',
  })
}
