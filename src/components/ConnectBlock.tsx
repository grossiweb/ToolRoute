'use client'

import { useState } from 'react'

type Tab = 'openrouter' | 'mcp' | 'python' | 'curl'

const LABELS: Record<Tab, string> = {
  openrouter: 'OpenRouter',
  mcp: 'MCP Config',
  python: 'Python',
  curl: 'cURL',
}

/* Style helpers for syntax highlighting */
const ck = { color: '#c678dd' }  // keywords (import, const, await, new)
const cs = { color: '#98c379' }  // strings
const cc = { color: '#5c6370', fontStyle: 'italic' as const }  // comments
const cp = { color: '#e5c07b' }  // properties/identifiers
const co = { color: '#f59e0b' }  // output/result values

export function ConnectBlock() {
  const [tab, setTab] = useState<Tab>('openrouter')
  const [copied, setCopied] = useState(false)

  const plainCode: Record<Tab, string> = {
    openrouter: `// ToolRoute picks the model → you call it via OpenRouter
import { ToolRoute } from '@toolroute/sdk'
import OpenAI from 'openai'

const tr = new ToolRoute()
const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY
})

// 1. Ask ToolRoute which model + tool to use
const rec = await tr.route({ task: "parse CSV" })
// → { model: "haiku-3.5", tool: "csv-parser-mcp", cost: "$0.001", confidence: 0.94 }

// 2. Call via OpenRouter with the recommendation
const res = await openrouter.chat.completions.create({
  model: rec.model_details.provider_model_id
})`,
    mcp: `// SSE transport — works with Claude Desktop, Cursor, Windsurf
{
  "mcpServers": {
    "toolroute": {
      "url": "https://toolroute.io/api/mcp"
    }
  }
}
// Paste into your MCP config. Supports SSE + HTTP POST.`,
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

  /* Syntax-highlighted JSX for each tab */
  const highlightedCode: Record<Tab, JSX.Element> = {
    openrouter: (
      <>
        <span style={cc}>{'// ToolRoute picks the model → you call it via OpenRouter'}</span>{'\n'}
        <span style={ck}>import</span>{' { ToolRoute } '}<span style={ck}>from</span>{' '}<span style={cs}>&apos;@toolroute/sdk&apos;</span>{'\n'}
        <span style={ck}>import</span>{' OpenAI '}<span style={ck}>from</span>{' '}<span style={cs}>&apos;openai&apos;</span>{'\n'}
        {'\n'}
        <span style={ck}>const</span>{' tr = '}<span style={ck}>new</span>{' ToolRoute()\n'}
        <span style={ck}>const</span>{' openrouter = '}<span style={ck}>new</span>{' OpenAI({\n'}
        {'  baseURL: '}<span style={cs}>&quot;https://openrouter.ai/api/v1&quot;</span>{',\n'}
        {'  apiKey: process.env.'}<span style={cp}>OPENROUTER_API_KEY</span>{'\n'}
        {'})\n'}
        {'\n'}
        <span style={cc}>{'// 1. Ask ToolRoute which model + tool to use'}</span>{'\n'}
        <span style={ck}>const</span>{' rec = '}<span style={ck}>await</span>{' tr.route({ task: '}<span style={cs}>&quot;parse CSV&quot;</span>{' })\n'}
        <span style={cc}>{'// → '}<span style={co}>{'{ model: "haiku-3.5", tool: "csv-parser-mcp", cost: "$0.001", confidence: 0.94 }'}</span></span>{'\n'}
        {'\n'}
        <span style={cc}>{'// 2. Call via OpenRouter with the recommendation'}</span>{'\n'}
        <span style={ck}>const</span>{' res = '}<span style={ck}>await</span>{' openrouter.chat.completions.create({\n'}
        {'  model: rec.'}<span style={cp}>model_details</span>{'.'}<span style={cp}>provider_model_id</span>{'\n'}
        {'})'}
        <span style={{ animation: 'blink 1s step-end infinite', color: 'var(--amber)' }}>█</span>
      </>
    ),
    mcp: (
      <>
        {'{\n'}
        {'  '}<span style={cs}>&quot;mcpServers&quot;</span>{': {\n'}
        {'    '}<span style={cs}>&quot;toolroute&quot;</span>{': {\n'}
        {'      '}<span style={cs}>&quot;url&quot;</span>{': '}<span style={cs}>&quot;https://toolroute.io/api/mcp&quot;</span>{'\n'}
        {'    }\n'}
        {'  }\n'}
        {'}'}
      </>
    ),
    python: (
      <>
        <span style={ck}>from</span>{' toolroute '}<span style={ck}>import</span>{' ToolRoute\n'}
        {'\n'}
        {'tr = ToolRoute()\n'}
        {'model = tr.model.route(task='}<span style={cs}>&quot;parse CSV file&quot;</span>{')\n'}
        {'tool = tr.route(task='}<span style={cs}>&quot;web scraping&quot;</span>{')'}
      </>
    ),
    curl: (
      <>
        {'curl -X POST '}<span style={cs}>https://toolroute.io/api/route/model</span>{' \\\n'}
        {'  -H '}<span style={cs}>&quot;Content-Type: application/json&quot;</span>{' \\\n'}
        {'  -d '}<span style={cs}>&apos;{'{"task": "parse CSV file"}'}&apos;</span>
      </>
    ),
  }

  return (
    <div style={{
      width: '100%', maxWidth: '100%', minWidth: 0,
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      background: 'var(--bg2)',
      boxShadow: '0 40px 80px rgba(0,0,0,.4)',
      boxSizing: 'border-box',
    }}>
      {/* Header with tabs */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg3)',
        flexWrap: 'wrap', gap: 6,
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

      {/* Code body — syntax highlighted */}
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
        maxWidth: '100%',
        boxSizing: 'border-box',
      }}>
        {highlightedCode[tab]}
      </pre>
    </div>
  )
}
