'use client'

import { useState } from 'react'

export default function AdminPage() {
  const [secret, setSecret] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [stats, setStats] = useState<any>(null)

  async function fetchStats() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${secret}` },
      })
      if (!res.ok) {
        if (res.status === 401) setError('Invalid admin secret.')
        else setError(`Error ${res.status}`)
        setLoading(false)
        return
      }
      const data = await res.json()
      setStats(data)
      setAuthenticated(true)
    } catch (e: any) {
      setError(e.message || 'Network error')
    }
    setLoading(false)
  }

  async function refresh() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${secret}` },
      })
      if (res.ok) setStats(await res.json())
    } catch {}
    setLoading(false)
  }

  if (!authenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div style={{ maxWidth: 400, width: '100%' }}>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 32, marginBottom: 8, color: 'var(--text)' }}>Admin Dashboard</h1>
          <p style={{ color: 'var(--text-3)', fontSize: 14, marginBottom: 24 }}>Enter your admin secret to view platform statistics.</p>
          <input
            type="password"
            placeholder="Admin secret"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchStats()}
            style={{
              width: '100%', padding: '12px 16px', borderRadius: 10,
              border: '1px solid var(--border)', background: 'var(--bg2)',
              color: 'var(--text)', fontSize: 15, marginBottom: 12,
              outline: 'none',
            }}
          />
          <button
            onClick={fetchStats}
            disabled={loading || !secret}
            style={{
              width: '100%', padding: '12px 16px', borderRadius: 10,
              background: 'var(--amber)', color: '#000', fontWeight: 600,
              fontSize: 15, border: 'none', cursor: loading ? 'wait' : 'pointer',
              opacity: loading || !secret ? 0.5 : 1,
            }}
          >
            {loading ? 'Loading...' : 'Sign In'}
          </button>
          {error && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 8 }}>{error}</p>}
        </div>
      </div>
    )
  }

  const s = stats?.summary || {}

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 24px 60px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 36, color: 'var(--text)', marginBottom: 4 }}>
            Admin <em style={{ fontStyle: 'italic', color: 'var(--amber)' }}>Dashboard</em>
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: 13 }}>
            Generated {stats?.generated_at ? new Date(stats.generated_at).toLocaleString() : '—'}
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          style={{
            padding: '8px 20px', borderRadius: 8, background: 'var(--bg3)',
            border: '1px solid var(--border)', color: 'var(--text)', fontSize: 13,
            cursor: 'pointer', fontWeight: 500,
          }}
        >
          {loading ? '...' : '↻ Refresh'}
        </button>
      </div>

      {/* Query Errors */}
      {stats?.query_errors && (
        <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 12, padding: 16, marginBottom: 24 }}>
          <h3 style={{ color: '#ef4444', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Query Errors</h3>
          {Object.entries(stats.query_errors).map(([table, msg]: any) => (
            <p key={table} style={{ fontSize: 12, color: '#ef4444' }}>{table}: {msg}</p>
          ))}
        </div>
      )}

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 32 }}>
        <StatCard label="Registered Agents" value={s.registered_agents} />
        <StatCard label="Contributors" value={s.total_contributors} />
        <StatCard label="Outcome Records" value={s.total_outcome_records} />
        <StatCard label="Contributions" value={s.total_contributions} />
        <StatCard label="Credits Issued" value={s.total_routing_credits_issued} highlight />
        <StatCard label="Reputation Issued" value={s.total_reputation_points_issued} />
        <StatCard label="Mission Claims" value={s.total_mission_claims} />
        <StatCard label="Agent Runs" value={s.total_agent_runs} />
        <StatCard label="Active Skills" value={s.active_skills_in_catalog} />
        <StatCard label="Model Decisions" value={s.model_routing_decisions} />
        <StatCard label="Model Reports" value={s.model_outcome_reports} />
        <StatCard label="Challenges" value={s.workflow_challenges} />
        <StatCard label="Challenge Subs" value={s.challenge_submissions} />
      </div>

      {/* Two Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Agents */}
        <Section title="Registered Agents">
          <Table
            headers={['Name', 'Kind', 'Trust Tier', 'Active']}
            rows={(stats?.agents || []).map((a: any) => [
              a.name, a.kind || '—', a.trust_tier, a.active ? '✓' : '✗',
            ])}
          />
        </Section>

        {/* Outcome Breakdown */}
        <Section title="Outcome Breakdown">
          <Table
            headers={['Status', 'Count']}
            rows={Object.entries(stats?.outcome_breakdown || {}).map(([k, v]: any) => [k, v])}
          />
        </Section>

        {/* Contribution Breakdown */}
        <Section title="Contribution Types">
          <Table
            headers={['Type', 'Count']}
            rows={Object.entries(stats?.contribution_breakdown || {}).map(([k, v]: any) => [k, v])}
          />
        </Section>

        {/* Missions */}
        <Section title="Missions">
          <Table
            headers={['Title', 'Status', 'Claims']}
            rows={(stats?.missions || []).map((m: any) => [m.title, m.status, m.claims])}
          />
        </Section>

        {/* Recent Rewards */}
        <Section title="Recent Rewards">
          <Table
            headers={['Credits', 'Reputation', 'Reason', 'Date']}
            rows={(stats?.recent_rewards || []).slice(0, 10).map((r: any) => [
              r.routing_credits, r.reputation_points, (r.reason || '—').slice(0, 30), shortDate(r.created_at),
            ])}
          />
        </Section>

        {/* Recent Contributions */}
        <Section title="Recent Contributions">
          <Table
            headers={['Type', 'Runs', 'Accepted', 'Date']}
            rows={(stats?.recent_contributions || []).slice(0, 10).map((c: any) => [
              c.contribution_type, c.run_count, c.accepted ? '✓' : '✗', shortDate(c.created_at),
            ])}
          />
        </Section>

        {/* Model Routing */}
        <Section title="Model Tier Distribution">
          <Table
            headers={['Tier', 'Count']}
            rows={Object.entries(stats?.model_routing?.tier_distribution || {}).map(([k, v]: any) => [k, v])}
          />
        </Section>

        {/* Challenge Submissions */}
        <Section title="Challenge Submissions">
          <Table
            headers={['Challenge', 'Agent', 'Tier', 'Score']}
            rows={(stats?.challenges?.recent_submissions || []).map((s: any) => [
              (s.challenge || '—').slice(0, 25), (s.agent || '—').slice(0, 20), s.tier || '—', s.score?.toFixed(1) || '—',
            ])}
          />
        </Section>

        {/* Telemetry Rate */}
        <Section title="Telemetry Rate Tracking">
          <Table
            headers={['Agent', 'Recs', 'Reports', 'Rate']}
            rows={(stats?.telemetry_rate || []).slice(0, 10).map((t: any) => [
              t.agent_identity_id?.slice(0, 8) || 'anon',
              t.total_recommendations || 0,
              t.total_reported_runs || 0,
              t.total_recommendations ? `${Math.round((t.total_reported_runs / t.total_recommendations) * 100)}%` : '—',
            ])}
          />
        </Section>
      </div>
    </div>
  )
}

function StatCard({ label, value, highlight }: { label: string; value: any; highlight?: boolean }) {
  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12,
      padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
      <span style={{
        fontSize: 28, fontFamily: 'var(--serif)', fontWeight: 400,
        color: highlight ? 'var(--amber)' : 'var(--text)',
      }}>
        {value ?? 0}
      </span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', marginBottom: 0 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 12, fontFamily: 'var(--sans)' }}>{title}</h3>
      {children}
    </div>
  )
}

function Table({ headers, rows }: { headers: string[]; rows: any[][] }) {
  if (rows.length === 0) {
    return <p style={{ fontSize: 12, color: 'var(--text-3)' }}>No data yet.</p>
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--text-3)', fontWeight: 500, borderBottom: '1px solid var(--border)', fontFamily: 'var(--mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: '5px 8px', color: 'var(--text-2)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{cell ?? '—'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function shortDate(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
