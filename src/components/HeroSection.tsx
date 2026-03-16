'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export function HeroSection() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [activeTab, setActiveTab] = useState<'python' | 'typescript'>('python')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams(searchParams.toString())
    if (query) {
      params.set('q', query)
    } else {
      params.delete('q')
    }
    router.push(`/?${params.toString()}`)
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Headline */}
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight mb-4">
          ToolRoute — The Routing Engine<br />
          <span className="text-brand">for AI Tools</span>
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
          Agents query ToolRoute to decide which MCP server will actually work best for a task.
          Powered by real execution benchmarks, outcome scoring, and agent telemetry.
        </p>
      </div>

      {/* Code example block */}
      <div className="bg-gray-900 rounded-xl p-6 font-mono text-sm mb-6 overflow-x-auto">
        <div className="text-gray-400 mb-1">POST /api/route</div>
        <div className="text-gray-300">task: <span className="text-green-400">&quot;extract pricing from competitor websites&quot;</span></div>
        <div className="text-gray-300 mb-3">priority: <span className="text-green-400">&quot;best_value&quot;</span></div>
        <div className="text-brand-light">{`→ recommended: firecrawl-mcp`}</div>
        <div className="text-brand-light">{`  confidence: 0.82`}</div>
        <div className="text-brand-light">{`  fallback: exa-mcp`}</div>
      </div>

      {/* Usage stats banner */}
      <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-10">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-teal" />
        </span>
        <span>ToolRoute is currently powering <strong className="text-gray-700">4,200+</strong> tool decisions across <strong className="text-gray-700">87 agents</strong></span>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 max-w-xl mx-auto mb-12">
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

      {/* Start Routing in 30 Seconds */}
      <div className="border border-gray-200 rounded-xl p-6 bg-white">
        <h2 className="text-lg font-bold text-gray-900 mb-4 text-center">
          Start Routing in 30 Seconds
        </h2>

        {/* Language tabs */}
        <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 max-w-xs mx-auto">
          <button
            onClick={() => setActiveTab('python')}
            className={`flex-1 px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              activeTab === 'python'
                ? 'bg-brand text-white'
                : 'text-gray-600 hover:text-brand'
            }`}
          >
            Python
          </button>
          <button
            onClick={() => setActiveTab('typescript')}
            className={`flex-1 px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              activeTab === 'typescript'
                ? 'bg-brand text-white'
                : 'text-gray-600 hover:text-brand'
            }`}
          >
            TypeScript
          </button>
        </div>

        {/* Code blocks */}
        <div className="bg-gray-900 rounded-xl p-5 font-mono text-sm overflow-x-auto">
          {activeTab === 'python' ? (
            <pre className="text-gray-300">
              <span className="text-purple-400">from</span> toolroute <span className="text-purple-400">import</span> route{'\n'}
              {'\n'}
              skill = <span className="text-blue-400">route</span>({'\n'}
              {'  '}task=<span className="text-green-400">&quot;research competitors&quot;</span>,{'\n'}
              {'  '}priority=<span className="text-green-400">&quot;best_value&quot;</span>{'\n'}
              ){'\n'}
              {'\n'}
              <span className="text-blue-400">print</span>(skill){'\n'}
              <span className="text-gray-500">{`# → { recommended: "firecrawl-mcp", confidence: 0.82 }`}</span>
            </pre>
          ) : (
            <pre className="text-gray-300">
              <span className="text-purple-400">import</span> {'{ ToolRoute }'} <span className="text-purple-400">from</span> <span className="text-green-400">&apos;@toolroute/sdk&apos;</span>{'\n'}
              {'\n'}
              <span className="text-purple-400">const</span> neo = <span className="text-purple-400">new</span> <span className="text-blue-400">ToolRoute</span>(){'\n'}
              <span className="text-purple-400">const</span> result = <span className="text-purple-400">await</span> neo.<span className="text-blue-400">route</span>({'{'}
              {'\n'}{'  '}task: <span className="text-green-400">&quot;research competitors&quot;</span>,{'\n'}
              {'  '}priority: <span className="text-green-400">&quot;best_value&quot;</span>{'\n'}
              {'}'})
              {'\n'}
              <span className="text-gray-500">{`// → { recommended: "firecrawl-mcp", confidence: 0.82 }`}</span>
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}
