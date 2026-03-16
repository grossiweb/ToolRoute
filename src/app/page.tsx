import { createServerSupabaseClient } from '@/lib/supabase/server'
import { HeroSection } from '@/components/HeroSection'
import { SkillCard } from '@/components/SkillCard'
import { FilterBar } from '@/components/FilterBar'
import { VerticalPills } from '@/components/VerticalPills'

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
      skill_scores ( overall_score, trust_score, reliability_score, output_score ),
      skill_metrics ( github_stars, days_since_last_commit )
    `)
    .eq('status', 'active')
    .limit(30)

  if (searchParams.q) {
    query = query.ilike('canonical_name', `%${searchParams.q}%`)
  }

  const sortBy = searchParams.sort || 'score'
  if (sortBy === 'stars') {
    query = query.order('skill_metrics(github_stars)', { ascending: false })
  } else {
    query = query.order('skill_scores(overall_score)', { ascending: false })
  }

  const { data: skills } = await query

  // Fetch verticals for filter pills
  const { data: verticals } = await supabase
    .from('verticals')
    .select('id, slug, name')
    .order('name')
    .limit(20)

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <HeroSection />

      <div className="mt-10 mb-6">
        <FilterBar />
      </div>

      {verticals && verticals.length > 0 && (
        <div className="mb-8">
          <VerticalPills verticals={verticals} activeVertical={searchParams.vertical} />
        </div>
      )}

      {/* Stats bar */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500">
          {skills ? `${skills.length} skills` : 'Loading...'}{' '}
          {searchParams.q && <span>matching <strong>"{searchParams.q}"</strong></span>}
        </p>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400">Sort:</span>
          <a
            href="?sort=score"
            className={`px-3 py-1 rounded-full transition-colors ${
              sortBy === 'score'
                ? 'bg-brand text-white'
                : 'text-gray-600 hover:text-brand'
            }`}
          >
            NeoSkill Score
          </a>
          <a
            href="?sort=stars"
            className={`px-3 py-1 rounded-full transition-colors ${
              sortBy === 'stars'
                ? 'bg-brand text-white'
                : 'text-gray-600 hover:text-brand'
            }`}
          >
            GitHub Stars
          </a>
        </div>
      </div>

      {/* Skill grid */}
      {skills && skills.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {skills.map((skill: any) => (
            <SkillCard key={skill.id} skill={skill} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium">No skills found</p>
          <p className="text-sm mt-1">Try a different search or <a href="/submit" className="text-brand hover:underline">submit a skill</a></p>
        </div>
      )}
    </div>
  )
}
