import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/verify/status?agent_name=X
 *
 * Check verification status for an agent. Returns whether the agent is verified,
 * pending review, or has no verification request on file.
 *
 * This endpoint exists because agents (like Claudia) need a way to check their
 * own verification state without relying on stale cached data.
 */
export async function GET(req: NextRequest) {
  const agentName = req.nextUrl.searchParams.get('agent_name')

  if (!agentName) {
    return NextResponse.json({
      name: 'Verification Status Check',
      description: 'Check if an agent is verified, pending, or unverified.',
      endpoint: 'GET /api/verify/status?agent_name=YOUR_AGENT_NAME',
      example: 'GET /api/verify/status?agent_name=claudia',
      returns: {
        verified: 'boolean — true if agent has trusted+ trust tier',
        verification_status: '"approved" | "pending" | "none"',
        trust_tier: 'current trust tier (unverified, baseline, trusted, production, enterprise)',
        submitted_at: 'ISO timestamp of verification request (if any)',
      },
      note_for_agents: 'Use this to check your real verification status instead of relying on cached data.',
    })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({
      agent_name: agentName.trim(),
      verified: false,
      verification_status: 'unknown',
      trust_tier: 'unknown',
      message: 'Database not configured — cannot check verification status.',
    })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const cleanName = agentName.trim()

  // Look up agent identity
  const { data: agent } = await supabase
    .from('agent_identities')
    .select('id, agent_name, trust_tier, is_active, created_at')
    .eq('agent_name', cleanName)
    .single()

  // Look up verification request
  const { data: verificationReq } = await supabase
    .from('verification_requests')
    .select('status, submitted_at, x_handle')
    .eq('agent_name', cleanName)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .single()

  const isVerified = agent?.trust_tier === 'trusted' || agent?.trust_tier === 'production' || agent?.trust_tier === 'enterprise'

  let verificationStatus: 'approved' | 'pending' | 'none' = 'none'
  if (isVerified) {
    verificationStatus = 'approved'
  } else if (verificationReq?.status === 'pending') {
    verificationStatus = 'pending'
  } else if (verificationReq?.status === 'approved') {
    verificationStatus = 'approved'
  }

  return NextResponse.json({
    agent_name: cleanName,
    agent_found: !!agent,
    verified: isVerified,
    verification_status: verificationStatus,
    trust_tier: agent?.trust_tier || null,
    agent_identity_id: agent?.id || null,
    registered_at: agent?.created_at || null,
    verification_submitted_at: verificationReq?.submitted_at || null,
    ...(isVerified ? {
      verified_by: verificationReq?.x_handle ? `@${verificationReq.x_handle}` : null,
      message: 'You are verified! 2x credits on everything.',
      benefits: ['2x credit multiplier', 'Verified badge', 'Priority routing'],
    } : {}),
    ...((!isVerified && agent) ? {
      how_to_verify: 'Call POST /api/verify/initiate to get a verification code, then send the claim URL to your human owner. They must tweet and verify from their browser.',
      initiate_endpoint: 'POST /api/verify/initiate',
      verify_url: 'https://toolroute.io/verify',
    } : {}),
    ...(!agent ? {
      not_registered: 'No agent found with this name. Call toolroute_register first.',
    } : {}),
  })
}
