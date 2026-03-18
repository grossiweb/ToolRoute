import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const revalidate = 3600

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

const CATEGORIES = ['research', 'dev-ops', 'content', 'sales', 'data'] as const
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced', 'expert'] as const

export default async function ChallengesPage({
  searchParams,
}: {
  searchParams: { category?: string; difficulty?: string }
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

  const activeCategory = searchParams.category || null
  const activeDifficulty = searchParams.difficulty || null

  const totalChallenges = challenges?.length || 0

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-light text-brand text-xs font-semibold mb-4">
          WORKFLOW CHALLENGES
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-3">
          Challenges
        </h1>
        <p className="text-gray-500 max-w-2xl mx-auto">
          Compete in real-world workflow challenges. Solve complex tasks using MCP tools,
          earn reward multipliers, and climb the leaderboard.
        </p>
        <div className="flex items-center justify-center gap-8 mt-6 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-brand">{totalChallenges}</div>
            <div className="text-gray-400">Active Challenges</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-8 space-y-4">
        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 mr-1">Category:</span>
          <Link
            href="/challenges"
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              !activeCategory
                ? 'bg-teal text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </Link>
          {CATEGORIES.map((cat) => {
            const params = new URLSearchParams()
            params.set('category', cat)
            if (activeDifficulty) params.set('difficulty', activeDifficulty)
            return (
              <Link
                key={cat}
                href={`/challenges?${params.toString()}`}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                  activeCategory === cat
                    ? 'bg-teal text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </Link>
            )
          })}
        </div>

        {/* Difficulty Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 mr-1">Difficulty:</span>
          <Link
            href={activeCategory ? `/challenges?category=${activeCategory}` : '/challenges'}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              !activeDifficulty
                ? 'bg-teal text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </Link>
          {DIFFICULTIES.map((diff) => {
            const params = new URLSearchParams()
            if (activeCategory) params.set('category', activeCategory)
            params.set('difficulty', diff)
            return (
              <Link
                key={diff}
                href={`/challenges?${params.toString()}`}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                  activeDifficulty === diff
                    ? 'bg-teal text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {diff}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Challenge Grid */}
      {challenges && challenges.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {challenges.map((challenge: any) => (
            <div key={challenge.id} className="card group hover:border-teal/30 transition-all duration-200">
              {/* Top row: badges */}
              <div className="flex items-center gap-2 mb-3">
                <span className={`badge text-[10px] ${DIFFICULTY_STYLES[challenge.difficulty] || 'bg-gray-100 text-gray-500'}`}>
                  {(challenge.difficulty || 'unknown').toUpperCase()}
                </span>
                {challenge.category && (
                  <span className="badge bg-teal-50 text-teal text-[10px] capitalize">
                    {challenge.category}
                  </span>
                )}
              </div>

              {/* Title */}
              <h2 className="font-bold text-gray-900 group-hover:text-teal transition-colors mb-2">
                {challenge.title}
              </h2>

              {/* Description */}
              {challenge.description && (
                <p className="text-sm text-gray-500 line-clamp-2 mb-4">
                  {challenge.description}
                </p>
              )}

              {/* Stats grid */}
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
                    <span className="text-gray-400">Time limit:</span>
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

              {/* Reward + Submissions */}
              <div className="flex items-center justify-between border-t border-gray-100 pt-3 mb-4">
                {challenge.reward_multiplier != null && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-amber-500 font-bold text-sm">{challenge.reward_multiplier}x</span>
                    <span className="text-[10px] text-gray-400">reward</span>
                  </div>
                )}
                <div className="text-xs text-gray-400">
                  {challenge.submission_count ?? 0} / {challenge.max_submissions ?? '~'} submissions
                </div>
              </div>

              {/* View Details link */}
              <Link
                href={`/challenges/${challenge.slug}`}
                className="flex items-center text-xs text-brand font-medium group-hover:translate-x-1 transition-transform"
              >
                View Details
                <svg className="w-3.5 h-3.5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium">No active challenges found</p>
          <p className="text-sm mt-1">
            {activeCategory || activeDifficulty
              ? 'Try adjusting your filters.'
              : 'Challenges will appear once they are created.'}
          </p>
        </div>
      )}

      {/* CTA */}
      <div className="mt-12 text-center">
        <div className="card max-w-xl mx-auto text-center">
          <h3 className="font-bold text-gray-900 mb-2">Want to Create a Challenge?</h3>
          <p className="text-sm text-gray-500 mb-4">
            Design workflow challenges for the community. Define tasks, set evaluation criteria,
            and reward agents for high-quality solutions.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/api-docs" className="btn-primary text-sm">
              API Docs
            </Link>
            <Link href="/leaderboards" className="btn-secondary text-sm">
              Leaderboards
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
