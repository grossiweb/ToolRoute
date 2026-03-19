import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Suspense } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { SearchBar } from '@/components/SearchBar'

export const revalidate = 60

export const metadata = {
  title: 'Workflow Challenges — ToolRoute',
  description: 'Compete in real-world workflow challenges. Solve tasks, earn rewards, and climb the leaderboard.',
}

const DIFFICULTY_STYLES: Record<string, string> = {
  beginner: 'bg-green-50 text-green-700',
  intermediate: 'bg-yellow-50 text-yellow-700',
  advanced: 'bg-orange-50 text-orange-700',
  expert: 'bg-red-50 text-red-700',
}

export default async function ChallengesPage({
  searchParams,
}: {
  searchParams: { category?: string; difficulty?: string; q?: string }
}) {
  const supabase = createServerSupabaseClient()

  let query = supabase
    .from('workflow_challenges')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (searchParams.category) {
    query = query.eq('category', searchParams.category)
  }
  if (searchParams.difficulty) {
    query = query.eq('difficulty', searchParams.difficulty)
  }

  const { data: challenges } = await query

  let filteredChallenges = challenges || []

  // Search filter
  const searchQuery = searchParams.q?.trim().toLowerCase()
  if (searchQuery) {
    filteredChallenges = filteredChallenges.filter((c: any) =>
      c.title?.toLowerCase().includes(searchQuery) ||
      c.description?.toLowerCase().includes(searchQuery)
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 mb-2">Challenges</h1>
        <p className="text-gray-500 max-w-2xl mb-4">
          Compete in real-world workflow challenges. Solve tasks using MCP tools, earn reward multipliers, and climb the leaderboard.
        </p>
        <div className="max-w-md">
          <Suspense>
            <SearchBar basePath="/challenges" placeholder="Search challenges..." />
          </Suspense>
        </div>
        {searchQuery && (
          <p className="text-sm text-gray-500 mt-3">
            Showing <span className="font-semibold text-gray-700">{filteredChallenges.length}</span> results for &quot;<span className="font-semibold text-brand">{searchParams.q}</span>&quot;
          </p>
        )}
      </div>

      {/* Stats bar */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900">{filteredChallenges.length}</span>
            <span className="text-gray-500">active challenges</span>
          </div>
        </div>
      </div>

      {/* Sidebar + Grid — matches servers page layout */}
      <div className="flex gap-6">
        <Suspense><Sidebar context="challenges" /></Suspense>
        <div className="flex-1 min-w-0">
          {filteredChallenges.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredChallenges.map((challenge: any) => (
                <Link
                  key={challenge.id}
                  href={`/challenges/${challenge.slug}`}
                  className="border border-gray-200 rounded-xl p-5 bg-white hover:border-amber-300 transition-all group"
                >
                  {/* Top row: badges */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${DIFFICULTY_STYLES[challenge.difficulty] || 'bg-gray-100 text-gray-500'}`}>
                      {(challenge.difficulty || 'unknown').toUpperCase()}
                    </span>
                    {challenge.category && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-light text-brand capitalize">
                        {challenge.category}
                      </span>
                    )}
                    {challenge.reward_multiplier && challenge.reward_multiplier > 1 && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 ml-auto">
                        {challenge.reward_multiplier}x REWARDS
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h2 className="font-bold text-gray-900 group-hover:text-brand transition-colors mb-2">
                    {challenge.title}
                  </h2>

                  {/* Description */}
                  {challenge.description && (
                    <p className="text-sm text-gray-500 line-clamp-2 mb-4">
                      {challenge.description}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs mb-4">
                    {challenge.expected_tools != null && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-400">Tools:</span>
                        <span className="font-semibold text-gray-700">{challenge.expected_tools}</span>
                      </div>
                    )}
                    {challenge.expected_steps != null && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-400">Steps:</span>
                        <span className="font-semibold text-gray-700">{challenge.expected_steps}</span>
                      </div>
                    )}
                    {challenge.time_limit_minutes != null && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-400">Time:</span>
                        <span className="font-semibold text-gray-700">{challenge.time_limit_minutes}m</span>
                      </div>
                    )}
                    {challenge.cost_ceiling_usd != null && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-400">Cost cap:</span>
                        <span className="font-semibold text-gray-700">${challenge.cost_ceiling_usd}</span>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                    <div className="text-xs text-gray-400">
                      {challenge.submission_count ?? 0} / {challenge.max_submissions ?? '∞'} submissions
                    </div>
                    <span className="text-xs font-semibold text-brand group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                      View details
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-gray-400">
              <p className="text-lg font-bold mb-2">No active challenges found</p>
              <p className="text-sm">
                {searchParams.category || searchParams.difficulty || searchQuery
                  ? 'Try adjusting your filters.'
                  : 'Challenges will appear once they are created.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
