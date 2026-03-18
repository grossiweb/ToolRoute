'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export function HeroSection() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [activeTab, setActiveTab] = useState<'mcp' | 'python' | 'typescript'>('mcp')
  const [copied, setCopied] = useState(false)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams(searchParams.toString())
    if (query) {
      params.set('q', query)
    } else {
      params.delete('q')
    }
    router.push(`/servers?${params.toString()}`)
  }

  const codeSnippets = {
    mcp: `{
  "mcpServers": {
    "toolroute": {
      "url": "https://toolroute.io/api/mcp"
    }
  }
}`,
    python: `from toolroute import route

result = route(
  task="research competitors",
  priority="best_value"
)
print(result)
# → { recommended: "firecrawl-mcp", confidence: 0.82 }`,
    typescript: `import { ToolRoute } from '@toolroute/sdk'

const tr = new ToolRoute()
const result = await tr.route({
  task: "research competitors",
  priority: "best_value"
})
// → { recommended: "firecrawl-mcp", confidence: 0.82 }`,
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(codeSnippets[activeTab])
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Headline */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-light text-teal text-xs font-semibold mb-4">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal" />
          </span>
          BUILT FOR AGENTS
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight mb-4">
          Intelligent Routing<br />
          <span className="text-brand">for AI Tools & Models</span>
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
          Your agent queries ToolRoute to find which MCP server and LLM model will actually work best.
          One API call. Real execution data. No guessing.
        </p>
      </div>

      {/* Connect Your Agent — primary CTA */}
      <div className="border-2 border-brand/30 rounded-xl p-6 bg-white mb-8">
        <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Connect Your Agent in 30 Seconds</h2>
            <p className="text-sm text-gray-500">Add ToolRoute as an MCP server — your agent gets tool routing + model routing instantly</p>
          </div>
          <span className="badge bg-teal-light text-teal text-[10px] flex-shrink-0">No API key needed</span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 max-w-sm">
          {(['mcp', 'python', 'typescript'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                activeTab === tab
                  ? 'bg-brand text-white'
                  : 'text-gray-600 hover:text-brand'
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
              <span className="text-gray-500">{'// Your agent now has 10 tools: route, search, compare, missions, report, register, challenges, challenge_submit, model_route, model_report'}</span>
            </pre>
          ) : activeTab === 'python' ? (
            <pre className="text-gray-300">
              <span className="text-purple-400">from</span> toolroute <span className="text-purple-400">import</span> route{'\n'}
              {'\n'}
              result = <span className="text-blue-400">route</span>({'\n'}
              {'  '}task=<span className="text-green-400">&quot;research competitors&quot;</span>,{'\n'}
              {'  '}priority=<span className="text-green-400">&quot;best_value&quot;</span>{'\n'}
              ){'\n'}
              {'\n'}
              <span className="text-blue-400">print</span>(result){'\n'}
              <span className="text-gray-500">{`# → { recommended: "firecrawl-mcp", confidence: 0.82, fallback: "exa-mcp" }`}</span>
            </pre>
          ) : (
            <pre className="text-gray-300">
              <span className="text-purple-400">import</span> {'{ ToolRoute }'} <span className="text-purple-400">from</span> <span className="text-green-400">&apos;@toolroute/sdk&apos;</span>{'\n'}
              {'\n'}
              <span className="text-purple-400">const</span> tr = <span className="text-purple-400">new</span> <span className="text-blue-400">ToolRoute</span>(){'\n'}
              <span className="text-purple-400">const</span> result = <span className="text-purple-400">await</span> tr.<span className="text-blue-400">route</span>({'{'}
              {'\n'}{'  '}task: <span className="text-green-400">&quot;research competitors&quot;</span>,{'\n'}
              {'  '}priority: <span className="text-green-400">&quot;best_value&quot;</span>{'\n'}
              {'}'}){'\n'}
              {'\n'}
              <span className="text-gray-500">{`// → { recommended: "firecrawl-mcp", confidence: 0.82, fallback: "exa-mcp" }`}</span>
            </pre>
          )}
        </div>

        {/* What your agent gets */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="flex items-center gap-2 text-gray-600">
            <span className="text-teal font-bold">✓</span>
            <span>Confidence-scored recommendations</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <span className="text-teal font-bold">✓</span>
            <span>Automatic fallback chains</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <span className="text-teal font-bold">✓</span>
            <span>Real benchmark data, not vibes</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 max-w-xl mx-auto mb-10">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search MCP servers, e.g. web scraping, GitHub, database..."
          className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-sm"
        />
        <button type="submit" className="btn-primary px-6 py-3 text-base">
          Search
        </button>
      </form>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-2xl font-black text-brand">100+</div>
          <div className="text-xs text-gray-500">MCP Servers Scored</div>
        </div>
        <div className="text-center bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-2xl font-black text-teal">18</div>
          <div className="text-xs text-gray-500">Tool Categories</div>
        </div>
        <div className="text-center bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-2xl font-black text-gray-900">5</div>
          <div className="text-xs text-gray-500">Score Dimensions</div>
        </div>
      </div>
    </div>
  )
}
