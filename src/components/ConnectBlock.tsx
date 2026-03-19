'use client'

import { useState } from 'react'

type Tab = 'openrouter' | 'mcp' | 'python' | 'curl'

const LABELS: Record<Tab, string> = {
  openrouter: 'OpenRouter',
  mcp: 'MCP Config',
  python: 'Python',
  curl: 'cURL',
}

export function ConnectBlock() {
  const [tab, setTab] = useState<Tab>('openrouter')
  const [copied, setCopied] = useState(false)

  const plainCode: Record<Tab, string> = {
    openrouter: `import { ToolRoute } from '@toolroute/sdk'
import OpenAI from 'openai'

const tr = new ToolRoute()
const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
})

const rec = await tr.model.route({ task: "parse CSV" })
const res = await openrouter.chat.completions.create({
  model: rec.model_details.provider_model_id,
})`,
    mcp: `{
  "mcpServers": {
    "toolroute": {
      "url": "https://toolroute.io/api/mcp"
    }
  }
}`,
    python: `from toolroute import ToolRoute

tr = ToolRoute()
model = tr.model.route(task="parse CSV file")
tool = tr.route(task="web scraping")`,
    curl: `curl -X POST https://toolroute.io/api/route/model \\
  -H "Content-Type: application/json" \\
  -d '{"task": "parse CSV file"}'`,
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(plainCode[tab])
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{
      width: '100%',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      background: 'var(--bg2)',
      boxShadow: '0 40px 80px rgba(0,0,0,.4)',
    }}>
      {/* Header with tabs */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 18px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg3)',
        flexWrap: 'wrap', gap: 8,
      }}>
        <div style={{ display: 'flex', gap: 2 }}>
          {(['openrouter', 'mcp', 'python', 'curl'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                fontFamily: 'var(--mono)',
                fontSize: 12,
                color: tab === t ? 'var(--amber)' : 'var(--text-3)',
                background: tab === t ? 'var(--amber-dim)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'all .15s',
              }}
            >
              {LABELS[t]}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontFamily: 'var(--mono)', fontSize: 11,
            color: 'var(--green)',
            border: '1px solid var(--green-dim)',
            padding: '3px 10px', borderRadius: 5,
            background: 'var(--green-dim)',
          }}>100% free</span>
          <button
            onClick={handleCopy}
            style={{
              fontFamily: 'var(--mono)', fontSize: 11,
              color: 'var(--text-3)',
              border: '1px solid var(--border)',
              padding: '3px 10px', borderRadius: 5,
              background: 'transparent',
              cursor: 'pointer',
              transition: 'all .15s',
            }}
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Code body */}
      <pre style={{
        padding: '24px 28px',
        fontFamily: 'var(--mono)',
        fontSize: 13,
        lineHeight: 1.85,
        color: '#c9d1d9',
        background: 'var(--code-bg)',
        overflowX: 'auto',
        margin: 0,
        whiteSpace: 'pre',
      }}>
        {plainCode[tab]}
      </pre>
    </div>
  )
}
