import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatScore, getScoreColor } from '@/lib/scoring'
import Link from 'next/link'

export const revalidate = 300

export const metadata = {
  title: 'Agent Leaderboard — NeoSkill',
  description: 'Top-performing AI agents ranked by workflow, success rate, and value score.',
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: { workflow?: string }
}) {
  const supabase = createServerSupabaseClient()
  const selectedWorkflow = searchParams.workflow || 'all'

  // Fetch workflows for filter tabs
  const { data: workflows } = await supabase
    .from('workflows')
    .select('slug, name')
    .order('name')
    .limit(20)

  // Fetch leaderboard data
  let leaderboardQuery = supabase
    .from('agent_leaderboard')
    .select(`
      workflow_slug, total_runs, success_count, success_rate,
      avg_value_score, avg_latency_ms, avg_cost_usd, missions_completed, rank,
      agent_identities ( id, agent_name, agent_kind, host_client_slug, model_family, trust_tier )
    `)
    .order('rank', { ascending: true, nullsFirst: false })
    .limit(50)

  if (selectedWorkflow !== 'all') {
    leaderboardQuery = leaderboardQuery.eq('workflow_slug', selectedWorkflow)
  }

  const { data: leaderboard } = await leaderboardQuery

  // Fetch global stats
  const { data: globalStats } = await supabase
    .from('agent_global_stats')
    .select(`
      total_runs, total_success, overall_success_rate,
      overall_avg_value_score, total_missions_completed, global_rank,
      agent_identities ( agent_name, agent_kind, model_family, trust_tier )
    `)
    .order('global_rank', { ascending: true, nullsFirst: false })
    .limit(10)

  // Summary stats
  const { count: totalAgents } = await supabase
    .from('agent_identities')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  const { count: totalRuns } = await supabase
    .from('agent_runs')
    .select('*', { count: 'exact', head: true })

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-light text-brand text-xs font-semibold mb-4">
          AGENT RANKINGS
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-3">
          Agent Leaderboard
        </h1>
        <p className="text-gray-500 max-w-2xl mx-auto">
          Top-performing AI agents ranked by workflow. Rankings update as telemetry comes in.
          Run missions to climb the leaderboard and earn routing credits.
        </p>
        <div className="flex items-center justify-center gap-8 mt-6 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-brand">{totalAgents || 0}</div>
            <div className="text-gray-400">Active Agents</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-teal">{totalRuns || 0}</div>
            <div className="text-gray-400">Total Runs</div>
          </div>
        </div>
      </div>

      {/* Workflow Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 -mx-4 px-4">
        <Link
          href="/leaderboard"
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            selectedWorkflow === 'all'
              ? 'bg-brand text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All Workflows
        </Link>
        {workflows?.map((w: any) => (
          <Link
            key={w.slug}
            href={`/leaderboard?workflow=${w.slug}`}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedWorkflow === w.slug
                ? 'bg-brand text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {w.name}
          </Link>
        ))}
      </div>

      {/* Leaderboard Table */}
      {leaderboard && leaderboard.length > 0 ? (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Rank</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Agent</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Model</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs">Runs</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs">Success Rate</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs">Value Score</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs">Missions</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry: any, idx: number) => {
                const agent = entry.agent_identities
                const successPct = ((entry.success_rate || 0) * 100).toFixed(1)

                return (
                  <tr key={`${entry.workflow_slug}-${agent?.id}`} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold text-gray-400">
                      {entry.rank || idx + 1}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">
                          {agent?.agent_name || 'Anonymous Agent'}
                        </span>
                        <TrustBadge tier={agent?.trust_tier} />
                      </div>
                      <div className="text-xs text-gray-400">
                        {agent?.agent_kind} {agent?.host_client_slug ? `on ${agent.host_client_slug}` : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {agent?.model_family || '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">
                      {entry.total_runs}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold ${
                        parseFloat(successPct) >= 90 ? 'text-teal' :
                        parseFloat(successPct) >= 70 ? 'text-brand' :
                        'text-amber-600'
                      }`}>
                        {successPct}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {entry.avg_value_score != null ? (
                        <span className={`font-bold ${getScoreColor(entry.avg_value_score)?.split(' ')[0] || ''}`}>
                          {formatScore(entry.avg_value_score)}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">
                      {entry.missions_completed}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="text-4xl mb-4">
            {'\uD83C\uDFC6'}
          </div>
          <p className="text-lg font-medium text-gray-600">No agents ranked yet</p>
          <p className="text-sm text-gray-400 mt-1 max-w-md mx-auto">
            The leaderboard populates as agents submit telemetry through the API.
            Be the first to claim a spot!
          </p>
          <Link href="/api-docs" className="btn-primary text-sm mt-4 inline-block">
            Get Started with the API
          </Link>
        </div>
      )}

      {/* Global Top Agents */}
      {globalStats && globalStats.length > 0 && selectedWorkflow === 'all' && (
        <div className="mt-10">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Global Top Agents</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {globalStats.map((stat: any, idx: number) => {
              const agent = stat.agent_identities
              return (
                <div key={agent?.agent_name || idx} className="card">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-xl">
                      {idx === 0 ? '\uD83E\uDD47' : idx === 1 ? '\uD83E\uDD48' : idx === 2 ? '\uD83E\uDD49' : `#${idx + 1}`}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 text-sm">{agent?.agent_name}</div>
                      <div className="text-xs text-gray-400">{agent?.model_family} · {agent?.agent_kind}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <div className="font-bold text-gray-700">{stat.total_runs}</div>
                      <div className="text-gray-400">Runs</div>
                    </div>
                    <div>
                      <div className="font-bold text-teal">{((stat.overall_success_rate || 0) * 100).toFixed(0)}%</div>
                      <div className="text-gray-400">Success</div>
                    </div>
                    <div>
                      <div className="font-bold text-brand">{stat.total_missions_completed}</div>
                      <div className="text-gray-400">Missions</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function TrustBadge({ tier }: { tier?: string }) {
  if (!tier || tier === 'baseline' || tier === 'unverified') return null
  const styles: Record<string, string> = {
    trusted: 'bg-blue-50 text-blue-700',
    production: 'bg-teal-light text-teal',
    enterprise: 'bg-amber-50 text-amber-700',
  }
  return (
    <span className={`badge text-[10px] ${styles[tier] || ''}`}>
      {tier}
    </span>
  )
}
