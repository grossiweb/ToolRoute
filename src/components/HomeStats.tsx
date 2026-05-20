'use client'

import { useState, useEffect } from 'react'

type Stats = {
  total_skills: number
  total_agents: number
  total_routing_decisions: number
  success_rate_pct: number
  top_tier: string | null
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`
  return String(n)
}

export function HomeStats() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/stats/public')
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (!cancelled && json) setStats(json) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const cards = [
    { num: stats ? formatNumber(stats.total_routing_decisions) : '—', label: 'Routing decisions' },
    { num: stats ? `${stats.success_rate_pct}%` : '—', label: 'Outcome success rate' },
    { num: stats ? formatNumber(stats.total_skills) : '—', label: 'Active skills' },
    { num: stats ? String(stats.total_agents) : '—', label: 'Registered agents' },
  ]

  return (
    <div className="stats-bar" style={{
      border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
      background: 'var(--bg2)', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', overflow: 'hidden',
    }}>
      {cards.map((s, i) => (
        <div key={s.label} style={{
          padding: '28px 32px',
          borderRight: i < 3 ? '1px solid var(--border)' : 'none',
        }}>
          <div style={{
            fontFamily: 'var(--serif)', fontSize: 44, lineHeight: 1,
            color: 'var(--text)', marginBottom: 4, fontStyle: 'italic',
          }}>
            {s.num}
          </div>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 11,
            color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.8,
          }}>
            {s.label}
          </div>
        </div>
      ))}
    </div>
  )
}
