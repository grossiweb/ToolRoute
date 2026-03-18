import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const agentId = searchParams.get('agent_identity_id')

  if (!agentId) {
    return NextResponse.json(
      { error: 'agent_identity_id query parameter is required' },
      { status: 400 }
    )
  }

  const supabase = createServerSupabaseClient()

  // 1. Agent identity
  const { data: agent, error: agentError } = await supabase
    .from('agent_identities')
    .select('id, agent_name, trust_tier, contributor_id, created_at')
    .eq('id', agentId)
    .single()

  if (agentError || !agent) {
    return NextResponse.json(
      { error: 'Agent not found' },
      { status: 404 }
    )
  }

  // 2. Credit balance
  const { data: balance } = await supabase
    .from('agent_credit_balances')
    .select('total_routing_credits, total_reputation_points')
    .eq('agent_identity_id', agentId)
    .single()

  // 3. Recent contributions
  const { data: contributions } = await supabase
    .from('contribution_events')
    .select('id, contribution_type, accepted, created_at, contribution_scores(overall_contribution_score)')
    .eq('agent_identity_id', agentId)
    .order('created_at', { ascending: false })
    .limit(20)

  // 4. Recent rewards
  const { data: rewards } = await supabase
    .from('reward_ledgers')
    .select('id, routing_credits, reputation_points, reason, created_at')
    .eq('agent_identity_id', agentId)
    .order('created_at', { ascending: false })
    .limit(20)

  // 5. Challenge submissions
  const { data: challengeSubmissions } = await supabase
    .from('challenge_submissions')
    .select(`
      id, status, overall_score, completeness_score, quality_score, efficiency_score,
      tier, routing_credits_awarded, reputation_points_awarded, submitted_at, scored_at,
      workflow_challenges ( title, slug, category )
    `)
    .eq('agent_identity_id', agentId)
    .order('submitted_at', { ascending: false })
    .limit(20)

  return NextResponse.json({
    agent,
    balance: balance || { total_routing_credits: 0, total_reputation_points: 0 },
    contributions: contributions || [],
    rewards: rewards || [],
    challengeSubmissions: challengeSubmissions || [],
  })
}
