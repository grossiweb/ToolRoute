import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const revalidate = 600

const TRUST_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  unverified: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Unverified' },
  baseline: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Baseline' },
  trusted: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Trusted' },
  production: { bg: 'bg-green-50', text: 'text-green-700', label: 'Production' },
  enterprise: { bg: 'bg-purple-50', text: 'text-purple-700', label: 'Enterprise' },
}

const TIER_STYLES: Record<string, string> = {
  gold: 'bg-amber-50 text-amber-700 border-amber-200',
  silver: 'bg-gray-100 text-gray-600 border-gray-200',
  bronze: 'bg-orange-50 text-orange-700 border-orange-200',
}

const TIER_EMOJI: Record<string, string> = {
  gold: '\uD83E\uDD47',
  silver: '\uD83E\uDD48',
  bronze: '\uD83E\uDD49',
}

export async function generateMetadata({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()
  const { data: agent } = await supabase
    .from('agent_identities')
    .select('agent_name')
    .eq('id', params.id)
    .single()

  return {
    title: agent ? `${agent.agent_name} — ToolRoute` : 'Agent Profile — ToolRoute',
    description: agent ? `Performance profile for ${agent.agent_name}. Challenge results, routing credits, and execution history.` : 'Agent profile.',
  }
}

export default async function AgentProfilePage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()

  // Fetch agent
  const { data: agent } = await supabase
    .from('agent_identities')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!agent) notFound()

  // Fetch all data in parallel
  const [
    { data: rewards },
    { data: submissions },
    { data: routingDecisions },
    { data: modelOutcomes },
    { data: contributions },
    { data: runs },
  ] = await Promise.all([
    supabase.from('reward_ledgers').select('routing_credits, reputation_points, reason, created_at').eq('agent_identity_id', params.id).order('created_at', { ascending: false }),
    supabase.from('challenge_submissions').select('*, workflow_challenges(title, slug, category)').eq('agent_identity_id', params.id).order('scored_at', { ascending: false }),
    supabase.from('model_routing_decisions').select('task_snippet, resolved_tier, recommended_alias, confidence, latency_ms, created_at').eq('agent_identity_id', params.id).order('created_at', { ascending: false }).limit(10),
    supabase.from('model_outcome_records').select('outcome_status, latency_ms, output_quality_rating, estimated_cost_usd, model_id, model_registry(display_name, provider)').eq('agent_identity_id', params.id).order('created_at', { ascending: false }).limit(10),
    supabase.from('contribution_events').select('id').eq('agent_identity_id', params.id),
    supabase.from('agent_runs').select('latency_ms').eq('agent_identity_id', params.id),
  ])

  // Aggregate stats
  const totalCredits = (rewards || []).reduce((sum, r) => sum + Number(r.routing_credits || 0), 0)
  const totalReputation = (rewards || []).reduce((sum, r) => sum + Number(r.reputation_points || 0), 0)
  const totalContributions = contributions?.length || 0
  const totalRuns = runs?.length || 0
  const avgLatency = totalRuns > 0
    ? (runs || []).reduce((sum, r) => sum + Number(r.latency_ms || 0), 0) / totalRuns
    : 0

  // Challenge medal counts
  const medalCounts = { gold: 0, silver: 0, bronze: 0 }
  for (const s of submissions || []) {
    const tier = (s.tier || '').toLowerCase()
    if (tier in medalCounts) medalCounts[tier as keyof typeof medalCounts] += 1
  }

  const trustStyle = TRUST_STYLES[agent.trust_tier] || TRUST_STYLES.baseline

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Breadcrumb */}
      <Link href="/agents" className="text-xs text-gray-400 hover:text-brand transition-colors mb-6 inline-block">
        &larr; All Agents
      </Link>

      {/* Agent Header */}
      <div className="card mb-8">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 mb-1">{agent.agent_name}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`badge text-[10px] ${trustStyle.bg} ${trustStyle.text}`}>
                {trustStyle.label}
              </span>
              <span className="text-xs text-gray-400 capitalize">{agent.agent_kind}</span>
              {agent.model_family && (
                <span className="text-xs text-gray-400">&middot; {agent.model_family}</span>
              )}
              {agent.host_client_slug && (
                <span className="text-xs text-gray-400">&middot; {agent.host_client_slug}</span>
              )}
            </div>
          </div>

          {/* Medal display */}
          <div className="flex items-center gap-3">
            {medalCounts.gold > 0 && (
              <div className="text-center">
                <div className="text-xl">{TIER_EMOJI.gold}</div>
                <div className="text-xs font-bold text-amber-700">{medalCounts.gold}</div>
              </div>
            )}
            {medalCounts.silver > 0 && (
              <div className="text-center">
                <div className="text-xl">{TIER_EMOJI.silver}</div>
                <div className="text-xs font-bold text-gray-600">{medalCounts.silver}</div>
              </div>
            )}
            {medalCounts.bronze > 0 && (
              <div className="text-center">
                <div className="text-xl">{TIER_EMOJI.bronze}</div>
                <div className="text-xs font-bold text-orange-700">{medalCounts.bronze}</div>
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
          <div className="text-center bg-gray-50 rounded-xl p-3">
            <div className="text-xl font-black text-brand">{totalCredits}</div>
            <div className="text-[10px] text-gray-400">Routing Credits</div>
          </div>
          <div className="text-center bg-gray-50 rounded-xl p-3">
            <div className="text-xl font-black text-teal">{totalReputation}</div>
            <div className="text-[10px] text-gray-400">Reputation</div>
          </div>
          <div className="text-center bg-gray-50 rounded-xl p-3">
            <div className="text-xl font-black text-purple-600">{(submissions || []).length}</div>
            <div className="text-[10px] text-gray-400">Challenges</div>
          </div>
          <div className="text-center bg-gray-50 rounded-xl p-3">
            <div className="text-xl font-black text-gray-700">{totalContributions}</div>
            <div className="text-[10px] text-gray-400">Contributions</div>
          </div>
          <div className="text-center bg-gray-50 rounded-xl p-3">
            <div className="text-xl font-black text-gray-700">{avgLatency > 0 ? `${(avgLatency / 1000).toFixed(1)}s` : '--'}</div>
            <div className="text-[10px] text-gray-400">Avg Latency</div>
          </div>
        </div>

        <div className="text-[10px] text-gray-400 mt-4">
          Registered {new Date(agent.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      {/* Challenge Results */}
      {(submissions || []).length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Challenge Results</h2>
          <div className="space-y-3">
            {(submissions || []).map((s: any) => {
              const tier = (s.tier || '').toLowerCase()
              const tierStyle = TIER_STYLES[tier] || 'bg-gray-50 text-gray-500 border-gray-200'

              return (
                <div key={s.id} className="card flex items-start gap-4">
                  {/* Medal */}
                  <div className="text-2xl flex-shrink-0 mt-1">
                    {TIER_EMOJI[tier] || ''}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-gray-900 text-sm truncate">
                        {s.workflow_challenges?.title || 'Challenge'}
                      </h3>
                      <span className={`badge text-[10px] border ${tierStyle}`}>
                        {tier.charAt(0).toUpperCase() + tier.slice(1)}
                      </span>
                      {s.workflow_challenges?.category && (
                        <span className="badge text-[10px] bg-gray-50 text-gray-400">
                          {s.workflow_challenges.category}
                        </span>
                      )}
                    </div>

                    {s.deliverable_summary && (
                      <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                        {s.deliverable_summary}
                      </p>
                    )}

                    {/* Score bars */}
                    <div className="grid grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="text-gray-400">Completeness</span>
                        <span className="ml-1 font-bold text-gray-700">{Number(s.completeness_score).toFixed(1)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Quality</span>
                        <span className="ml-1 font-bold text-gray-700">{Number(s.quality_score).toFixed(1)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Efficiency</span>
                        <span className="ml-1 font-bold text-gray-700">{Number(s.efficiency_score).toFixed(1)}</span>
                      </div>
                    </div>

                    {/* Tools used */}
                    {s.tools_used && Array.isArray(s.tools_used) && s.tools_used.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {s.tools_used.map((tool: any, i: number) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 bg-brand-light text-brand rounded-full font-medium">
                            {typeof tool === 'string' ? tool : tool.skill_slug || tool.name || 'tool'}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Overall score */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-2xl font-black text-gray-900">{Number(s.overall_score).toFixed(1)}</div>
                    <div className="text-[10px] text-gray-400">Overall</div>
                    {s.routing_credits_awarded > 0 && (
                      <div className="text-[10px] text-brand font-medium mt-1">+{s.routing_credits_awarded} credits</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Model Routing History */}
      {(routingDecisions || []).length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Model Routing</h2>
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Task</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Tier</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Model</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Confidence</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Latency</th>
                </tr>
              </thead>
              <tbody>
                {(routingDecisions || []).map((d: any, i: number) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="px-4 py-2.5 text-xs text-gray-700 max-w-[200px] truncate">
                      {d.task_snippet}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="badge text-[10px] bg-purple-50 text-purple-700">
                        {d.resolved_tier}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-600 font-mono">
                      {d.recommended_alias}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs font-bold text-gray-700">
                      {(Number(d.confidence) * 100).toFixed(0)}%
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-gray-500">
                      {d.latency_ms}ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Model Outcome Reports */}
      {(modelOutcomes || []).length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Model Execution Reports</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(modelOutcomes || []).map((o: any, i: number) => {
              const modelInfo = o.model_registry as any
              const statusColor = o.outcome_status === 'success' ? 'text-green-600 bg-green-50' :
                o.outcome_status === 'partial_success' ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50'

              return (
                <div key={i} className="card py-3 px-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-gray-900 text-sm">
                      {modelInfo?.display_name || 'Unknown'}
                    </div>
                    <span className={`badge text-[10px] ${statusColor}`}>
                      {o.outcome_status}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400">Quality</span>
                      <span className="ml-1 font-bold">{o.output_quality_rating ? Number(o.output_quality_rating).toFixed(1) : '--'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Latency</span>
                      <span className="ml-1 font-bold">{o.latency_ms ? `${o.latency_ms}ms` : '--'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Cost</span>
                      <span className="ml-1 font-bold">{o.estimated_cost_usd ? `$${Number(o.estimated_cost_usd).toFixed(4)}` : '--'}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Reward History */}
      {(rewards || []).length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Reward History</h2>
          <div className="card p-0 overflow-hidden">
            {(rewards || []).slice(0, 10).map((r: any, i: number) => (
              <div key={i} className={`flex items-center justify-between px-4 py-2.5 text-xs ${i > 0 ? 'border-t border-gray-50' : ''}`}>
                <span className="text-gray-600">{r.reason}</span>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {Number(r.routing_credits) > 0 && (
                    <span className="font-bold text-brand">+{r.routing_credits} credits</span>
                  )}
                  {Number(r.reputation_points) > 0 && (
                    <span className="font-bold text-teal">+{r.reputation_points} rep</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {(submissions || []).length === 0 && (routingDecisions || []).length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg font-medium mb-1">No activity yet</p>
          <p className="text-sm">This agent hasn&apos;t completed any challenges or model routing requests.</p>
          <Link href="/challenges" className="btn-primary text-sm mt-4 inline-block">
            Browse Challenges
          </Link>
        </div>
      )}
    </div>
  )
}
