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

  const { workflow_slug, vertical_slug, constraints = {} } = body
  const {
    priority = 'best_value',
    max_cost_usd,
    trust_floor = 0,
    latency_preference = 'medium',
  } = constraints

  if (!workflow_slug) {
    return NextResponse.json({ error: 'workflow_slug required' }, { status: 400 })
  }

  // Fetch skills with scores that match the workflow
  const { data: skills } = await supabase
    .from('skills')
    .select(`
      id, slug, canonical_name, short_description,
      skill_scores ( overall_score, trust_score, reliability_score, output_score, efficiency_score, cost_score, value_score ),
      skill_metrics ( github_stars, days_since_last_commit ),
      skill_cost_models ( monthly_base_cost_usd, pricing_model )
    `)
    .eq('status', 'active')
    .not('skill_scores', 'is', null)
    .gte('skill_scores.trust_score', trust_floor)
    .limit(50)

  if (!skills || skills.length === 0) {
    return NextResponse.json({
      recommended_skill: null,
      message: 'No scored skills found for this workflow yet. Data accumulating.',
    })
  }

  // Sort by priority mode
  const sorted = [...skills].sort((a: any, b: any) => {
    const sa = a.skill_scores
    const sb = b.skill_scores
    if (!sa || !sb) return 0
    switch (priority) {
      case 'best_quality': return (sb.output_score || 0) - (sa.output_score || 0)
      case 'best_efficiency': return (sb.efficiency_score || 0) - (sa.efficiency_score || 0)
      case 'lowest_cost': return (sb.cost_score || 0) - (sa.cost_score || 0)
      case 'highest_trust': return (sb.trust_score || 0) - (sa.trust_score || 0)
      case 'most_reliable': return (sb.reliability_score || 0) - (sa.reliability_score || 0)
      default: return (sb.overall_score || 0) - (sa.overall_score || 0) // best_value
    }
  })

  const top = sorted[0] as any
  const alternatives = sorted.slice(1, 3).map((s: any) => s.slug)

  return NextResponse.json({
    recommended_skill: top.slug,
    recommended_skill_name: top.canonical_name,
    alternatives,
    scores: top.skill_scores,
    reasoning_summary: buildReasoning(top, priority),
    non_mcp_alternative: getNonMcpAlternative(workflow_slug),
    wanted_telemetry: {
      reward_multiplier: 1.5,
      fields: ['latency_ms', 'estimated_cost_usd', 'output_quality_rating', 'fallback_chain_if_any'],
    },
  })
}

function buildReasoning(skill: any, priority: string): string {
  const scores = skill.skill_scores
  if (!scores) return 'Recommended based on catalog metadata.'
  const score = scores.overall_score?.toFixed(1)
  return `${skill.canonical_name} scores ${score}/10 overall. Selected for ${priority.replace(/_/g, ' ')}.`
}

function getNonMcpAlternative(workflowSlug: string): object | null {
  const alternatives: Record<string, object> = {
    'developer-workflow-code-management': {
      approach: 'direct_cli',
      example: 'gh issue list --repo owner/repo',
      when_to_prefer: 'Simple read-only queries where speed matters more than LLM reasoning',
      tradeoff: 'No LLM context about results, but 3-5x faster with no token overhead',
    },
    'data-analysis-reporting': {
      approach: 'direct_api',
      example: 'Direct SQL via psql or database client',
      when_to_prefer: 'Structured, deterministic queries where the schema is known',
      tradeoff: 'No natural language interface, but faster and cheaper for batch operations',
    },
  }
  return alternatives[workflowSlug] || null
}
