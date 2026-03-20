'use client'

import { useState } from 'react'

export function LiveTryIt() {
  const [task, setTask] = useState('scrape competitor pricing data')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = task.trim()
    if (!trimmed || loading) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || `Error ${res.status}`)
      } else {
        setResult(data)
      }
    } catch {
      setError('Failed to connect. The API may be unavailable locally without environment variables.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (!result) return
    navigator.clipboard.writeText(JSON.stringify(result, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, width: '100%' }}>
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex', alignItems: 'center',
          background: 'var(--bg3)', border: '1px solid var(--border-bright)',
          borderRadius: result || loading || error ? '10px 10px 0 0' : 10,
          overflow: 'hidden',
        }}
      >
        <span style={{
          fontFamily: 'var(--mono)', fontSize: 11,
          color: 'var(--text-3)', padding: '10px 0 10px 12px', whiteSpace: 'nowrap',
        }}>
          POST /api/route
        </span>
        <input
          value={task}
          onChange={(e) => setTask(e.target.value)}
          spellCheck={false}
          autoComplete="off"
          placeholder="describe your task..."
          style={{
            background: 'transparent', border: 'none', outline: 'none',
            fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--amber)',
            padding: '10px 6px', flex: 1, minWidth: 60,
          }}
        />
        <button
          type="submit"
          disabled={loading || !task.trim()}
          style={{
            background: loading ? 'var(--text-3)' : 'var(--amber)',
            color: '#000', border: 'none',
            padding: '10px 16px', fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600,
            cursor: loading ? 'wait' : 'pointer', whiteSpace: 'nowrap',
            opacity: !task.trim() ? 0.5 : 1,
          }}
        >
          {loading ? 'Routing...' : '\u21B5 Run'}
        </button>
      </form>

      {/* Result */}
      {loading && (
        <div style={{
          background: '#0d1117',
          borderRadius: '0 0 10px 10px',
          border: '1px solid var(--border-bright)',
          borderTop: 'none',
          padding: 16,
          fontFamily: 'var(--mono)',
          fontSize: 12,
          color: 'var(--text-3)',
        }}>
          <span style={{ animation: 'pulse 1.5s infinite', display: 'inline-block' }}>
            Finding the best MCP server and LLM model...
          </span>
          <style>{`@keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
        </div>
      )}

      {error && (
        <div style={{
          background: '#0d1117',
          borderRadius: '0 0 10px 10px',
          border: '1px solid var(--border-bright)',
          borderTop: 'none',
          padding: 16,
          fontFamily: 'var(--mono)',
          fontSize: 12,
          color: '#f87171',
        }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ position: 'relative' }}>
          <pre style={{
            background: '#0d1117',
            color: '#c9d1d9',
            borderRadius: '0 0 10px 10px',
            border: '1px solid var(--border-bright)',
            borderTop: 'none',
            padding: 16,
            fontSize: 11,
            fontFamily: 'var(--mono)',
            overflowX: 'auto',
            margin: 0,
            maxHeight: 300,
            lineHeight: 1.5,
          }}>
            {JSON.stringify(result, null, 2)}
          </pre>
          <button
            onClick={handleCopy}
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              background: copied ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.08)',
              border: `1px solid ${copied ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.15)'}`,
              borderRadius: 6,
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: 10,
              fontFamily: 'var(--mono)',
              color: copied ? '#22c55e' : '#9ca3af',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      )}
    </div>
  )
}
