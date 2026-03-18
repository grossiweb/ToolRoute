'use client'

import { useState } from 'react'

export function HeroSection() {
  const [activeTab, setActiveTab] = useState<'mcp' | 'python' | 'typescript'>('mcp')
  const [copied, setCopied] = useState(false)

  const codeSnippets = {
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
# → { model: "claude-3-5-sonnet", tier: "fast_code", cost: $0.01 }

# After execution:
tr.model.report(model_slug="claude-3-5-sonnet", outcome="success")`,
    typescript: `import { ToolRoute } from '@toolroute/sdk'

const tr = new ToolRoute()
const model = await tr.model.route({ task: "parse CSV file" })
// → { model: "claude-3-5-sonnet", tier: "fast_code", cost: $0.01 }

// After execution:
await tr.model.report({ model_slug: "claude-3-5-sonnet", outcome_status: "success" })`,
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(codeSnippets[activeTab])
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Problem → Solution */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold mb-5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-600" />
          </span>
          MODEL ROUTING FOR AGENTS
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight mb-5">
          Your agents are calling<br />
          <span className="text-purple-600">the wrong model.</span>
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-6">
          Every task has an optimal model. A simple translation doesn't need GPT-4o.
          A complex architecture review shouldn't use Haiku.
          ToolRoute picks the right model for every task — saving you money and getting better results.
        </p>
        <div className="flex items-center justify-center gap-6 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span>20+ models scored</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand" />
            <span>6 routing tiers</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal" />
            <span>$0 to route</span>
          </div>
        </div>
      </div>

      {/* Connect Your Agent */}
      <div className="border border-gray-200 rounded-xl p-6 bg-white mb-6">
        <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Connect in 30 seconds</h2>
            <p className="text-sm text-gray-500">Add ToolRoute as an MCP server. Your agent gets model routing + tool routing instantly.</p>
          </div>
          <span className="text-[10px] font-semibold text-teal bg-teal-light px-2.5 py-1 rounded-full flex-shrink-0">No API key needed</span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 max-w-sm">
          {(['mcp', 'python', 'typescript'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                activeTab === tab
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-600 hover:text-purple-600'
              }`}
            >
              {tab === 'mcp' ? 'MCP Config' : tab === 'python' ? 'Python' : 'TypeScript'}
            </button>
          ))}
        </div>

        {/* Code block */}
        <div className="relative bg-gray-900 rounded-xl p-5 font-mono text-sm overflow-x-auto">
          <button
            onClick={handleCopy}
            className="absolute top-3 right-3 px-2 py-1 rounded bg-gray-700 text-gray-300 text-xs hover:bg-gray-600 transition-colors"
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>

          {activeTab === 'mcp' ? (
            <pre className="text-gray-300">
              <span className="text-gray-500">{'// Add to claude_desktop_config.json, Cursor, or any MCP client'}</span>{'\n'}
              <span className="text-purple-400">{'{'}</span>{'\n'}
              {'  '}<span className="text-blue-400">&quot;mcpServers&quot;</span>: <span className="text-purple-400">{'{'}</span>{'\n'}
              {'    '}<span className="text-blue-400">&quot;toolroute&quot;</span>: <span className="text-purple-400">{'{'}</span>{'\n'}
              {'      '}<span className="text-blue-400">&quot;url&quot;</span>: <span className="text-green-400">&quot;https://toolroute.io/api/mcp&quot;</span>{'\n'}
              {'    '}<span className="text-purple-400">{'}'}</span>{'\n'}
              {'  '}<span className="text-purple-400">{'}'}</span>{'\n'}
              <span className="text-purple-400">{'}'}</span>{'\n'}
              {'\n'}
              <span className="text-gray-500">{'// 11 tools: model_route, model_report, model_verify, route, report, search, compare, and more'}</span>
            </pre>
          ) : activeTab === 'python' ? (
            <pre className="text-gray-300">
              <span className="text-purple-400">from</span> toolroute <span className="text-purple-400">import</span> ToolRoute{'\n'}
              {'\n'}
              tr = <span className="text-blue-400">ToolRoute</span>(){'\n'}
              model = tr.model.<span className="text-blue-400">route</span>(task=<span className="text-green-400">&quot;parse CSV file&quot;</span>){'\n'}
              <span className="text-gray-500">{'# → { model: "claude-3-5-sonnet", tier: "fast_code", cost: $0.01 }'}</span>{'\n'}
              {'\n'}
              <span className="text-gray-500">{'# After execution:'}</span>{'\n'}
              tr.model.<span className="text-blue-400">report</span>(model_slug=<span className="text-green-400">&quot;claude-3-5-sonnet&quot;</span>, outcome=<span className="text-green-400">&quot;success&quot;</span>)
            </pre>
          ) : (
            <pre className="text-gray-300">
              <span className="text-purple-400">import</span> {'{ ToolRoute }'} <span className="text-purple-400">from</span> <span className="text-green-400">&apos;@toolroute/sdk&apos;</span>{'\n'}
              {'\n'}
              <span className="text-purple-400">const</span> tr = <span className="text-purple-400">new</span> <span className="text-blue-400">ToolRoute</span>(){'\n'}
              <span className="text-purple-400">const</span> model = <span className="text-purple-400">await</span> tr.model.<span className="text-blue-400">route</span>({'{'} task: <span className="text-green-400">&quot;parse CSV file&quot;</span> {'}'}){'\n'}
              <span className="text-gray-500">{'// → { model: "claude-3-5-sonnet", tier: "fast_code", cost: $0.01 }'}</span>{'\n'}
              {'\n'}
              <span className="text-gray-500">{'// After execution:'}</span>{'\n'}
              <span className="text-purple-400">await</span> tr.model.<span className="text-blue-400">report</span>({'{'} model_slug: <span className="text-green-400">&quot;claude-3-5-sonnet&quot;</span>, outcome_status: <span className="text-green-400">&quot;success&quot;</span> {'}'})
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}
