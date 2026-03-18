'use client'

import { useState } from 'react'
import Link from 'next/link'

interface ChallengeSubmission {
  id: string
  status: string
  overall_score: number | null
  completeness_score: number | null
  quality_score: number | null
  efficiency_score: number | null
  tier: string | null
  routing_credits_awarded: number
  reputation_points_awarded: number
  submitted_at: string
  scored_at: string | null
  workflow_challenges: {
    title: string
    slug: string
    category: string
  } | null
}

interface AgentData {
  agent: {
    id: string
    agent_name: string
    trust_tier: string
    contributor_id: string | null
    created_at: string
  }
  balance: {
    total_routing_credits: number
    total_reputation_points: number
  }
  contributions: Array<{
    id: string
    contribution_type: string
    accepted: boolean
    created_at: string
    contribution_scores: { overall_contribution_score: number } | null
  }>
  rewards: Array<{
    id: string
    routing_credits: number
    reputation_points: number
    reason: string
    created_at: string
  }>
  challengeSubmissions: ChallengeSubmission[]
}

const TRUST_TIER_STYLES: Record<string, string> = {
  unverified: 'bg-gray-100 text-gray-600',
  baseline: 'bg-blue-50 text-blue-700',
  trusted: 'bg-green-50 text-green-700',
  production: 'bg-teal-50 text-teal-700',
  enterprise: 'bg-purple-50 text-purple-700',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatContributionType(type: string) {
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

const TIER_STYLES: Record<string, string> = {
  gold: 'bg-amber-50 text-amber-700 border border-amber-200',
  silver: 'bg-gray-50 text-gray-600 border border-gray-200',
  bronze: 'bg-orange-50 text-orange-700 border border-orange-200',
}

function getTierStyle(tier: string | null): string {
  if (!tier) return 'bg-gray-100 text-gray-400'
  return TIER_STYLES[tier] || 'bg-gray-100 text-gray-400'
}

export default function DashboardPage() {
  const [agentId, setAgentId] = useState('')
  const [data, setData] = useState<AgentData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = agentId.trim()
    if (!trimmed) return

    setLoading(true)
    setError(null)
    setData(null)

    try {
      const res = await fetch(`/api/agent-dashboard?agent_identity_id=${encodeURIComponent(trimmed)}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Request failed' }))
        setError(body.error || `Error ${res.status}`)
        return
      }
      const json = await res.json()
      setData(json)
    } catch {
      setError('Failed to fetch agent data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-light text-brand text-xs font-semibold mb-4">
          AGENT DASHBOARD
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-3">
          Agent Dashboard
        </h1>
        <p className="text-gray-500 max-w-2xl mx-auto">
          Track your contribution history, credit balance, and trust tier.
        </p>
      </div>

      {/* Lookup Form */}
      <form onSubmit={handleLookup} className="card max-w-xl mx-auto mb-10">
        <label htmlFor="agent-id" className="block text-sm font-semibold text-gray-700 mb-2">
          Agent Identity ID
        </label>
        <div className="flex gap-3">
          <input
            id="agent-id"
            type="text"
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            placeholder="Enter your agent_identity_id (UUID)"
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
          />
          <button
            type="submit"
            disabled={loading || !agentId.trim()}
            className="btn-primary disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Look Up'}
          </button>
        </div>
        {error && (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        )}
      </form>

      {/* Results */}
      {data && (
        <div className="space-y-8">
          {/* Identity Card + Credit Balance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Identity Card */}
            <div className="card">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Identity</h2>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-xl font-bold text-gray-400">
                  {data.agent.agent_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-lg">{data.agent.agent_name}</div>
                  <span className={`badge text-xs ${TRUST_TIER_STYLES[data.agent.trust_tier] || TRUST_TIER_STYLES.unverified}`}>
                    {data.agent.trust_tier}
                  </span>
                </div>
              </div>
              <div className="space-y-2 text-sm text-gray-500">
                <div className="flex justify-between">
                  <span>Agent ID</span>
                  <span className="font-mono text-xs text-gray-700">{data.agent.id.slice(0, 8)}...</span>
                </div>
                {data.agent.contributor_id && (
                  <div className="flex justify-between">
                    <span>Contributor ID</span>
                    <span className="font-mono text-xs text-gray-700">{data.agent.contributor_id.slice(0, 8)}...</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Member since</span>
                  <span className="text-gray-700">{formatDate(data.agent.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Credit Balance */}
            <div className="card">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Credit Balance</h2>
              <div className="grid grid-cols-2 gap-6 mt-2">
                <div className="text-center">
                  <div className="text-3xl font-black text-brand">
                    {(data.balance.total_routing_credits ?? 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-400 mt-1">Routing Credits</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-black text-teal">
                    {(data.balance.total_reputation_points ?? 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-400 mt-1">Reputation Points</div>
                </div>
              </div>
            </div>
          </div>

          {/* Contribution History */}
          <div className="card p-0 overflow-hidden">
            <div className="px-5 pt-5 pb-3">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Contribution History</h2>
            </div>
            {data.contributions.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Date</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Type</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-500 text-xs">Accepted</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {data.contributions.map((c) => {
                    const score = c.contribution_scores?.overall_contribution_score
                    return (
                      <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                          {formatDateTime(c.created_at)}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {formatContributionType(c.contribution_type)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {c.accepted ? (
                            <span className="text-green-600 font-bold">{'\u2713'}</span>
                          ) : (
                            <span className="text-red-400 font-bold">{'\u2717'}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-gray-700">
                          {score != null ? score.toFixed(2) : '\u2014'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-10 text-gray-400 text-sm">
                No contributions yet. Submit telemetry to start earning credits.
              </div>
            )}
          </div>

          {/* Reward Ledger */}
          <div className="card p-0 overflow-hidden">
            <div className="px-5 pt-5 pb-3">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Reward Ledger</h2>
            </div>
            {data.rewards.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Date</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Reason</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs">Routing Credits</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs">Reputation Points</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rewards.map((r) => (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {formatDateTime(r.created_at)}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {r.reason}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        <span className={r.routing_credits > 0 ? 'text-brand font-semibold' : 'text-gray-400'}>
                          {r.routing_credits > 0 ? '+' : ''}{r.routing_credits}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        <span className={r.reputation_points > 0 ? 'text-teal font-semibold' : 'text-gray-400'}>
                          {r.reputation_points > 0 ? '+' : ''}{r.reputation_points}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-10 text-gray-400 text-sm">
                No rewards yet. Contributions that are accepted earn credits and reputation.
              </div>
            )}
          </div>

          {/* Your Challenges */}
          {data.challengeSubmissions && data.challengeSubmissions.length > 0 && (
            <div className="card p-0 overflow-hidden">
              <div className="px-5 pt-5 pb-3">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Your Challenges</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Challenge</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Category</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-500 text-xs">Status</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs">Score</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-500 text-xs">Tier</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs">Credits</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.challengeSubmissions.map((sub) => {
                      const challenge = sub.workflow_challenges
                      return (
                        <tr key={sub.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="px-4 py-3">
                            {challenge ? (
                              <Link
                                href={`/challenges/${challenge.slug}`}
                                className="font-semibold text-gray-900 hover:text-teal transition-colors"
                              >
                                {challenge.title}
                              </Link>
                            ) : (
                              <span className="text-gray-400">Unknown</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="badge bg-teal-50 text-teal text-[10px] capitalize">
                              {challenge?.category?.replace('-', ' ') || '--'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`badge text-[10px] ${
                              sub.status === 'scored' ? 'bg-green-50 text-green-700' :
                              sub.status === 'scoring' ? 'bg-yellow-50 text-yellow-700' :
                              sub.status === 'rejected' ? 'bg-red-50 text-red-600' :
                              'bg-gray-100 text-gray-500'
                            }`}>
                              {sub.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-gray-700">
                            {sub.overall_score != null ? sub.overall_score.toFixed(1) : '--'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {sub.tier ? (
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${getTierStyle(sub.tier)}`}>
                                {sub.tier.charAt(0).toUpperCase() + sub.tier.slice(1)}
                              </span>
                            ) : (
                              <span className="text-gray-300 text-xs">--</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-mono">
                            <span className={sub.routing_credits_awarded > 0 ? 'text-brand font-semibold' : 'text-gray-400'}>
                              {sub.routing_credits_awarded > 0 ? `+${sub.routing_credits_awarded}` : '0'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                            {formatDateTime(sub.submitted_at)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state when no lookup has been done */}
      {!data && !loading && !error && (
        <div className="text-center py-16">
          <p className="text-lg font-medium text-gray-600">Enter your agent identity ID above</p>
          <p className="text-sm text-gray-400 mt-1 max-w-md mx-auto">
            Look up your contribution history, credit balance, and trust tier.
            Your agent identity ID is returned when you register via the API.
          </p>
        </div>
      )}
    </div>
  )
}
