import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatScore, getScoreColor } from '@/lib/scoring'
import Link from 'next/link'

export const revalidate = 3600

export const metadata = {
  title: 'Skill Combinations — NeoSkill',
  description: 'Pre-built skill stacks for common agent workflows. Combine MCP servers for maximum effectiveness.',
}

export default async function CombinationsPage({
  searchParams,
}: {
  searchParams: { vertical?: string }
}) {
  const supabase = createServerSupabaseClient()

  // Fetch combinations with their skills
  const { data: combinations } = await supabase
    .from('combinations')
    .select(`
      id, slug, name, headline, description, setup_complexity, confidence_level, featured,
      workflows ( slug, name ),
      combination_skills (
        role_in_combo, sequence_order,
        skills ( slug, canonical_name, vendor_type, skill_scores ( overall_score, value_score ) )
      )
    `)
    .order('featured', { ascending: false })

  // Fetch verticals for filter
  const { data: verticals } = await supabase
    .from('verticals')
    .select('slug, name')
    .order('name')

  // If vertical filter is active, fetch combination_verticals to filter
  let filteredCombos = combinations || []
  if (searchParams.vertical && combinations) {
    const { data: comboVerticals } = await supabase
      .from('combination_verticals')
      .select('combination_id, verticals ( slug )')

    const matchingIds = new Set(
      (comboVerticals || [])
        .filter((cv: any) => cv.verticals?.slug === searchParams.vertical)
        .map((cv: any) => cv.combination_id)
    )
    filteredCombos = combinations.filter((c: any) => matchingIds.has(c.id))
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-black text-gray-900 mb-2">Skill Combinations</h1>
        <p className="text-gray-500 max-w-2xl">
          Pre-built skill stacks for common agent workflows. Each combination has been designed
          for a specific use case with roles and execution order defined.
        </p>
      </div>

      {/* Vertical filter */}
      {verticals && verticals.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-8 -mx-4 px-4">
          <Link
            href="/combinations"
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              !searchParams.vertical
                ? 'bg-brand text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </Link>
          {verticals.map((v: any) => (
            <Link
              key={v.slug}
              href={`/combinations?vertical=${v.slug}`}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                searchParams.vertical === v.slug
                  ? 'bg-brand text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {v.name}
            </Link>
          ))}
        </div>
      )}

      {/* Combos grid */}
      {filteredCombos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredCombos.map((combo: any) => {
            const skills = (combo.combination_skills || [])
              .sort((a: any, b: any) => (a.sequence_order || 0) - (b.sequence_order || 0))

            return (
              <div key={combo.id} className="card">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="font-bold text-gray-900">{combo.name}</h2>
                      {combo.featured && (
                        <span className="badge bg-amber-50 text-amber-700 text-[10px]">Featured</span>
                      )}
                    </div>
                    {combo.headline && (
                      <p className="text-xs text-brand font-medium">{combo.headline}</p>
                    )}
                  </div>
                  <ComplexityBadge level={combo.setup_complexity} />
                </div>

                <p className="text-sm text-gray-500 mb-4">{combo.description}</p>

                {/* Skill chain */}
                {skills.length > 0 && (
                  <div className="flex flex-col gap-2 mb-4">
                    {skills.map((cs: any, idx: number) => {
                      const skill = cs.skills
                      const score = skill?.skill_scores?.value_score ?? skill?.skill_scores?.overall_score
                      return (
                        <div key={skill?.slug || idx} className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-light text-brand text-xs font-bold flex-shrink-0">
                            {idx + 1}
                          </div>
                          <Link
                            href={`/skills/${skill?.slug}`}
                            className="text-sm font-medium text-gray-800 hover:text-brand transition-colors"
                          >
                            {skill?.canonical_name}
                          </Link>
                          {cs.role_in_combo && (
                            <span className="text-[10px] text-gray-400 uppercase">{cs.role_in_combo}</span>
                          )}
                          {score != null && (
                            <span className={`text-xs font-bold ml-auto ${getScoreColor(score)?.split(' ')[0] || ''}`}>
                              {formatScore(score)}
                            </span>
                          )}
                          {idx < skills.length - 1 && (
                            <span className="text-gray-300 text-xs ml-auto">→</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-400">
                  <span>
                    {combo.workflows?.name || 'General'}
                  </span>
                  <span>
                    Confidence: <strong className="text-gray-600">{combo.confidence_level}</strong>
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium">No combinations found</p>
          <p className="text-sm mt-1">
            {searchParams.vertical
              ? 'Try a different vertical filter.'
              : 'Combinations will appear once combos are seeded.'}
          </p>
        </div>
      )}
    </div>
  )
}

function ComplexityBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    low: 'bg-green-50 text-green-700',
    medium: 'bg-amber-50 text-amber-700',
    high: 'bg-red-50 text-red-700',
  }
  return (
    <span className={`badge text-[10px] flex-shrink-0 ${styles[level] || 'bg-gray-100 text-gray-500'}`}>
      {level} setup
    </span>
  )
}
