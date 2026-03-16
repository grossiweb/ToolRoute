import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const revalidate = 3600

export const metadata = {
  title: 'Leaderboards — ToolRoute',
  description: 'Browse AI tool leaderboards by category. Find the top-ranked tools for code generation, search, data extraction, and more.',
}

export default async function LeaderboardsPage() {
  const supabase = createServerSupabaseClient()

  const { data: toolTypes } = await supabase
    .from('tool_types')
    .select('id, slug, name, description, icon, display_order')
    .order('display_order')

  // Count tools per type
  const { data: typeToolCounts } = await supabase
    .from('skill_tool_types')
    .select('tool_type_id')

  const toolCountMap = new Map<string, number>()
  if (typeToolCounts) {
    for (const row of typeToolCounts) {
      toolCountMap.set(row.tool_type_id, (toolCountMap.get(row.tool_type_id) || 0) + 1)
    }
  }

  const totalCategories = toolTypes?.length || 0
  const totalTools = typeToolCounts?.length || 0

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 text-teal text-xs font-semibold mb-4">
          TOOL RANKINGS
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-3">
          Leaderboards
        </h1>
        <p className="text-gray-500 max-w-2xl mx-auto">
          AI tools ranked by category using real benchmark data. Each leaderboard tracks
          output quality, reliability, efficiency, cost, and trust.
        </p>
        <div className="flex items-center justify-center gap-8 mt-6 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-brand">{totalCategories}</div>
            <div className="text-gray-400">Categories</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-teal">{totalTools}</div>
            <div className="text-gray-400">Ranked Tools</div>
          </div>
        </div>
      </div>

      {/* Category Grid */}
      {toolTypes && toolTypes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {toolTypes.map((type: any) => {
            const toolCount = toolCountMap.get(type.id) || 0

            return (
              <Link
                key={type.id}
                href={`/leaderboards/${type.slug}`}
                className="card group hover:border-teal/30 transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    {type.icon && (
                      <div className="text-2xl flex-shrink-0">{type.icon}</div>
                    )}
                    <h2 className="font-bold text-gray-900 group-hover:text-teal transition-colors">
                      {type.name}
                    </h2>
                  </div>
                  {toolCount > 0 && (
                    <span className="badge bg-teal-50 text-teal text-[10px] flex-shrink-0">
                      {toolCount} tool{toolCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {type.description && (
                  <p className="text-sm text-gray-500 line-clamp-2 mb-4">
                    {type.description}
                  </p>
                )}

                <div className="flex items-center text-xs text-brand font-medium group-hover:translate-x-1 transition-transform">
                  View Leaderboard
                  <svg className="w-3.5 h-3.5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium">No leaderboard categories yet</p>
          <p className="text-sm mt-1">Categories will appear once tool types are seeded.</p>
        </div>
      )}

      {/* CTA */}
      <div className="mt-12 text-center">
        <div className="card max-w-xl mx-auto text-center">
          <h3 className="font-bold text-gray-900 mb-2">Submit Your Tool</h3>
          <p className="text-sm text-gray-500 mb-4">
            List your MCP server or AI tool on ToolRoute and get it benchmarked
            against the competition. Earn routing credits for contributing data.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/submit" className="btn-primary text-sm">
              Submit a Tool
            </Link>
            <Link href="/tasks" className="btn-secondary text-sm">
              Browse Tasks
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
