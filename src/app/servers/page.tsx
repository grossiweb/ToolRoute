import { createServerSupabaseClient } from '@/lib/supabase/server'
import { SkillCard } from '@/components/SkillCard'
import { Suspense } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { SortDropdown } from '@/components/SortDropdown'

export const revalidate = 3600

export const metadata = {
  title: 'Servers — ToolRoute',
  description: 'Browse and compare MCP servers ranked by real benchmark data. Find the best AI tools for your workflow.',
}

export default async function ServersPage({
  searchParams,
}: {
  searchParams: { q?: string; vertical?: string; workflow?: string; sort?: string }
}) {
  const supabase = createServerSupabaseClient()

  let query = supabase
    .from('skills')
    .select(`
      id, slug, canonical_name, short_description, vendor_type, status,
      skill_scores ( overall_score, trust_score, reliability_score, output_score, efficiency_score, cost_score ),
      skill_metrics ( github_stars, days_since_last_commit )
    `)
    .eq('status', 'active')
    .limit(200)

  if (searchParams.q) {
    query = query.ilike('canonical_name', `%${searchParams.q}%`)
  }

  if (searchParams.workflow) {
    const { data: workflowSkills } = await supabase
      .from('skill_workflows')
      .select('skill_id, workflows!inner(slug)')
      .eq('workflows.slug', searchParams.workflow)
    if (workflowSkills && workflowSkills.length > 0) {
      const skillIds = workflowSkills.map((ws: any) => ws.skill_id)
      query = query.in('id', skillIds)
    } else {
      query = query.in('id', ['00000000-0000-0000-0000-000000000000'])
    }
  }

  if (searchParams.vertical) {
    const { data: verticalSkills } = await supabase
      .from('skill_verticals')
      .select('skill_id, verticals!inner(slug)')
      .eq('verticals.slug', searchParams.vertical)
    if (verticalSkills && verticalSkills.length > 0) {
      const skillIds = verticalSkills.map((vs: any) => vs.skill_id)
      query = query.in('id', skillIds)
    } else {
      query = query.in('id', ['00000000-0000-0000-0000-000000000000'])
    }
  }

  const sortBy = searchParams.sort || 'score'
  const sortMap: Record<string, string> = {
    score: 'skill_scores(overall_score)',
    output: 'skill_scores(output_score)',
    reliability: 'skill_scores(reliability_score)',
    efficiency: 'skill_scores(efficiency_score)',
    cost: 'skill_scores(cost_score)',
    trust: 'skill_scores(trust_score)',
    stars: 'skill_metrics(github_stars)',
    recent: 'skill_metrics(days_since_last_commit)',
  }
  const sortCol = sortMap[sortBy] || sortMap.score
  const ascending = sortBy === 'recent' || sortBy === 'cost' ? true : false
  query = query.order(sortCol, { ascending })

  const { data: skills } = await query

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-light text-brand text-xs font-semibold mb-4">
          MCP SERVER DIRECTORY
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-3">
          Servers
        </h1>
        <p className="text-gray-500 max-w-2xl mx-auto">
          Browse MCP servers ranked by real execution benchmarks. Filter by workflow, industry, or sort by the metrics that matter to you.
        </p>
      </div>

      {/* Stats + Sort bar */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500">
          {skills ? `${skills.length} servers` : 'Loading...'}
          {searchParams.q && <span> matching <strong>&quot;{searchParams.q}&quot;</strong></span>}
          {searchParams.workflow && (
            <span> in <strong>{searchParams.workflow.replace(/-/g, ' ')}</strong>{' '}
              <a href="/servers" className="text-brand hover:underline ml-1">✕ clear</a>
            </span>
          )}
          {searchParams.vertical && (
            <span> in <strong>{searchParams.vertical.replace(/-/g, ' ')}</strong>{' '}
              <a href="/servers" className="text-brand hover:underline ml-1">✕ clear</a>
            </span>
          )}
        </p>
        <Suspense>
          <SortDropdown
            currentSort={sortBy}
            workflow={searchParams.workflow}
            vertical={searchParams.vertical}
            basePath="/servers"
          />
        </Suspense>
      </div>

      {/* Sidebar + Grid */}
      <div className="flex gap-6">
        <Suspense><Sidebar /></Suspense>
        <div className="flex-1 min-w-0">
          {skills && skills.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {skills.map((skill: any) => (
                <SkillCard key={skill.id} skill={skill} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-gray-400">
              <p className="text-lg font-medium">No servers found</p>
              <p className="text-sm mt-1">Try a different search or <a href="/submit" className="text-brand hover:underline">submit a server</a></p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
