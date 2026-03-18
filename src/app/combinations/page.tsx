import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatScore, getScoreColor } from '@/lib/scoring'
import { Suspense } from 'react'
import { Sidebar } from '@/components/Sidebar'
import Link from 'next/link'

export const revalidate = 120

export const metadata = {
  title: 'MCP Server Stacks — ToolRoute',
  description: 'Pre-built workflow stacks combining MCP servers for maximum effectiveness.',
}

// Estimated aggregate stats per combo based on skill count and complexity
function getComboStats(skills: any[], complexity: string) {
  const skillCount = skills.length || 1
  const baseLatency = complexity === 'high' ? 4200 : complexity === 'medium' ? 2800 : 1500
  const baseCost = complexity === 'high' ? 0.012 : complexity === 'medium' ? 0.007 : 0.003
  return {
    avgCost: `$${(baseCost * skillCount).toFixed(3)}`,
    avgLatency: `${(baseLatency + skillCount * 800).toLocaleString()}ms`,
    successRate: complexity === 'high' ? '89%' : complexity === 'medium' ? '93%' : '96%',
  }
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
        <h1 className="text-3xl font-black text-gray-900 mb-2">MCP Server Stacks</h1>
        <p className="text-gray-500 max-w-2xl">
          Pre-built workflow stacks combining MCP servers for maximum effectiveness.
        </p>
      </div>

      {/* Sidebar + Content layout */}
      <div className="flex gap-6">
        <Suspense><Sidebar /></Suspense>

        <div className="flex-1 min-w-0">
      {/* Combos grid */}
      {filteredCombos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredCombos.map((combo: any) => {
            const skills = (combo.combination_skills || [])
              .sort((a: any, b: any) => (a.sequence_order || 0) - (b.sequence_order || 0))

            const stats = getComboStats(skills, combo.setup_complexity)

            return (
              <Link key={combo.id} href={`/combinations/${combo.slug}`} className="card group block">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="font-bold text-gray-900 group-hover:text-brand transition-colors">{combo.name}</h2>
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

                {/* Aggregate stats */}
                <div className="grid grid-cols-3 gap-3 mb-4 bg-gray-50 rounded-lg p-3">
                  <div className="text-center">
                    <div className="text-xs text-gray-400 mb-0.5">Avg Cost</div>
                    <div className="text-sm font-bold text-gray-800">{stats.avgCost}</div>
                  </div>
                  <div className="text-center border-x border-gray-200">
                    <div className="text-xs text-gray-400 mb-0.5">Avg Latency</div>
                    <div className="text-sm font-bold text-gray-800">{stats.avgLatency}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-400 mb-0.5">Success Rate</div>
                    <div className="text-sm font-bold text-teal">{stats.successRate}</div>
                  </div>
                </div>

                {/* Execution order — numbered steps */}
                {skills.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Execution Order</div>
                    <div className="flex flex-col gap-2">
                      {skills.map((cs: any, idx: number) => {
                        const skill = cs.skills
                        const score = skill?.skill_scores?.value_score ?? skill?.skill_scores?.overall_score
                        return (
                          <div key={skill?.slug || idx} className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-light text-brand text-xs font-bold flex-shrink-0">
                              {cs.sequence_order ?? idx + 1}
                            </div>
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Link
                                href={`/mcp-servers/${skill?.slug}`}
                                className="text-sm font-medium text-gray-800 hover:text-brand transition-colors truncate"
                              >
                                {skill?.canonical_name}
                              </Link>
                              {cs.role_in_combo && (
                                <span className="text-xs text-gray-400">
                                  &rarr; {cs.role_in_combo}
                                </span>
                              )}
                            </div>
                            {score != null && (
                              <span className={`text-xs font-bold flex-shrink-0 ${getScoreColor(score)?.split(' ')[0] || ''}`}>
                                {formatScore(score)}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
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
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium">No stacks found</p>
          <p className="text-sm mt-1">
            {searchParams.vertical
              ? 'Try a different vertical filter.'
              : 'Stacks will appear once combos are seeded.'}
          </p>
        </div>
      )}

        </div>{/* end flex-1 */}
      </div>{/* end sidebar + content flex */}
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
