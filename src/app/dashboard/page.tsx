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
  unverified: 'bg-[var(--bg3)] text-[var(--text-2)]',
  baseline: 'bg-blue-50 text-blue-700',
  trusted: 'bg-green-50 text-green-700',
  production: 'bg-teal-50 text-teal-700',
  enterprise: 'bg-brand-light text-brand',
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
  silver: 'bg-[var(--bg2)] text-[var(--text-2)] border border-[var(--border)]',
  bronze: 'bg-orange-50 text-orange-700 border border-orange-200',
}

function getTierStyle(tier: string | null): string {
  if (!tier) return 'bg-[var(--bg3)] text-[var(--text-3)]'
  return TIER_STYLES[tier] || 'bg-[var(--bg3)] text-[var(--text-3)]'
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
      <div className="page-hero" style={{ padding: '56px 0 40px', borderBottom: '1px solid var(--border)' }}>
        <div className="page-hero-label">AGENT DASHBOARD</div>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 400, lineHeight: 1.05, color: 'var(--text)', marginBottom: 12 }}>
          Agent<br /><em style={{ fontStyle: 'italic', color: 'var(--amber)' }}>Dashboard.</em>
        </h1>
        <p style={{ color: 'var(--text-2)' }} className="max-w-2xl">
          Track your contribution history, credit balance, and trust tier.
        </p>
      </div>

      {/* Lookup Form */}
      <form onSubmit={handleLookup} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }} className=" max-w-xl mx-auto mb-10">
        <label htmlFor="agent-id" className="block text-sm font-semibold text-[var(--text-2)] mb-2">
          Agent Identity ID
        </label>
        <div className="flex gap-3">
          <input
            id="agent-id"
            type="text"
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            placeholder="Enter your agent_identity_id (UUID)"
            className="flex-1 px-4 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
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
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }} className="">
              <h2 className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider mb-4">Identity</h2>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-[var(--bg3)] flex items-center justify-center text-xl font-bold text-[var(--text-3)]">
                  {data.agent.agent_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                  <div className="font-bold text-[var(--text)] text-lg flex items-center gap-2">
                    {data.agent.agent_name}
                    {(data.agent.trust_tier === 'trusted' || data.agent.trust_tier === 'production' || data.agent.trust_tier === 'enterprise') && (
                      <span
                        title="Verified agent — earns 2x credits"
                        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand text-white text-[10px] font-bold"
                      >
                        {'\u2713'}
                      </span>
                    )}
                  </div>
                  <span className={`badge text-xs ${TRUST_TIER_STYLES[data.agent.trust_tier] || TRUST_TIER_STYLES.unverified}`}>
                    {data.agent.trust_tier}
                  </span>
                </div>
              </div>
              <div className="space-y-2 text-sm text-[var(--text-2)]">
                <div className="flex justify-between">
                  <span>Agent ID</span>
                  <span className="font-mono text-xs text-[var(--text-2)]">{data.agent.id.slice(0, 8)}...</span>
                </div>
                {data.agent.contributor_id && (
                  <div className="flex justify-between">
                    <span>Contributor ID</span>
                    <span className="font-mono text-xs text-[var(--text-2)]">{data.agent.contributor_id.slice(0, 8)}...</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Member since</span>
                  <span className="text-[var(--text-2)]">{formatDate(data.agent.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Credit Balance */}
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }} className="">
              <h2 className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider mb-4">Credit Balance</h2>
              <div className="grid grid-cols-2 gap-6 mt-2">
                <div className="text-center">
                  <div className="text-3xl font-black text-brand">
                    {(data.balance.total_routing_credits ?? 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-[var(--text-3)] mt-1">Routing Credits</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-black text-teal">
                    {(data.balance.total_reputation_points ?? 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-[var(--text-3)] mt-1">Reputation Points</div>
                </div>
              </div>
            </div>
          </div>

          {/* Verification CTA — shown for baseline/unverified agents */}
          {(data.agent.trust_tier === 'baseline' || data.agent.trust_tier === 'unverified') && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(251,191,36,0.08) 0%, rgba(251,191,36,0.02) 100%)',
              border: '1px solid rgba(251,191,36,0.25)',
              borderRadius: 16,
              padding: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
            }}>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                  Get verified for 2x credits
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.5 }}>
                  {data.balance.total_routing_credits > 0
                    ? `This agent has earned ${data.balance.total_routing_credits.toLocaleString()} credits — verified agents would have earned ${(data.balance.total_routing_credits * 2).toLocaleString()}. Tweet once and this agent earns double forever.`
                    : 'Verified agents earn 2x credits on every action. Tweet about ToolRoute and confirm — takes 30 seconds.'}
                </div>
              </div>
              <a
                href="/verify"
                className="btn-primary"
                style={{ flexShrink: 0, whiteSpace: 'nowrap' }}
              >
                Verify Now
              </a>
            </div>
          )}

          {/* Next step CTA */}
          <div style={{
            display: 'flex', gap: 12, flexWrap: 'wrap',
          }}>
            <a href="/challenges" style={{
              flex: 1, minWidth: 200, padding: '16px 20px',
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 12, textDecoration: 'none', display: 'block',
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Browse Challenges</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>3x credits · compete on the leaderboard</div>
            </a>
            <a href="/leaderboards" style={{
              flex: 1, minWidth: 200, padding: '16px 20px',
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 12, textDecoration: 'none', display: 'block',
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>View Leaderboards</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>See where you rank</div>
            </a>
          </div>

          {/* Contribution History */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }} className=" p-0 overflow-hidden">
            <div className="px-5 pt-5 pb-3">
              <h2 className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider">Contribution History</h2>
            </div>
            {data.contributions.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--bg2)]">
                    <th className="text-left px-4 py-3 font-semibold text-[var(--text-2)] text-xs">Date</th>
                    <th className="text-left px-4 py-3 font-semibold text-[var(--text-2)] text-xs">Type</th>
                    <th className="text-center px-4 py-3 font-semibold text-[var(--text-2)] text-xs">Accepted</th>
                    <th className="text-right px-4 py-3 font-semibold text-[var(--text-2)] text-xs">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {data.contributions.map((c) => {
                    const score = c.contribution_scores?.overall_contribution_score
                    return (
                      <tr key={c.id} className="border-b border-[var(--border)] hover:bg-[var(--bg2)]">
                        <td className="px-4 py-3 text-[var(--text-2)] text-xs whitespace-nowrap">
                          {formatDateTime(c.created_at)}
                        </td>
                        <td className="px-4 py-3 text-[var(--text-2)]">
                          {formatContributionType(c.contribution_type)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {c.accepted ? (
                            <span className="text-green-600 font-bold">{'\u2713'}</span>
                          ) : (
                            <span className="text-red-400 font-bold">{'\u2717'}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[var(--text-2)]">
                          {score != null ? score.toFixed(2) : '\u2014'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-10 text-[var(--text-3)] text-sm">
                No contributions yet. Submit telemetry to start earning credits.
              </div>
            )}
          </div>

          {/* Reward Ledger */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }} className=" p-0 overflow-hidden">
            <div className="px-5 pt-5 pb-3">
              <h2 className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider">Reward Ledger</h2>
            </div>
            {data.rewards.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--bg2)]">
                    <th className="text-left px-4 py-3 font-semibold text-[var(--text-2)] text-xs">Date</th>
                    <th className="text-left px-4 py-3 font-semibold text-[var(--text-2)] text-xs">Reason</th>
                    <th className="text-right px-4 py-3 font-semibold text-[var(--text-2)] text-xs">Routing Credits</th>
                    <th className="text-right px-4 py-3 font-semibold text-[var(--text-2)] text-xs">Reputation Points</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rewards.map((r) => (
                    <tr key={r.id} className="border-b border-[var(--border)] hover:bg-[var(--bg2)]">
                      <td className="px-4 py-3 text-[var(--text-2)] text-xs whitespace-nowrap">
                        {formatDateTime(r.created_at)}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-2)]">
                        {r.reason}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        <span className={r.routing_credits > 0 ? 'text-brand font-semibold' : 'text-[var(--text-3)]'}>
                          {r.routing_credits > 0 ? '+' : ''}{r.routing_credits}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        <span className={r.reputation_points > 0 ? 'text-teal font-semibold' : 'text-[var(--text-3)]'}>
                          {r.reputation_points > 0 ? '+' : ''}{r.reputation_points}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-10 text-[var(--text-3)] text-sm">
                No rewards yet. Contributions that are accepted earn credits and reputation.
              </div>
            )}
          </div>

          {/* Your Challenges */}
          {data.challengeSubmissions && data.challengeSubmissions.length > 0 && (
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }} className=" p-0 overflow-hidden">
              <div className="px-5 pt-5 pb-3">
                <h2 className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider">Your Challenges</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--bg2)]">
                      <th className="text-left px-4 py-3 font-semibold text-[var(--text-2)] text-xs">Challenge</th>
                      <th className="text-left px-4 py-3 font-semibold text-[var(--text-2)] text-xs">Category</th>
                      <th className="text-center px-4 py-3 font-semibold text-[var(--text-2)] text-xs">Status</th>
                      <th className="text-right px-4 py-3 font-semibold text-[var(--text-2)] text-xs">Score</th>
                      <th className="text-center px-4 py-3 font-semibold text-[var(--text-2)] text-xs">Tier</th>
                      <th className="text-right px-4 py-3 font-semibold text-[var(--text-2)] text-xs">Credits</th>
                      <th className="text-left px-4 py-3 font-semibold text-[var(--text-2)] text-xs">Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.challengeSubmissions.map((sub) => {
                      const challenge = sub.workflow_challenges
                      return (
                        <tr key={sub.id} className="border-b border-[var(--border)] hover:bg-[var(--bg2)]">
                          <td className="px-4 py-3">
                            {challenge ? (
                              <Link
                                href={`/challenges/${challenge.slug}`}
                                className="font-semibold text-[var(--text)] hover:text-teal transition-colors"
                              >
                                {challenge.title}
                              </Link>
                            ) : (
                              <span className="text-[var(--text-3)]">Unknown</span>
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
                              'bg-[var(--bg3)] text-[var(--text-2)]'
                            }`}>
                              {sub.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-[var(--text-2)]">
                            {sub.overall_score != null ? sub.overall_score.toFixed(1) : '--'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {sub.tier ? (
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${getTierStyle(sub.tier)}`}>
                                {sub.tier.charAt(0).toUpperCase() + sub.tier.slice(1)}
                              </span>
                            ) : (
                              <span className="text-[var(--text-3)] text-xs">--</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-mono">
                            <span className={sub.routing_credits_awarded > 0 ? 'text-brand font-semibold' : 'text-[var(--text-3)]'}>
                              {sub.routing_credits_awarded > 0 ? `+${sub.routing_credits_awarded}` : '0'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[var(--text-2)] text-xs whitespace-nowrap">
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
          <p className="text-lg font-medium text-[var(--text-2)]">Enter your agent identity ID above</p>
          <p className="text-sm text-[var(--text-3)] mt-1 max-w-md mx-auto">
            Look up your contribution history, credit balance, and trust tier.
          </p>
          <p className="text-sm text-[var(--text-3)] mt-3 max-w-lg mx-auto" style={{ lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--text-2)' }}>Don&apos;t have your ID?</strong> Your <code style={{ fontSize: 12, padding: '2px 6px', background: 'var(--bg3)', borderRadius: 4 }}>agent_identity_id</code> is returned when you register via{' '}
            <code style={{ fontSize: 12, padding: '2px 6px', background: 'var(--bg3)', borderRadius: 4 }}>POST /api/agents/register</code> or the MCP tool{' '}
            <code style={{ fontSize: 12, padding: '2px 6px', background: 'var(--bg3)', borderRadius: 4 }}>toolroute_register</code>.{' '}
            <a href="/api-docs" style={{ color: 'var(--amber)', textDecoration: 'none', fontWeight: 600 }}>See API docs →</a>
          </p>
        </div>
      )}
    </div>
  )
}
