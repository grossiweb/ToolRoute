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
      {/* Headline — the problem */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-light text-brand text-xs font-semibold mb-5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand" />
          </span>
          DECISION ENGINE FOR AI AGENTS
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight mb-4">
          Your agent is using<br />
          <span className="text-brand">the wrong model.</span>
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-2">
          ToolRoute picks the cheapest model that actually works — automatically.
          If it fails, we escalate to a better one. Built for agents, not humans.
        </p>
        <p className="text-sm text-teal font-semibold mb-6">
          100% free. No API key needed.
        </p>

        {/* Works with strip — grayscale logos */}
        <div className="flex items-center justify-center gap-5 md:gap-7 mb-3 flex-wrap">
          <span className="text-xs text-gray-400 font-medium">Works with</span>
          {[
            { name: 'OpenRouter', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M16.778 1.844v1.919q-.569-.026-1.138-.032-.708-.008-1.415.037c-1.93.126-4.023.728-6.149 2.237-2.911 2.066-2.731 1.95-4.14 2.75-.396.223-1.342.574-2.185.798-.841.225-1.753.333-1.751.333v4.229s.768.108 1.61.333c.842.224 1.789.575 2.185.799 1.41.798 1.228.683 4.14 2.75 2.126 1.509 4.22 2.11 6.148 2.236.88.058 1.716.041 2.555.005v1.918l7.222-4.168-7.222-4.17v2.176c-.86.038-1.611.065-2.278.021-1.364-.09-2.417-.357-3.979-1.465-2.244-1.593-2.866-2.027-3.68-2.508.889-.518 1.449-.906 3.822-2.59 1.56-1.109 2.614-1.377 3.978-1.466.667-.044 1.418-.017 2.278.02v2.176L24 6.014Z"/></svg> },
            { name: 'LiteLLM', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> },
            { name: 'Claude Code', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.3041 3.541h-3.6718l6.696 16.918H24Zm-10.6082 0L0 20.459h3.7442l1.3693-3.5527h7.0052l1.3693 3.5528h3.7442L10.5363 3.5409Zm-.3712 10.2232 2.2914-5.9456 2.2914 5.9456Z"/></svg> },
            { name: 'Cursor', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M11.503.131 1.891 5.678a.84.84 0 0 0-.42.726v11.188c0 .3.162.575.42.724l9.609 5.55a1 1 0 0 0 .998 0l9.61-5.55a.84.84 0 0 0 .42-.724V6.404a.84.84 0 0 0-.42-.726L12.497.131a1.01 1.01 0 0 0-.996 0M2.657 6.338h18.55c.263 0 .43.287.297.515L12.23 22.918c-.062.107-.229.064-.229-.06V12.335a.59.59 0 0 0-.295-.51l-9.11-5.257c-.109-.063-.064-.23.061-.23"/></svg> },
            { name: 'Windsurf', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M23.55 5.067c-1.2038-.002-2.1806.973-2.1806 2.1765v4.8676c0 .972-.8035 1.7594-1.7597 1.7594-.568 0-1.1352-.286-1.4718-.7659l-4.9713-7.1003c-.4125-.5896-1.0837-.941-1.8103-.941-1.1334 0-2.1533.9635-2.1533 2.153v4.8957c0 .972-.7969 1.7594-1.7596 1.7594-.57 0-1.1363-.286-1.4728-.7658L.4076 5.1598C.2822 4.9798 0 5.0688 0 5.2882v4.2452c0 .2147.0656.4228.1884.599l5.4748 7.8183c.3234.462.8006.8052 1.3509.9298 1.3771.313 2.6446-.747 2.6446-2.0977v-4.893c0-.972.7875-1.7593 1.7596-1.7593h.003a1.798 1.798 0 0 1 1.4718.7658l4.9723 7.0994c.4135.5905 1.05.941 1.8093.941 1.1587 0 2.1515-.9645 2.1515-2.153v-4.8948c0-.972.7875-1.7594 1.7596-1.7594h.194a.22.22 0 0 0 .2204-.2202v-4.622a.22.22 0 0 0-.2203-.2203Z"/></svg> },
            { name: 'Replit', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M2 1.5A1.5 1.5 0 0 1 3.5 0h7A1.5 1.5 0 0 1 12 1.5V8H3.5A1.5 1.5 0 0 1 2 6.5ZM12 8h8.5A1.5 1.5 0 0 1 22 9.5v5a1.5 1.5 0 0 1-1.5 1.5H12ZM2 17.5A1.5 1.5 0 0 1 3.5 16H12v6.5a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 2 22.5Z"/></svg> },
            { name: 'Lovable', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg> },
            { name: 'v0', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="m12 1.608 12 20.784H0Z"/></svg> },
          ].map((tool) => (
            <div key={tool.name} className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 transition-colors">
              {tool.icon}
              <span className="text-xs font-semibold">{tool.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Connect Your Agent — code snippets */}
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
                  ? 'bg-brand text-white'
                  : 'text-gray-600 hover:text-brand'
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
