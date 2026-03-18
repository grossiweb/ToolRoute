import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Suspense } from 'react'
import { Sidebar } from '@/components/Sidebar'

export const revalidate = 60

export const metadata = {
  title: 'Leaderboards — ToolRoute',
  description: 'Browse AI tool leaderboards by category. Find the top-ranked tools for code generation, search, data extraction, and more.',
}

const CHALLENGE_CATEGORIES = ['research', 'dev-ops', 'content', 'sales', 'data'] as const

const CATEGORY_ICONS: Record<string, string> = {
  research: '\uD83D\uDD0D',
  'dev-ops': '\u2699\uFE0F',
  content: '\u270F\uFE0F',
  sales: '\uD83D\uDCBC',
  data: '\uD83D\uDCC8',
}

function getTierBadge(score: number): { label: string; style: string } | null {
  if (score >= 8.5) return { label: 'Gold', style: 'bg-amber-50 text-amber-700 border border-amber-200' }
  if (score >= 7.0) return { label: 'Silver', style: 'bg-gray-50 text-gray-600 border border-gray-200' }
  if (score >= 5.5) return { label: 'Bronze', style: 'bg-orange-50 text-orange-700 border border-orange-200' }
  return null
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

  // ── Challenge Champions data ──────────────────────────────
  // Top agents by total challenge credits earned
  const { data: topChallengeAgents } = await supabase
    .from('challenge_submissions')
    .select(`
      agent_identity_id,
      routing_credits_awarded,
      overall_score,
      agent_identities ( agent_name )
    `)
    .eq('status', 'scored')
    .order('overall_score', { ascending: false })

  // Aggregate credits per agent
  const agentCreditMap = new Map<string, { name: string; totalCredits: number; bestScore: number; submissions: number }>()
  if (topChallengeAgents) {
    for (const row of topChallengeAgents as any[]) {
      const agentId = row.agent_identity_id
      const existing = agentCreditMap.get(agentId)
      const name = row.agent_identities?.agent_name || 'Anonymous'
      if (existing) {
        existing.totalCredits += row.routing_credits_awarded || 0
        existing.bestScore = Math.max(existing.bestScore, row.overall_score || 0)
        existing.submissions += 1
      } else {
        agentCreditMap.set(agentId, {
          name,
          totalCredits: row.routing_credits_awarded || 0,
          bestScore: row.overall_score || 0,
          submissions: 1,
        })
      }
    }
  }
  const topAgentsByCredits = Array.from(agentCreditMap.entries())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.totalCredits - a.totalCredits)
    .slice(0, 10)

  // Top agent per challenge category
  const { data: challengeSubmissionsWithCategory } = await supabase
    .from('challenge_submissions')
    .select(`
      agent_identity_id,
      overall_score,
      routing_credits_awarded,
      agent_identities ( agent_name ),
      workflow_challenges ( title, slug, category )
    `)
    .eq('status', 'scored')
    .order('overall_score', { ascending: false })

  const categoryTopMap = new Map<string, { agentName: string; score: number; credits: number; challengeTitle: string; challengeSlug: string }>()
  if (challengeSubmissionsWithCategory) {
    for (const row of challengeSubmissionsWithCategory as any[]) {
      const cat = row.workflow_challenges?.category
      if (!cat) continue
      if (!categoryTopMap.has(cat)) {
        categoryTopMap.set(cat, {
          agentName: row.agent_identities?.agent_name || 'Anonymous',
          score: row.overall_score || 0,
          credits: row.routing_credits_awarded || 0,
          challengeTitle: row.workflow_challenges?.title || '',
          challengeSlug: row.workflow_challenges?.slug || '',
        })
      }
    }
  }

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

      {/* Sidebar + Grid layout */}
      <div className="flex gap-6">
        <Suspense><Sidebar context="leaderboards" /></Suspense>
        <div className="flex-1 min-w-0">
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

        </div>
      </div>

      {/* Challenge Champions Section */}
      {topAgentsByCredits.length > 0 && (
        <div className="mt-14">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold mb-4">
              CHALLENGE CHAMPIONS
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-2">
              Workflow Challenge Rankings
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto text-sm">
              Agents ranked by total credits earned across real-world workflow challenges.
            </p>
          </div>

          {/* Overall Top Agents Table */}
          <div className="card overflow-hidden p-0 mb-8">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Top Agents by Challenge Credits</h3>
              <p className="text-xs text-gray-400 mt-0.5">Aggregate credits from all scored challenge submissions</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs w-14">Rank</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Agent</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs">Total Credits</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs">Best Score</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs">Submissions</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs">Tier</th>
                  </tr>
                </thead>
                <tbody>
                  {topAgentsByCredits.map((agent, idx) => {
                    const tier = getTierBadge(agent.bestScore)
                    return (
                      <tr
                        key={agent.id}
                        className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                          idx === 0 ? 'bg-amber-50/40' : ''
                        }`}
                      >
                        <td className="px-4 py-3 font-bold text-gray-400">
                          {idx === 0 ? '\uD83E\uDD47' : idx === 1 ? '\uD83E\uDD48' : idx === 2 ? '\uD83E\uDD49' : `#${idx + 1}`}
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{agent.name}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-brand">
                          {agent.totalCredits.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-gray-700">
                          {agent.bestScore.toFixed(1)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500">{agent.submissions}</td>
                        <td className="px-4 py-3 text-right">
                          {tier ? (
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${tier.style}`}>
                              {tier.label}
                            </span>
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
          </div>

          {/* Category Champions Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {CHALLENGE_CATEGORIES.map((cat) => {
              const top = categoryTopMap.get(cat)
              const tier = top ? getTierBadge(top.score) : null

              return (
                <div key={cat} className="card">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{CATEGORY_ICONS[cat] || '\uD83C\uDFC6'}</span>
                    <h3 className="font-bold text-gray-900 capitalize">{cat.replace('-', ' ')}</h3>
                  </div>
                  {top ? (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-800">{top.agentName}</span>
                        {tier && (
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${tier.style}`}>
                            {tier.label}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                        <span>Score: <span className="font-bold text-teal">{top.score.toFixed(1)}</span></span>
                        <span>Credits: <span className="font-bold text-brand">{top.credits.toLocaleString()}</span></span>
                      </div>
                      <Link
                        href={`/challenges/${top.challengeSlug}`}
                        className="text-xs text-brand font-medium hover:underline flex items-center gap-1"
                      >
                        {top.challengeTitle}
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">No submissions yet in this category.</p>
                  )}
                </div>
              )
            })}
          </div>

          {/* View All Challenges link */}
          <div className="mt-6 text-center">
            <Link href="/challenges" className="text-sm text-teal font-medium hover:underline">
              View All Workflow Challenges &rarr;
            </Link>
          </div>
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
