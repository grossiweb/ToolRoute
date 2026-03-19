'use client'

import { useState, useEffect } from 'react'

type Decision = {
  task: string
  agent: string
  win: string
  lose: string
  score: string
  time: string
}

const INIT: Decision[] = [
  { task: 'scrape competitor pricing',   agent: 'agent_42f', win: 'firecrawl-mcp',  lose: 'jina-reader',  score: '94%', time: '2s ago' },
  { task: 'parse CSV → structured JSON', agent: 'agent_7ba', win: 'haiku-3.5',      lose: 'gpt-4o-mini',  score: '97%', time: '5s ago' },
  { task: 'summarize GitHub diff',       agent: 'agent_1cc', win: 'github-mcp',     lose: 'file-read',    score: '88%', time: '11s ago' },
  { task: 'send Slack notification',     agent: 'agent_9e2', win: 'slack-mcp',      lose: 'zapier',       score: '99%', time: '18s ago' },
  { task: 'web search: AI news today',   agent: 'agent_3d5', win: 'brave-search',   lose: 'bing-mcp',     score: '91%', time: '24s ago' },
]

const MORE: Decision[] = [
  { task: 'extract table from PDF',      agent: 'agent_f11', win: 'pdf-reader-mcp', lose: 'gpt-vision',   score: '86%', time: '' },
  { task: 'run SQL on warehouse',        agent: 'agent_0a8', win: 'postgres-mcp',   lose: 'direct api',   score: '93%', time: '' },
  { task: 'translate email to French',   agent: 'agent_c55', win: 'haiku-3.5',      lose: 'deepl-mcp',    score: '96%', time: '' },
  { task: 'lint TypeScript project',     agent: 'agent_88d', win: 'eslint-mcp',     lose: 'gpt-4o',       score: '89%', time: '' },
  { task: 'get Notion page content',     agent: 'agent_2b7', win: 'notion-mcp',     lose: 'fetch-url',    score: '98%', time: '' },
]

const TIMES = ['just now', '2s ago', '5s ago', '11s ago', '18s ago']

export function DecisionsFeed() {
  const [rows, setRows] = useState<Decision[]>(INIT)
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setIdx(prev => {
        const next = prev + 1
        const newRow = { ...MORE[next % MORE.length], time: 'just now' }
        setRows(cur => {
          const updated = [newRow, ...cur.slice(0, 4)]
          return updated.map((r, i) => ({ ...r, time: TIMES[i] || r.time }))
        })
        return next
      })
    }, 3800)
    return () => clearInterval(interval)
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
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--green)',
          boxShadow: '0 0 6px var(--green)',
          animation: 'pulse-dot 2s infinite',
        }} />
        <span style={{
          fontFamily: 'var(--mono)', fontSize: 11,
          color: 'var(--text-2)', letterSpacing: 0.5, flex: 1,
        }}>Recent decisions</span>
        <span style={{
          fontFamily: 'var(--mono)', fontSize: 10,
          color: 'var(--green)', textTransform: 'uppercase',
          letterSpacing: 1,
          background: 'var(--green-dim)',
          padding: '2px 7px', borderRadius: 4,
        }}>live</span>
      </div>

      {/* Rows */}
      {rows.map((d, i) => (
        <div key={`${d.task}-${i}`} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 15px',
          borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none',
          fontFamily: 'var(--mono)', fontSize: 11,
          animation: i === 0 ? 'fadeSlideIn .3s ease' : undefined,
          transition: 'background .15s',
        }}>
          <span style={{ flex: 1, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.task}</span>
          <span style={{ color: 'var(--text-3)', fontSize: 10, minWidth: 58 }}>{d.agent}</span>
          <span style={{ color: 'var(--border-bright)' }}>picked</span>
          <span style={{ color: 'var(--amber)', fontWeight: 500 }}>{d.win}</span>
          <span style={{ color: 'var(--border-bright)' }}>over</span>
          <span style={{ color: 'var(--text-3)', textDecoration: 'line-through' }}>{d.lose}</span>
          <span style={{ color: 'var(--green)', fontSize: 10, minWidth: 34, textAlign: 'right' }}>{d.score}</span>
          <span style={{ color: 'var(--text-3)', fontSize: 10, minWidth: 40, textAlign: 'right' }}>{d.time}</span>
        </div>
      ))}
    </div>
  )
}
