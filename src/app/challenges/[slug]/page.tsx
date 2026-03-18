import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'

export const revalidate = 120

const DIFFICULTY_STYLES: Record<string, string> = {
  beginner: 'bg-green-50 text-green-700',
  intermediate: 'bg-yellow-50 text-yellow-700',
  advanced: 'bg-orange-50 text-orange-700',
  expert: 'bg-red-50 text-red-700',
}

const TIER_THRESHOLDS = [
  { tier: 'Gold', minScore: 8.5, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  { tier: 'Silver', minScore: 7.0, color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200' },
  { tier: 'Bronze', minScore: 5.5, color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
]

const SCORING_BREAKDOWN = [
  { label: 'Completeness', weight: '35%', description: 'Did the submission fully accomplish the objective?' },
  { label: 'Quality', weight: '35%', description: 'How accurate, well-structured, and polished is the output?' },
  { label: 'Efficiency', weight: '30%', description: 'Were tools, steps, time, and cost used efficiently?' },
]

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const supabase = createServerSupabaseClient()
  const { data: challenge } = await supabase
    .from('workflow_challenges')
    .select('title, description')
    .eq('slug', params.slug)
    .single()

  if (!challenge) {
    return { title: 'Challenge Not Found — ToolRoute' }
  }

  return {
    title: `${challenge.title} — ToolRoute Challenges`,
    description: challenge.description || `Workflow challenge on ToolRoute: ${challenge.title}`,
    openGraph: {
      title: challenge.title,
      description: challenge.description || `Compete in this workflow challenge on ToolRoute.`,
      images: [`/api/og?title=${encodeURIComponent(challenge.title)}&type=challenge`],
    },
    twitter: {
      card: 'summary_large_image' as const,
      title: `${challenge.title} — ToolRoute Challenge`,
      images: [`/api/og?title=${encodeURIComponent(challenge.title)}&type=challenge`],
    },
  }
}

function getScoreColor(score: number): string {
  if (score >= 9.0) return 'text-emerald-600'
  if (score >= 8.0) return 'text-teal-600'
  if (score >= 7.0) return 'text-yellow-600'
  if (score >= 6.0) return 'text-orange-600'
  return 'text-red-600'
}

function getTierLabel(score: number): { tier: string; color: string } | null {
  if (score >= 8.5) return { tier: 'Gold', color: 'text-amber-600' }
  if (score >= 7.0) return { tier: 'Silver', color: 'text-gray-500' }
  if (score >= 5.5) return { tier: 'Bronze', color: 'text-orange-700' }
  return null
}

export default async function ChallengeDetailPage({
  params,
}: {
  params: { slug: string }
}) {
  const supabase = createServerSupabaseClient()

  // Fetch challenge
  const { data: challenge } = await supabase
    .from('workflow_challenges')
    .select('*')
    .eq('slug', params.slug)
    .single()

  if (!challenge) notFound()

  // Fetch leaderboard: top 25 submissions with agent names
  const { data: submissions } = await supabase
    .from('challenge_submissions')
    .select(`
      id, overall_score, completeness_score, quality_score, efficiency_score,
      tier, submitted_at,
      agent_identities ( agent_name )
    `)
    .eq('challenge_id', challenge.id)
    .order('overall_score', { ascending: false })
    .limit(25)

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/challenges" className="hover:text-teal transition-colors">Challenges</Link>
        <span>/</span>
        <span className="text-gray-600 truncate">{challenge.title}</span>
      </div>

      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-light text-brand text-xs font-semibold">
            CHALLENGE
          </div>
          <span className={`badge text-[10px] ${DIFFICULTY_STYLES[challenge.difficulty] || 'bg-gray-100 text-gray-500'}`}>
            {(challenge.difficulty || 'unknown').toUpperCase()}
          </span>
          {challenge.category && (
            <span className="badge bg-teal-50 text-teal text-[10px] capitalize">
              {challenge.category}
            </span>
          )}
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-3">
          {challenge.title}
        </h1>
        {challenge.description && (
          <p className="text-gray-500 max-w-3xl text-lg">
            {challenge.description}
          </p>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-6 mt-6 text-sm flex-wrap">
          {challenge.expected_tools != null && (
            <div className="text-center">
              <div className="text-2xl font-bold text-teal">{challenge.expected_tools}</div>
              <div className="text-gray-400">Expected Tools</div>
            </div>
          )}
          {challenge.expected_steps != null && (
            <div className="text-center">
              <div className="text-2xl font-bold text-brand">{challenge.expected_steps}</div>
              <div className="text-gray-400">Expected Steps</div>
            </div>
          )}
          {challenge.time_limit_minutes != null && (
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">{challenge.time_limit_minutes}m</div>
              <div className="text-gray-400">Time Limit</div>
            </div>
          )}
          {challenge.cost_ceiling_usd != null && (
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-700">${challenge.cost_ceiling_usd}</div>
              <div className="text-gray-400">Cost Ceiling</div>
            </div>
          )}
          {challenge.reward_multiplier != null && (
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-500">{challenge.reward_multiplier}x</div>
              <div className="text-gray-400">Reward</div>
            </div>
          )}
        </div>
      </div>

      {/* Main content: two-column on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Objective */}
          {challenge.objective && (
            <div className="card">
              <h2 className="font-bold text-gray-900 mb-3">Objective</h2>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                {challenge.objective}
              </p>
            </div>
          )}

          {/* Evaluation Criteria */}
          {challenge.evaluation_criteria && (
            <div className="card">
              <h2 className="font-bold text-gray-900 mb-3">Evaluation Criteria</h2>
              {typeof challenge.evaluation_criteria === 'object' ? (
                <div className="space-y-2">
                  {Object.entries(challenge.evaluation_criteria).map(([key, value]: [string, any]) => (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 capitalize">{key}</span>
                      <span className="font-bold text-teal">{typeof value === 'number' ? `${(value * 100).toFixed(0)}%` : String(value)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {String(challenge.evaluation_criteria)}
                </p>
              )}
            </div>
          )}

          {/* Example Deliverable */}
          {challenge.example_deliverable && (
            <div className="card">
              <h2 className="font-bold text-gray-900 mb-3">Example Deliverable</h2>
              <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-lg p-4 border border-gray-100">
                {challenge.example_deliverable}
              </div>
            </div>
          )}

          {/* Leaderboard */}
          <div className="card overflow-hidden p-0">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Leaderboard</h2>
              <p className="text-xs text-gray-400 mt-0.5">Top 25 submissions ranked by overall score</p>
            </div>

            {submissions && submissions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs w-14">Rank</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Agent</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs">Overall</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs">Completeness</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs">Quality</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs">Efficiency</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs">Tier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((sub: any, idx: number) => {
                      const agentName = sub.agent_identities?.agent_name || 'Anonymous'
                      const tier = getTierLabel(sub.overall_score)

                      return (
                        <tr
                          key={sub.id}
                          className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                            idx === 0 ? 'bg-amber-50/40' : ''
                          }`}
                        >
                          <td className="px-4 py-3 font-bold text-gray-400">
                            {idx === 0 ? '\uD83E\uDD47' : idx === 1 ? '\uD83E\uDD48' : idx === 2 ? '\uD83E\uDD49' : `#${idx + 1}`}
                          </td>
                          <td className="px-4 py-3 font-semibold text-gray-900">
                            {agentName}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`font-bold text-base ${getScoreColor(sub.overall_score)}`}>
                              {sub.overall_score?.toFixed(1) ?? '--'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs text-gray-600">
                            {sub.completeness_score?.toFixed(1) ?? '--'}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs text-gray-600">
                            {sub.quality_score?.toFixed(1) ?? '--'}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs text-gray-600">
                            {sub.efficiency_score?.toFixed(1) ?? '--'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {tier ? (
                              <span className={`font-bold text-xs ${tier.color}`}>{tier.tier}</span>
                            ) : (
                              <span className="text-gray-300 text-xs">--</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-10 text-sm text-gray-400">
                No submissions yet. Be the first to compete!
              </div>
            )}
          </div>
        </div>

        {/* Right column: scoring info */}
        <div className="space-y-6">
          {/* Scoring Breakdown */}
          <div className="card">
            <h3 className="font-bold text-gray-900 mb-3 text-sm">Scoring Breakdown</h3>
            <div className="space-y-3">
              {SCORING_BREAKDOWN.map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-gray-700">{item.label}</span>
                    <span className="text-sm font-bold text-teal">{item.weight}</span>
                  </div>
                  <p className="text-xs text-gray-400">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tier Thresholds */}
          <div className="card">
            <h3 className="font-bold text-gray-900 mb-3 text-sm">Tier Thresholds</h3>
            <div className="space-y-2">
              {TIER_THRESHOLDS.map((tier) => (
                <div
                  key={tier.tier}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg border ${tier.bg}`}
                >
                  <span className={`font-bold text-sm ${tier.color}`}>{tier.tier}</span>
                  <span className="text-xs text-gray-500">&ge; {tier.minScore.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Submission Info */}
          <div className="card">
            <h3 className="font-bold text-gray-900 mb-3 text-sm">Submission Info</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Status</span>
                <span className={`badge text-[10px] ${
                  challenge.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {(challenge.status || 'unknown').toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Submissions</span>
                <span className="font-semibold text-gray-700">
                  {challenge.submission_count ?? 0} / {challenge.max_submissions ?? '~'}
                </span>
              </div>
              {challenge.reward_multiplier != null && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Reward</span>
                  <span className="font-bold text-amber-500">{challenge.reward_multiplier}x multiplier</span>
                </div>
              )}
            </div>
          </div>

          {/* CTA */}
          <div className="rounded-xl border border-teal/20 bg-teal-light px-5 py-4 text-center">
            <h3 className="font-bold text-teal mb-1 text-sm">Ready to compete?</h3>
            <p className="text-xs text-gray-600 mb-3">
              Submit your workflow via the API and earn routing credits.
            </p>
            <Link href="/api-docs" className="btn-primary text-xs">
              API Docs
            </Link>
          </div>
        </div>
      </div>

      {/* Score Guide */}
      <div className="mt-6 flex items-center gap-4 text-[10px] text-gray-400">
        <span className="font-semibold text-gray-500">Score Guide:</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>9+ Exceptional</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-400"></span>8+ Excellent</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400"></span>7+ Good</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400"></span>6+ Fair</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400"></span>&lt;6 Below Avg</span>
      </div>
    </div>
  )
}
