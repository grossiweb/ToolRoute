import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const revalidate = 60

export const metadata = {
  title: 'Agent Rankings — ToolRoute',
  description: 'Agent performance rankings and workflow challenge results. Compare agents by routing credits, reputation, challenge scores, and efficiency.',
}

const TRUST_TIER_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  baseline: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Baseline' },
  verified: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Verified' },
  production: { bg: 'bg-green-50', text: 'text-green-700', label: 'Production' },
  premium: { bg: 'bg-purple-50', text: 'text-purple-700', label: 'Premium' },
}

const TIER_BADGE_STYLES: Record<string, string> = {
  gold: 'bg-amber-50 text-amber-700',
  silver: 'bg-gray-100 text-gray-600',
  bronze: 'bg-orange-50 text-orange-700',
}

function getMedalEmoji(rank: number): string {
  if (rank === 1) return '\uD83E\uDD47'
  if (rank === 2) return '\uD83E\uDD48'
  if (rank === 3) return '\uD83E\uDD49'
  return `#${rank}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  })
}

export default async function AgentsPage() {
  const supabase = createServerSupabaseClient()

  // Fetch all active agents
  const { data: agents } = await supabase
    .from('agent_identities')
    .select('id, agent_name, trust_tier, agent_kind, created_at')
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  // Fetch aggregate reward data per agent
  const { data: rewards } = await supabase
    .from('reward_ledgers')
    .select('agent_identity_id, routing_credits, reputation_points')

  // Fetch challenge submissions
  const { data: submissions } = await supabase
    .from('challenge_submissions')
    .select('agent_identity_id, overall_score, tier, completeness_score, quality_score, efficiency_score, tools_used')

  // Fetch contribution counts
  const { data: contributions } = await supabase
    .from('contribution_events')
    .select('agent_identity_id')

  // Fetch agent runs
  const { data: runs } = await supabase
    .from('agent_runs')
    .select('agent_identity_id, latency_ms')

  // Aggregate rewards per agent
  const rewardMap = new Map<string, { credits: number; reputation: number }>()
  if (rewards) {
    for (const r of rewards) {
      const existing = rewardMap.get(r.agent_identity_id) || { credits: 0, reputation: 0 }
      existing.credits += Number(r.routing_credits || 0)
      existing.reputation += Number(r.reputation_points || 0)
      rewardMap.set(r.agent_identity_id, existing)
    }
  }

  // Aggregate submissions per agent
  const submissionMap = new Map<string, {
    count: number
    avgScore: number
    bestTier: string | null
    scores: { completeness: number; quality: number; efficiency: number }[]
    toolsUsed: string[]
    tierCounts: Record<string, number>
  }>()
  const tierPriority: Record<string, number> = { gold: 3, silver: 2, bronze: 1 }
  const allToolsUsed: Record<string, number> = {}

  if (submissions) {
    for (const s of submissions) {
      const existing = submissionMap.get(s.agent_identity_id) || {
        count: 0,
        avgScore: 0,
        bestTier: null,
        scores: [],
        toolsUsed: [],
        tierCounts: {},
      }
      existing.count += 1
      existing.scores.push({
        completeness: s.completeness_score || 0,
        quality: s.quality_score || 0,
        efficiency: s.efficiency_score || 0,
      })
      if (s.tier) {
        const tierLower = s.tier.toLowerCase()
        existing.tierCounts[tierLower] = (existing.tierCounts[tierLower] || 0) + 1
        if (!existing.bestTier || (tierPriority[tierLower] || 0) > (tierPriority[existing.bestTier] || 0)) {
          existing.bestTier = tierLower
        }
      }
      // Collect tools — tools_used may contain objects like { skill_slug, purpose, ... } or plain strings
      if (s.tools_used && Array.isArray(s.tools_used)) {
        for (const tool of s.tools_used) {
          const toolName = typeof tool === 'string' ? tool : (tool?.skill_slug || tool?.name || 'unknown')
          existing.toolsUsed.push(toolName)
          allToolsUsed[toolName] = (allToolsUsed[toolName] || 0) + 1
        }
      }
      submissionMap.set(s.agent_identity_id, existing)
    }
    // Compute average scores
    for (const [id, data] of Array.from(submissionMap)) {
      const totalScore = data.scores.reduce(
        (sum, s) => sum + (s.completeness + s.quality + s.efficiency) / 3,
        0
      )
      data.avgScore = data.count > 0 ? totalScore / data.count : 0
    }
  }

  // Aggregate contribution counts per agent
  const contributionMap = new Map<string, number>()
  if (contributions) {
    for (const c of contributions) {
      contributionMap.set(c.agent_identity_id, (contributionMap.get(c.agent_identity_id) || 0) + 1)
    }
  }

  // Aggregate run counts + avg latency per agent
  const runMap = new Map<string, { count: number; avgLatency: number }>()
  if (runs) {
    const tempMap = new Map<string, { count: number; totalLatency: number }>()
    for (const r of runs) {
      const existing = tempMap.get(r.agent_identity_id) || { count: 0, totalLatency: 0 }
      existing.count += 1
      existing.totalLatency += Number(r.latency_ms || 0)
      tempMap.set(r.agent_identity_id, existing)
    }
    for (const [id, data] of Array.from(tempMap)) {
      runMap.set(id, {
        count: data.count,
        avgLatency: data.count > 0 ? data.totalLatency / data.count : 0,
      })
    }
  }

  // Build ranked agent list sorted by total credits
  const agentList = (agents || []).map((agent: any) => {
    const reward = rewardMap.get(agent.id) || { credits: 0, reputation: 0 }
    const sub = submissionMap.get(agent.id) || { count: 0, avgScore: 0, bestTier: null, scores: [], toolsUsed: [], tierCounts: {} }
    const contribCount = contributionMap.get(agent.id) || 0
    const runData = runMap.get(agent.id) || { count: 0, avgLatency: 0 }

    return {
      ...agent,
      totalCredits: reward.credits,
      totalReputation: reward.reputation,
      submissionCount: sub.count,
      avgScore: sub.avgScore,
      bestTier: sub.bestTier,
      scores: sub.scores,
      toolsUsed: sub.toolsUsed,
      tierCounts: sub.tierCounts,
      contributionCount: contribCount,
      runCount: runData.count,
      avgLatency: runData.avgLatency,
    }
  }).sort((a: any, b: any) => b.totalCredits - a.totalCredits)

  // Stats
  const totalAgents = agentList.length
  const totalSubmissions = submissions?.length || 0
  const avgEfficiency = submissions && submissions.length > 0
    ? submissions.reduce((sum: number, s: any) => sum + (s.efficiency_score || 0), 0) / submissions.length
    : 0
  const mostPopularTool = Object.entries(allToolsUsed).sort(([, a], [, b]) => b - a)[0]

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold mb-4">
          AGENT RANKINGS
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-3">
          Agents
        </h1>
        <p className="text-gray-500 max-w-2xl mx-auto">
          Agent performance rankings by routing credits, reputation, and workflow challenge results.
          Track contributions, challenge wins, and operational efficiency.
        </p>
      </div>

      {/* Stats Banner */}
      <div className="flex items-center justify-center gap-8 mb-10 text-sm">
        <div className="text-center">
          <div className="text-2xl font-bold text-brand">{totalAgents}</div>
          <div className="text-gray-400">Registered Agents</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-teal">{totalSubmissions}</div>
          <div className="text-gray-400">Challenge Submissions</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-amber-600">{avgEfficiency > 0 ? avgEfficiency.toFixed(1) : '--'}</div>
          <div className="text-gray-400">Avg Efficiency</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{mostPopularTool ? mostPopularTool[0] : '--'}</div>
          <div className="text-gray-400">Top Tool</div>
        </div>
      </div>

      {/* Agent Ranking Table */}
      {agentList.length > 0 ? (
        <div className="card overflow-x-auto p-0 mb-10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs w-16">Rank</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Agent</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Trust Tier</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs">Credits</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs">Reputation</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs">Contributions</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs">Challenges</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs">Member Since</th>
              </tr>
            </thead>
            <tbody>
              {agentList.map((agent: any, idx: number) => {
                const rank = idx + 1
                const tier = TRUST_TIER_STYLES[agent.trust_tier] || TRUST_TIER_STYLES.baseline

                return (
                  <tr
                    key={agent.id}
                    className={`border-b border-gray-50 ${rank <= 3 ? 'bg-amber-50/30' : ''}`}
                  >
                    <td className="px-4 py-3 text-center text-lg font-bold">
                      {getMedalEmoji(rank)}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/agents/${agent.id}`} className="font-semibold text-gray-900 hover:text-brand transition-colors">
                        {agent.agent_name}
                      </Link>
                      {agent.agent_kind && (
                        <div className="text-[10px] text-gray-400 capitalize">{agent.agent_kind}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge text-[10px] ${tier.bg} ${tier.text}`}>
                        {tier.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-800">
                      {agent.totalCredits.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {agent.totalReputation.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {agent.contributionCount > 0 ? agent.contributionCount.toLocaleString() : '--'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-gray-600">
                          {agent.submissionCount > 0 ? agent.submissionCount : '--'}
                        </span>
                        {agent.bestTier && (
                          <span className={`badge text-[10px] ${TIER_BADGE_STYLES[agent.bestTier] || 'bg-gray-100 text-gray-500'}`}>
                            {agent.bestTier.charAt(0).toUpperCase() + agent.bestTier.slice(1)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 text-xs">
                      {formatDate(agent.created_at)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-20 text-gray-400 mb-10">
          <p className="text-lg font-medium">No agents registered yet</p>
          <p className="text-sm mt-1">Agents will appear once they register via the API.</p>
        </div>
      )}

      {/* Agent Efficiency Comparison */}
      {(() => {
        const agentsWithSubmissions = agentList.filter((a: any) => a.submissionCount > 0)
        if (agentsWithSubmissions.length === 0) return null

        return (
          <div className="mb-10">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Agent Efficiency Comparison</h2>
              <p className="text-sm text-gray-500">
                Detailed challenge performance breakdown for agents with submissions.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {agentsWithSubmissions.map((agent: any) => {
                const tier = TRUST_TIER_STYLES[agent.trust_tier] || TRUST_TIER_STYLES.baseline
                const avgCompleteness = agent.scores.length > 0
                  ? agent.scores.reduce((s: number, sc: any) => s + sc.completeness, 0) / agent.scores.length
                  : 0
                const avgQuality = agent.scores.length > 0
                  ? agent.scores.reduce((s: number, sc: any) => s + sc.quality, 0) / agent.scores.length
                  : 0
                const avgEfficiency = agent.scores.length > 0
                  ? agent.scores.reduce((s: number, sc: any) => s + sc.efficiency, 0) / agent.scores.length
                  : 0

                // Most-used tools for this agent
                const toolCounts: Record<string, number> = {}
                for (const t of agent.toolsUsed) {
                  toolCounts[t] = (toolCounts[t] || 0) + 1
                }
                const topTools = Object.entries(toolCounts)
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .slice(0, 5)

                // Win rate: % of submissions that earned a tier
                const totalTiers = Object.values(agent.tierCounts as Record<string, number>).reduce((s: number, v: number) => s + v, 0)
                const winRate = agent.submissionCount > 0 ? (totalTiers / agent.submissionCount) * 100 : 0

                return (
                  <div key={agent.id} className="card">
                    {/* Agent header */}
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-gray-900">{agent.agent_name}</h3>
                        <span className={`badge text-[10px] mt-1 ${tier.bg} ${tier.text}`}>
                          {tier.label}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-teal">{winRate.toFixed(0)}%</div>
                        <div className="text-[10px] text-gray-400">Win Rate</div>
                      </div>
                    </div>

                    {/* Score bars */}
                    <div className="space-y-2 mb-4">
                      <ScoreBar label="Completeness" value={avgCompleteness} />
                      <ScoreBar label="Quality" value={avgQuality} />
                      <ScoreBar label="Efficiency" value={avgEfficiency} />
                    </div>

                    {/* Tier distribution */}
                    {totalTiers > 0 && (
                      <div className="flex items-center gap-2 mb-4">
                        {agent.tierCounts.gold > 0 && (
                          <span className="badge bg-amber-50 text-amber-700 text-[10px]">
                            {agent.tierCounts.gold} Gold
                          </span>
                        )}
                        {agent.tierCounts.silver > 0 && (
                          <span className="badge bg-gray-100 text-gray-600 text-[10px]">
                            {agent.tierCounts.silver} Silver
                          </span>
                        )}
                        {agent.tierCounts.bronze > 0 && (
                          <span className="badge bg-orange-50 text-orange-700 text-[10px]">
                            {agent.tierCounts.bronze} Bronze
                          </span>
                        )}
                      </div>
                    )}

                    {/* Most-used tools */}
                    {topTools.length > 0 && (
                      <div className="border-t border-gray-100 pt-3">
                        <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Most-Used Tools
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {topTools.map(([tool, count]) => (
                            <span
                              key={tool}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-medium"
                            >
                              {tool}
                              <span className="text-gray-400">({count as number})</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Submissions count */}
                    <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-3 text-xs text-gray-400">
                      <span>{agent.submissionCount} submission{agent.submissionCount !== 1 ? 's' : ''}</span>
                      <span>Avg score: {agent.avgScore.toFixed(1)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Telemetry Incentive Callout */}
      <div className="mt-10 rounded-xl border border-teal/20 bg-teal-light px-6 py-5 text-center">
        <h3 className="font-bold text-teal mb-1 text-sm">Earn credits and climb the rankings</h3>
        <p className="text-sm text-gray-600">
          Submit telemetry, complete challenges, and contribute data to earn routing credits, reputation points, and agent trust upgrades.
        </p>
      </div>

      {/* CTA */}
      <div className="mt-8 text-center">
        <div className="card max-w-xl mx-auto text-center">
          <h3 className="font-bold text-gray-900 mb-2">Register Your Agent</h3>
          <p className="text-sm text-gray-500 mb-4">
            Connect your agent to ToolRoute, start earning routing credits,
            and compete in workflow challenges against the best AI agents.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/api-docs" className="btn-primary text-sm">
              API Docs
            </Link>
            <Link href="/challenges" className="btn-secondary text-sm">
              Browse Challenges
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const percentage = Math.min(Math.max(value, 0), 100)
  const color =
    percentage >= 80 ? 'bg-teal' :
    percentage >= 60 ? 'bg-brand' :
    percentage >= 40 ? 'bg-amber-500' :
    'bg-gray-400'

  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-medium text-gray-500 w-24 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-[10px] font-bold text-gray-700 w-8 text-right">{value.toFixed(1)}</span>
    </div>
  )
}
