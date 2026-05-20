import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const revalidate = 30

export async function GET() {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('model_routing_decisions')
    .select('id, task_snippet, resolved_tier, task_cluster, created_at, agent_identities(agent_name)')
    .order('created_at', { ascending: false })
    .limit(15)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const decisions = (data || []).map((r: any) => ({
    id: r.id,
    agent_name: r.agent_identities?.agent_name || null,
    task_snippet: r.task_snippet,
    resolved_tier: r.resolved_tier,
    task_cluster: r.task_cluster,
    created_at: r.created_at,
  }))

  return NextResponse.json(
    { decisions },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    }
  )
}
