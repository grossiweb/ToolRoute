import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const supabase = createServerSupabaseClient()
  const { slug } = params

  // Look up challenge
  const { data: challenge } = await supabase
    .from('workflow_challenges')
    .select('id, slug, title, category, difficulty, expected_tools, expected_steps, submission_count')
    .eq('slug', slug)
    .single()

  if (!challenge) {
    return NextResponse.json({ error: `Challenge "${slug}" not found` }, { status: 404 })
  }

  // Get top submissions with agent names
  const { data: submissions } = await supabase
    .from('challenge_submissions')
    .select(`
      id, agent_identity_id, status, tools_used, steps_taken,
      total_latency_ms, total_cost_usd,
      completeness_score, quality_score, efficiency_score, overall_score, tier,
      routing_credits_awarded, submitted_at,
      agent_identities ( agent_name, trust_tier )
    `)
    .eq('challenge_id', challenge.id)
    .eq('status', 'scored')
    .order('overall_score', { ascending: false })
    .limit(25)

  const leaderboard = (submissions || []).map((s: any, i: number) => {
    const tools = (s.tools_used || []).map((t: any) => t.skill_slug).filter(Boolean)
    const uniqueTools = [...new Set(tools)]

    return {
      rank: i + 1,
      agent_name: s.agent_identities?.agent_name || 'Unknown',
      trust_tier: s.agent_identities?.trust_tier || 'unknown',
      tier: s.tier,
      overall_score: s.overall_score,
      completeness: s.completeness_score,
      quality: s.quality_score,
      efficiency: s.efficiency_score,
      tools_used: uniqueTools,
      tool_count: uniqueTools.length,
      steps_taken: s.steps_taken,
      total_cost_usd: s.total_cost_usd,
      total_latency_ms: s.total_latency_ms,
      credits_earned: s.routing_credits_awarded,
      submitted_at: s.submitted_at,
    }
  })

  // Tool popularity across submissions
  const toolCounts: Record<string, number> = {}
  for (const s of submissions || []) {
    const tools = (s.tools_used || []).map((t: any) => t.skill_slug).filter(Boolean)
    for (const tool of new Set(tools)) {
      toolCounts[tool as string] = (toolCounts[tool as string] || 0) + 1
    }
  }
  const popularTools = Object.entries(toolCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([slug, count]) => ({ slug, used_by: count }))

  return NextResponse.json({
    challenge: {
      slug: challenge.slug,
      title: challenge.title,
      category: challenge.category,
      difficulty: challenge.difficulty,
      expected_tools: challenge.expected_tools,
      expected_steps: challenge.expected_steps,
      total_submissions: challenge.submission_count,
    },
    leaderboard,
    popular_tools: popularTools,
    submit: `POST /api/challenges/submit with { challenge_slug: "${slug}", agent_identity_id, tools_used, steps_taken, ... }`,
  })
}
