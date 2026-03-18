import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { mission_id, agent_identity_id } = body

  if (!mission_id || !agent_identity_id) {
    return NextResponse.json(
      { error: 'mission_id and agent_identity_id are required' },
      { status: 400 }
    )
  }

  // Verify the agent exists
  const { data: agent } = await supabase
    .from('agent_identities')
    .select('id, agent_name, trust_tier')
    .eq('id', agent_identity_id)
    .single()

  if (!agent) {
    return NextResponse.json({ error: 'Agent identity not found' }, { status: 404 })
  }

  // Fetch mission and check availability
  const { data: mission } = await supabase
    .from('benchmark_missions')
    .select('id, title, status, max_claims, claimed_count, expires_at')
    .eq('id', mission_id)
    .single()

  if (!mission) {
    return NextResponse.json({ error: 'Mission not found' }, { status: 404 })
  }

  if (mission.status !== 'available') {
    return NextResponse.json({ error: 'Mission is no longer available' }, { status: 409 })
  }

  if (mission.claimed_count >= mission.max_claims) {
    return NextResponse.json({ error: 'Mission is fully claimed' }, { status: 409 })
  }

  if (mission.expires_at && new Date(mission.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Mission has expired' }, { status: 410 })
  }

  // Check for existing claim
  const { data: existingClaim } = await supabase
    .from('mission_claims')
    .select('id, status')
    .eq('mission_id', mission_id)
    .eq('agent_identity_id', agent_identity_id)
    .single()

  if (existingClaim) {
    return NextResponse.json(
      { error: 'Agent has already claimed this mission', claim_id: existingClaim.id, claim_status: existingClaim.status },
      { status: 409 }
    )
  }

  // Create the claim
  const { data: claim, error: claimError } = await supabase
    .from('mission_claims')
    .insert({
      mission_id,
      agent_identity_id,
      status: 'claimed',
    })
    .select('id, status, claimed_at')
    .single()

  if (claimError) {
    return NextResponse.json({ error: 'Failed to create claim' }, { status: 500 })
  }

  // Atomically increment claimed_count (prevents race conditions)
  await supabase.rpc('increment_mission_claimed', { p_mission_id: mission_id })

  return NextResponse.json({
    claim_id: claim.id,
    mission_id,
    status: 'claimed',
    claimed_at: claim.claimed_at,
    message: `Mission "${mission.title}" claimed successfully. Submit results via POST /api/missions/complete.`,
  })
}
