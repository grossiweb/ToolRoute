import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { searchParams } = new URL(request.url)

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
