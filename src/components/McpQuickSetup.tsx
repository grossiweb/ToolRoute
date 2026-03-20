'use client'

import { useState } from 'react'

const MCP_CONFIG = `{
  "mcpServers": {
    "toolroute": {
      "url": "https://toolroute.io/api/mcp"
    }
  }
}`

const JSONRPC_EXAMPLE = `curl -X POST https://toolroute.io/api/mcp \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "toolroute_register",
      "arguments": { "agent_name": "my-agent" }
    }
  }'`

type Tab = 'sse' | 'http'

export function McpQuickSetup() {
  const [tab, setTab] = useState<Tab>('sse')
  const [copied, setCopied] = useState(false)

  const code = tab === 'sse' ? MCP_CONFIG : JSONRPC_EXAMPLE

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{
      background: 'var(--bg2)',
      border: '2px solid var(--amber)',
      borderRadius: 16,
      padding: 24,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle glow */}
      <div style={{
        position: 'absolute',
        top: -40,
        right: -40,
        width: 120,
        height: 120,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'rgba(245,158,11,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16,
        }}>
          {'\u26A1'}
        </div>
        <h2 style={{
          fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0,
        }}>
          Add to your agent in 10 seconds
        </h2>
      </div>

      <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16, lineHeight: 1.5 }}>
        ToolRoute is an MCP server. Paste this config and your agent gets 16 tools for routing, missions, and credit tracking. No API key needed.
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 0 }}>
        {(['sse', 'http'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setCopied(false) }}
            style={{
              padding: '8px 16px',
              fontFamily: 'var(--mono)',
              fontSize: 11,
              fontWeight: tab === t ? 700 : 500,
              color: tab === t ? 'var(--amber)' : 'var(--text-3)',
              background: tab === t ? 'rgba(245,158,11,0.08)' : 'transparent',
              border: 'none',
              borderBottom: tab === t ? '2px solid var(--amber)' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all .15s',
            }}
          >
            {t === 'sse' ? 'SSE Config (Claude, Cursor)' : 'Direct HTTP'}
          </button>
        ))}
      </div>

      {/* Code + Copy */}
      <div style={{ position: 'relative' }}>
        <pre style={{
          background: '#0d1117',
          color: '#c9d1d9',
          borderRadius: '0 8px 8px 8px',
          padding: 16,
          fontSize: 13,
          fontFamily: 'var(--mono)',
          overflowX: 'auto',
          margin: 0,
          lineHeight: 1.6,
        }}>
          {code}
        </pre>
        <button
          onClick={handleCopy}
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            background: copied ? 'rgba(34,197,94,0.2)' : 'var(--amber)',
            color: copied ? '#22c55e' : '#000',
            border: 'none',
            borderRadius: 8,
            padding: '6px 14px',
            fontSize: 12,
            fontFamily: 'var(--mono)',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all .15s',
          }}
        >
          {copied ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>

      {/* Next step hint */}
      <div style={{
        marginTop: 12,
        padding: '10px 14px',
        background: 'rgba(245,158,11,0.06)',
        borderRadius: 8,
        fontSize: 12,
        fontFamily: 'var(--mono)',
        color: 'var(--text-2)',
        lineHeight: 1.5,
      }}>
        Then call <strong style={{ color: 'var(--amber)' }}>toolroute_register</strong> as your first tool to get an agent identity and start earning credits.
      </div>
    </div>
  )
}
