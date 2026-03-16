import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient()

  const { searchParams } = new URL(request.url)
  const eventSlug = searchParams.get('event')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

  let query = supabase
    .from('benchmark_missions')
    .select(`
      id, title, description, task_prompt, task_fingerprint,
      reward_multiplier, max_claims, claimed_count, completed_count, status,
      expires_at, created_at,
      olympic_events ( slug, name, event_number )
    `)
    .eq('status', 'available')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (eventSlug) {
    // Filter by event slug through the join
    const { data: event } = await supabase
      .from('olympic_events')
      .select('id')
      .eq('slug', eventSlug)
      .single()

    if (event) {
      query = query.eq('event_id', event.id)
    }
  }

  const { data: missions, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch missions' }, { status: 500 })
  }

  return NextResponse.json({
    missions: missions || [],
    total: missions?.length || 0,
  })
}
