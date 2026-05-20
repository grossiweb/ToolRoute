'use client'

import { useState, useEffect } from 'react'

type Decision = {
  id: string
  agent_name: string | null
  task_snippet: string | null
  resolved_tier: string | null
  task_cluster: string | null
  created_at: string
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const s = Math.max(1, Math.floor(diffMs / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export function DecisionsFeed() {
  const [rows, setRows] = useState<Decision[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/recent-decisions', { cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        if (!cancelled) {
          setRows((json.decisions || []).slice(0, 5))
          setError(null)
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'fetch failed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    const interval = setInterval(load, 30000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return (
    <div style={{
      width: '100%',
      background: 'var(--bg2)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '9px 15px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg3)',
      }}>
        <span style={{
          fontFamily: 'var(--mono)', fontSize: 11,
          color: 'var(--text-2)', letterSpacing: 0.5, flex: 1,
        }}>Recent routing decisions</span>
        <span style={{
          fontFamily: 'var(--mono)', fontSize: 10,
          color: 'var(--text-3)', textTransform: 'uppercase',
          letterSpacing: 1,
          background: 'var(--bg3)',
          padding: '2px 7px', borderRadius: 4,
        }}>Recent</span>
      </div>

      {/* Rows */}
      {loading && rows.length === 0 && (
        <div style={{
          padding: '14px 15px',
          fontFamily: 'var(--mono)', fontSize: 11,
          color: 'var(--text-3)',
        }}>Loading…</div>
      )}
      {error && rows.length === 0 && (
        <div style={{
          padding: '14px 15px',
          fontFamily: 'var(--mono)', fontSize: 11,
          color: 'var(--text-3)',
        }}>No recent decisions available.</div>
      )}
      {rows.map((d, i) => {
        const task = d.task_snippet || d.task_cluster || '(no task)'
        const agent = d.agent_name || 'anon'
        const tier = d.resolved_tier || d.task_cluster || '—'
        return (
          <div key={d.id} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 15px',
            borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none',
            fontFamily: 'var(--mono)', fontSize: 11,
            animation: i === 0 ? 'fadeSlideIn .3s ease' : undefined,
            transition: 'background .15s',
          }}>
            <span style={{ flex: 1, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task}</span>
            <span style={{ color: 'var(--text-3)', fontSize: 10, minWidth: 58, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{agent}</span>
            <span style={{ color: 'var(--border-bright)' }}>→</span>
            <span style={{ color: 'var(--amber)', fontWeight: 500 }}>{tier}</span>
            <span style={{ color: 'var(--text-3)', fontSize: 10, minWidth: 50, textAlign: 'right' }}>{relativeTime(d.created_at)}</span>
          </div>
        )
      })}
    </div>
  )
}
