import { createServerSupabaseClient } from '@/lib/supabase/server'
import { HeroSection } from '@/components/HeroSection'
import { SkillCard } from '@/components/SkillCard'
import { Suspense } from 'react'
import { Sidebar } from '@/components/Sidebar'
import Link from 'next/link'

export const revalidate = 3600 // revalidate every hour

export default async function HomePage({
  searchParams,
}: {
  searchParams: { q?: string; vertical?: string; workflow?: string; sort?: string }
}) {
  const supabase = createServerSupabaseClient()

  // Fetch featured skills
  let query = supabase
    .from('skills')
    .select(`
      id, slug, canonical_name, short_description, vendor_type, status,
      skill_scores ( overall_score, trust_score, reliability_score, output_score, efficiency_score, cost_score ),
      skill_metrics ( github_stars, days_since_last_commit )
    `)
    .eq('status', 'active')
    .limit(30)

  if (searchParams.q) {
    query = query.ilike('canonical_name', `%${searchParams.q}%`)
  }

  // Filter by workflow — need to get skill IDs first, then filter
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

  // Filter by vertical
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

  // Fetch verticals for sidebar
  const { data: verticals } = await supabase
    .from('verticals')
    .select('id, slug, name')
    .order('name')
    .limit(20)

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <HeroSection />

      {/* Stats bar */}
      <div className="flex items-center justify-between mt-10 mb-6">
        <p className="text-sm text-gray-500">
          {skills ? `${skills.length} servers` : 'Loading...'}{' '}
          {searchParams.q && <span>matching <strong>&quot;{searchParams.q}&quot;</strong></span>}
          {searchParams.workflow && <span>in <strong>{searchParams.workflow.replace(/-/g, ' ')}</strong> <Link href="/" scroll={false} className="text-brand hover:underline ml-1">✕ clear</Link></span>}
          {searchParams.vertical && <span>in <strong>{searchParams.vertical.replace(/-/g, ' ')}</strong> <Link href="/" scroll={false} className="text-brand hover:underline ml-1">✕ clear</Link></span>}
        </p>
        <div className="flex items-center gap-2 text-sm overflow-x-auto">
          <span className="text-gray-400 flex-shrink-0">Sort:</span>
          {[
            { key: 'score', label: 'Overall Score' },
            { key: 'output', label: 'Output Quality' },
            { key: 'reliability', label: 'Reliability' },
            { key: 'efficiency', label: 'Efficiency' },
            { key: 'cost', label: 'Cost' },
            { key: 'trust', label: 'Trust' },
            { key: 'stars', label: 'GitHub Stars' },
            { key: 'recent', label: 'Last Commit' },
          ].map(opt => (
            <Link
              key={opt.key}
              href={`?sort=${opt.key}${searchParams.workflow ? `&workflow=${searchParams.workflow}` : ''}${searchParams.vertical ? `&vertical=${searchParams.vertical}` : ''}`}
              scroll={false}
              className={`px-3 py-1 rounded-full transition-colors whitespace-nowrap flex-shrink-0 ${
                sortBy === opt.key
                  ? 'bg-brand text-white'
                  : 'text-gray-600 hover:text-brand'
              }`}
            >
              {opt.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Sidebar + Grid layout */}
      <div className="flex gap-6">
        <Suspense><Sidebar /></Suspense>

        {/* Main content */}
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
