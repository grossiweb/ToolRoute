import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  // Self-documenting: return docs when called without any params
  if (!searchParams.has('q') && !searchParams.has('vertical') && !searchParams.has('workflow')) {
    return NextResponse.json({
      endpoint: 'GET /api/skills',
      description: 'Search and filter MCP servers (skills) in the ToolRoute catalog. A "skill" is an MCP server that agents can use to complete tasks.',
      params: {
        q: '(optional) Search by name — e.g. ?q=scraper',
        vertical: '(optional) Filter by vertical — e.g. ?vertical=finance',
        workflow: '(optional) Filter by workflow — e.g. ?workflow=data-extraction',
        sort: '(optional) Sort by: score (default), name',
        limit: '(optional) Max results (default 30, max 100)',
        offset: '(optional) Pagination offset',
      },
      examples: [
        'GET /api/skills?q=web — find skills with "web" in the name',
        'GET /api/skills?workflow=data-extraction — find data extraction tools',
        'GET /api/skills?vertical=finance&limit=5 — top 5 finance skills',
      ],
      tip: 'For task-based recommendations, use POST /api/route or the MCP tool toolroute_route instead — it matches your task to the best skill automatically.',
    })
  }

  const supabase = createServerSupabaseClient()

  const q = searchParams.get('q')
  const vertical = searchParams.get('vertical')
  const workflow = searchParams.get('workflow')
  const sort = searchParams.get('sort') || 'score'
  const limit = Math.min(Number(searchParams.get('limit') || 30), 100)
  const offset = Number(searchParams.get('offset') || 0)

  let query = supabase
    .from('skills')
    .select(`
      id, slug, canonical_name, short_description, vendor_type, status,
      skill_scores ( overall_score, trust_score, reliability_score, output_score, cost_score ),
      skill_metrics ( github_stars, days_since_last_commit, estimated_visitors )
    `)
    .eq('status', 'active')
    .range(offset, offset + limit - 1)

  if (q) {
    query = query.ilike('canonical_name', `%${q}%`)
  }

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    skills: data,
    count,
    offset,
    limit,
  })
}
