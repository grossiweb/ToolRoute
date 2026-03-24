import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit, getRateLimitKey } from '@/lib/rate-limit'

/**
 * POST /api/verify/initiate
 * REST alternative to the MCP toolroute_verify_agent tool.
 * Generates a verification code tied to an agent and returns the claim URL.
 *
 * Body: { "agent_name": "my-agent" }
 * OR:   { "agent_identity_id": "uuid" }
 *
 * Returns: { verification_code, claim_url, tweet_url, steps_for_human }
 */
export async function POST(req: NextRequest) {
  const rlKey = getRateLimitKey(req)
  const rl = rateLimit('verify-initiate', rlKey, 10)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 })
  }

  try {
    const body = await req.json()
    const { agent_name, agent_identity_id } = body

    if (!agent_name && !agent_identity_id) {
      return NextResponse.json({
        error: 'agent_name or agent_identity_id is required.',
        example: { agent_name: 'my-agent' },
      }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Resolve agent name from ID if needed
    let resolvedName = agent_name
    if (!resolvedName && agent_identity_id) {
      const { data: agent } = await supabase
        .from('agent_identities')
        .select('agent_name')
        .eq('id', agent_identity_id)
        .maybeSingle()
      if (!agent) {
        return NextResponse.json({ error: 'Agent not found with that ID.' }, { status: 404 })
      }
      resolvedName = agent.agent_name
    }

    // Generate verification code (same logic as MCP tool)
    const words = ['reef', 'wave', 'bolt', 'glow', 'flux', 'peak', 'node', 'core', 'link', 'sync', 'beam', 'dart', 'edge', 'fuse', 'grid']
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const word = words[Math.floor(Math.random() * words.length)]
    let suffix = ''
    for (let i = 0; i < 4; i++) suffix += chars[Math.floor(Math.random() * chars.length)]
    const verificationCode = `${word}-${suffix}`

    // Store in DB
    await supabase
      .from('verification_requests')
      .insert({
        agent_name: resolvedName,
        method: 'x',
        verification_code: verificationCode,
        status: 'pending',
        submitted_at: new Date().toISOString(),
      })

    const tweetText = `Why are you still hardcoding which LLM your agent uses?\n\nToolRoute picks the best MCP server + cheapest model for every task — based on real execution data, not vibes.\n\nVerification: ${verificationCode}\n@ToolRoute4U https://toolroute.io`
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`
    const claimUrl = `https://toolroute.io/verify?code=${verificationCode}`

    console.log(`[VERIFY-INITIATE] code=${verificationCode} agent=${resolvedName}`)

    return NextResponse.json({
      verification_code: verificationCode,
      claim_url: claimUrl,
      tweet_url: tweetUrl,
      agent_name: resolvedName,
      what_to_tell_your_human: `Hey! I need you to verify me on ToolRoute so I can earn 2x credits. It takes 30 seconds:\n\n1. Go to ${claimUrl}\n2. Tweet using the button (it includes my verification code: ${verificationCode})\n3. Paste your tweet URL and your X handle\n4. Click Verify — I'm instantly verified!\n\nThe code ${verificationCode} is tied to my agent account "${resolvedName}". No one else can use it.`,
      steps_for_human: [
        `1. Human opens ${claimUrl}`,
        `2. Human tweets (includes verification code: ${verificationCode})`,
        '3. Human pastes their tweet URL and X handle',
        `4. Human clicks Verify — agent "${resolvedName}" is instantly verified`,
      ],
      benefits: {
        credit_multiplier: '2×',
        verified_badge: true,
        priority_routing: true,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to initiate verification' }, { status: 500 })
  }
}

/**
 * GET /api/verify/initiate — Documentation
 */
export async function GET() {
  return NextResponse.json({
    name: 'Initiate Agent Verification (REST)',
    description: 'Generates a verification code tied to your agent. REST alternative to the toolroute_verify_agent MCP tool.',
    endpoint: 'POST /api/verify/initiate',
    body: {
      agent_name: 'string — your registered agent name (required if no agent_identity_id)',
      agent_identity_id: 'string — your agent UUID (alternative to agent_name)',
    },
    returns: 'verification_code, claim_url, tweet_url, steps_for_human',
    flow: [
      '1. Agent calls POST /api/verify/initiate with agent_name',
      '2. Gets back a verification_code and claim_url',
      '3. Agent tells human to visit claim_url',
      '4. Human tweets + pastes URL → agent is verified instantly',
    ],
    example: {
      method: 'POST',
      url: '/api/verify/initiate',
      body: { agent_name: 'my-agent' },
    },
  })
}
