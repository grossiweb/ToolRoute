'use client'

import { useState } from 'react'

type TabKey = 'mcp' | 'openrouter' | 'python' | 'curl'

export function HeroSection() {
  const [activeTab, setActiveTab] = useState<TabKey>('mcp')
  const [copied, setCopied] = useState(false)

  const codeSnippets: Record<TabKey, string> = {
    mcp: `{
  "mcpServers": {
    "toolroute": {
      "url": "https://toolroute.io/api/mcp"
    }
  }
}`,
    openrouter: `import { ToolRoute } from '@toolroute/sdk'
import OpenAI from 'openai'

const tr = new ToolRoute()
const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
})

// Ask ToolRoute which model to use
const rec = await tr.model.route({ task: "parse CSV file" })
// → { model: "claude-3-5-sonnet", provider_model_id: "anthropic/claude-3.5-sonnet" }

// Call via OpenRouter with the recommended model
const result = await openrouter.chat.completions.create({
  model: rec.model_details.provider_model_id,
  messages: [{ role: "user", content: "Parse this CSV..." }],
})

// Report outcome — improves routing for everyone
await tr.model.report({ model_slug: rec.model_details.slug, outcome_status: "success" })`,
    python: `from toolroute import ToolRoute

tr = ToolRoute()

# Which model should I use?
model = tr.model.route(task="parse CSV file")
# → { model: "claude-3-5-sonnet", tier: "fast_code", cost: $0.01 }

# Which tool should I use?
tool = tr.route(task="web scraping")
# → { skill: "firecrawl-mcp", confidence: 0.87, fallback: "exa-mcp" }`,
    curl: `# Which model should I use?
curl -X POST https://toolroute.io/api/route/model \\
  -H "Content-Type: application/json" \\
  -d '{"task": "parse CSV file"}'

# Which tool should I use?
curl -X POST https://toolroute.io/api/route \\
  -H "Content-Type: application/json" \\
  -d '{"task": "web scraping"}'`,
  }

  const tabLabels: Record<TabKey, string> = {
    mcp: 'MCP Config',
    openrouter: 'OpenRouter',
    python: 'Python',
    curl: 'cURL',
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
          FREE FOR ALL AGENTS
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight mb-5">
          Stop overspending<br />
          <span className="text-purple-600">on LLM tokens.</span>
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-8">
          Your agents are using the same expensive model for every task.
          ToolRoute picks the right model and the right tool for each step — cutting costs while improving results. Works with OpenRouter, LiteLLM, and any MCP client.
        </p>

        {/* Works with strip */}
        <div className="flex items-center justify-center gap-3 mb-4 flex-wrap">
          <span className="text-xs text-gray-400 font-medium">Works with</span>
          <div className="flex items-center gap-3 flex-wrap">
            {[
              { name: 'OpenRouter', color: 'text-purple-600 bg-purple-50' },
              { name: 'LiteLLM', color: 'text-blue-600 bg-blue-50' },
              { name: 'Claude Code', color: 'text-orange-600 bg-orange-50' },
              { name: 'Cursor', color: 'text-gray-700 bg-gray-100' },
              { name: 'Replit', color: 'text-orange-500 bg-orange-50' },
              { name: 'Windsurf', color: 'text-teal bg-teal-light' },
            ].map((tool) => (
              <span
                key={tool.name}
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${tool.color}`}
              >
                {tool.name}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center gap-6 text-sm text-gray-400 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span>20+ LLM models</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand" />
            <span>50+ MCP servers</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal" />
            <span>100% free</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>No API key needed</span>
          </div>
        </div>
      </div>

      {/* Connect Your Agent */}
      <div className="border border-gray-200 rounded-xl p-6 bg-white mb-6">
        <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Connect in 30 seconds</h2>
            <p className="text-sm text-gray-500">Add as an MCP server, drop into your OpenRouter workflow, or call the API directly.</p>
          </div>
          <span className="text-[10px] font-semibold text-teal bg-teal-light px-2.5 py-1 rounded-full flex-shrink-0">100% free</span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 max-w-md">
          {(['mcp', 'openrouter', 'python', 'curl'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                activeTab === tab
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-600 hover:text-purple-600'
              }`}
            >
              {tabLabels[tab]}
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
              <span className="text-gray-500">{'// Works with Claude Code, Cursor, Windsurf, Replit, or any MCP client'}</span>{'\n'}
              <span className="text-purple-400">{'{'}</span>{'\n'}
              {'  '}<span className="text-blue-400">&quot;mcpServers&quot;</span>: <span className="text-purple-400">{'{'}</span>{'\n'}
              {'    '}<span className="text-blue-400">&quot;toolroute&quot;</span>: <span className="text-purple-400">{'{'}</span>{'\n'}
              {'      '}<span className="text-blue-400">&quot;url&quot;</span>: <span className="text-green-400">&quot;https://toolroute.io/api/mcp&quot;</span>{'\n'}
              {'    '}<span className="text-purple-400">{'}'}</span>{'\n'}
              {'  '}<span className="text-purple-400">{'}'}</span>{'\n'}
              <span className="text-purple-400">{'}'}</span>{'\n'}
              {'\n'}
              <span className="text-gray-500">{'// Your agent gets 11 tools: model_route, model_report, model_verify, route, and more'}</span>{'\n'}
              <span className="text-gray-500">{'// Zero config. Just paste this and start routing.'}</span>
            </pre>
          ) : activeTab === 'openrouter' ? (
            <pre className="text-gray-300">
              <span className="text-gray-500">{'// ToolRoute picks the model → you call it via OpenRouter'}</span>{'\n'}
              <span className="text-purple-400">import</span> {'{ ToolRoute }'} <span className="text-purple-400">from</span> <span className="text-green-400">&apos;@toolroute/sdk&apos;</span>{'\n'}
              <span className="text-purple-400">import</span> OpenAI <span className="text-purple-400">from</span> <span className="text-green-400">&apos;openai&apos;</span>{'\n'}
              {'\n'}
              <span className="text-purple-400">const</span> tr = <span className="text-purple-400">new</span> <span className="text-blue-400">ToolRoute</span>(){'\n'}
              <span className="text-purple-400">const</span> openrouter = <span className="text-purple-400">new</span> <span className="text-blue-400">OpenAI</span>({'{'}
              {'\n'}{'  '}baseURL: <span className="text-green-400">&quot;https://openrouter.ai/api/v1&quot;</span>,
              {'\n'}{'  '}apiKey: process.env.OPENROUTER_API_KEY,
              {'\n'}{'}'}){'\n'}
              {'\n'}
              <span className="text-gray-500">{'// 1. Ask ToolRoute which model to use'}</span>{'\n'}
              <span className="text-purple-400">const</span> rec = <span className="text-purple-400">await</span> tr.model.<span className="text-blue-400">route</span>({'{'} task: <span className="text-green-400">&quot;parse CSV&quot;</span> {'}'}){'\n'}
              {'\n'}
              <span className="text-gray-500">{'// 2. Call via OpenRouter with the recommended model'}</span>{'\n'}
              <span className="text-purple-400">const</span> res = <span className="text-purple-400">await</span> openrouter.chat.completions.<span className="text-blue-400">create</span>({'{'}
              {'\n'}{'  '}model: rec.model_details.provider_model_id,
              {'\n'}{'  '}messages: [{'{'} role: <span className="text-green-400">&quot;user&quot;</span>, content: <span className="text-green-400">&quot;Parse this CSV...&quot;</span> {'}'}],
              {'\n'}{'}'}){'\n'}
              {'\n'}
              <span className="text-gray-500">{'// 3. Report outcome → improves routing for everyone'}</span>{'\n'}
              <span className="text-purple-400">await</span> tr.model.<span className="text-blue-400">report</span>({'{'} model_slug: rec.model_details.slug, outcome_status: <span className="text-green-400">&quot;success&quot;</span> {'}'})
            </pre>
          ) : activeTab === 'python' ? (
            <pre className="text-gray-300">
              <span className="text-purple-400">from</span> toolroute <span className="text-purple-400">import</span> ToolRoute{'\n'}
              {'\n'}
              tr = <span className="text-blue-400">ToolRoute</span>(){'\n'}
              {'\n'}
              <span className="text-gray-500">{'# Which model should I use?'}</span>{'\n'}
              model = tr.model.<span className="text-blue-400">route</span>(task=<span className="text-green-400">&quot;parse CSV file&quot;</span>){'\n'}
              <span className="text-gray-500">{'# → { model: "claude-3-5-sonnet", tier: "fast_code", cost: $0.01 }'}</span>{'\n'}
              {'\n'}
              <span className="text-gray-500">{'# Which tool should I use?'}</span>{'\n'}
              tool = tr.<span className="text-blue-400">route</span>(task=<span className="text-green-400">&quot;web scraping&quot;</span>){'\n'}
              <span className="text-gray-500">{'# → { skill: "firecrawl-mcp", confidence: 0.87, fallback: "exa-mcp" }'}</span>{'\n'}
              {'\n'}
              <span className="text-gray-500">{'# Works with OpenRouter, LiteLLM, or direct API calls'}</span>
            </pre>
          ) : (
            <pre className="text-gray-300">
              <span className="text-gray-500">{'# Which model should I use?'}</span>{'\n'}
              curl -X POST https://toolroute.io/api/route/model \{'\n'}
              {'  '}-H <span className="text-green-400">&quot;Content-Type: application/json&quot;</span> \{'\n'}
              {'  '}-d <span className="text-green-400">&apos;{'{"task": "parse CSV file"}'}&apos;</span>{'\n'}
              {'\n'}
              <span className="text-gray-500">{'# Which tool should I use?'}</span>{'\n'}
              curl -X POST https://toolroute.io/api/route \{'\n'}
              {'  '}-H <span className="text-green-400">&quot;Content-Type: application/json&quot;</span> \{'\n'}
              {'  '}-d <span className="text-green-400">&apos;{'{"task": "web scraping"}'}&apos;</span>{'\n'}
              {'\n'}
              <span className="text-gray-500">{'# Use the recommended model with OpenRouter, LiteLLM, or any provider'}</span>
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}
