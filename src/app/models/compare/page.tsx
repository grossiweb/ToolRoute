'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Model {
  slug: string
  display_name: string
  provider: string
  context_window: number
  input_cost_per_mtok: number
  output_cost_per_mtok: number
  supports_tools: boolean
  supports_structured_output: boolean
  supports_vision: boolean
  tiers: string[]
  outcomes: number
  avg_quality: number | null
  avg_latency: number | null
}

const PROVIDER_COLORS: Record<string, string> = {
  anthropic: 'bg-amber-50 text-amber-700',
  openai: 'bg-emerald-50 text-emerald-700',
  google: 'bg-blue-50 text-blue-700',
  mistral: 'bg-orange-50 text-orange-700',
  deepseek: 'bg-brand-light text-brand',
  meta: 'bg-indigo-50 text-indigo-700',
}

const TIER_COLORS: Record<string, string> = {
  cheap_chat: 'bg-green-50 text-green-700',
  cheap_structured: 'bg-blue-50 text-blue-700',
  fast_code: 'bg-brand-light text-brand',
  reasoning_pro: 'bg-amber-50 text-amber-700',
  tool_agent: 'bg-teal-50 text-teal-700',
  best_available: 'bg-red-50 text-red-700',
}

export default function ModelComparePage() {
  const [models, setModels] = useState<Model[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Read initial selection from URL
    const params = new URLSearchParams(window.location.search)
    const initial = params.get('models')?.split(',').filter(Boolean) || []
    if (initial.length > 0) setSelected(initial)

    // Fetch models via the API
    fetch('/api/route/model')
      .then(res => res.json())
      .then(data => {
        if (data.tiers) {
          // GET response — extract model info from tier descriptions
          // Fall back to fetching from the models page data
        }
      })
      .catch(() => {})

    // Fetch model data from Supabase via a lightweight endpoint
    fetch('/.well-known')
      .then(res => res.json())
      .then(() => {
        // Use the models page's server data by fetching it
        return fetch('/models')
      })
      .then(res => res.text())
      .then(html => {
        // Extract __NEXT_DATA__ from the HTML
        const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
        if (match) {
          try {
            const data = JSON.parse(match[1])
            const pageProps = data?.props?.pageProps
            // If ISR data is available, use it
            if (pageProps?.models) {
              setModels(pageProps.models)
              setLoading(false)
              return
            }
          } catch { /* fall through */ }
        }
        // Fallback: use hardcoded model data from the registry
        setModels(FALLBACK_MODELS)
        setLoading(false)
      })
      .catch(() => {
        setModels(FALLBACK_MODELS)
        setLoading(false)
      })
  }, [])

  const toggleModel = (slug: string) => {
    setSelected(prev => {
      if (prev.includes(slug)) return prev.filter(s => s !== slug)
      if (prev.length >= 4) return prev // Max 4
      return [...prev, slug]
    })
  }

  const compared = models.filter(m => selected.includes(m.slug))

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/models" className="hover:text-brand transition-colors">Models</Link>
        <span>/</span>
        <span className="text-gray-600">Compare</span>
      </div>

      <h1 className="text-3xl font-black text-gray-900 mb-2">Compare Models</h1>
      <p className="text-gray-500 mb-8">Select up to 4 models to compare side-by-side.</p>

      {/* Model Selector */}
      <div className="card mb-8">
        <h2 className="font-bold text-gray-900 mb-3 text-sm">Select Models ({selected.length}/4)</h2>
        {loading ? (
          <div className="text-sm text-gray-400">Loading models...</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {models.map(m => (
              <button
                key={m.slug}
                onClick={() => toggleModel(m.slug)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  selected.includes(m.slug)
                    ? 'bg-brand text-white border-brand'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-brand/30'
                } ${selected.length >= 4 && !selected.includes(m.slug) ? 'opacity-40 cursor-not-allowed' : ''}`}
                disabled={selected.length >= 4 && !selected.includes(m.slug)}
              >
                {m.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Comparison Table */}
      {compared.length >= 2 ? (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-40">Attribute</th>
                {compared.map(m => (
                  <th key={m.slug} className="text-center px-4 py-3 text-xs font-bold text-gray-900">
                    {m.display_name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Provider */}
              <tr className="border-b border-gray-50">
                <td className="px-4 py-3 text-xs text-gray-500 font-medium">Provider</td>
                {compared.map(m => (
                  <td key={m.slug} className="px-4 py-3 text-center">
                    <span className={`badge text-[10px] ${PROVIDER_COLORS[m.provider] || 'bg-gray-100 text-gray-600'}`}>
                      {m.provider}
                    </span>
                  </td>
                ))}
              </tr>

              {/* Tiers */}
              <tr className="border-b border-gray-50">
                <td className="px-4 py-3 text-xs text-gray-500 font-medium">Routing Tiers</td>
                {compared.map(m => (
                  <td key={m.slug} className="px-4 py-3 text-center">
                    <div className="flex flex-wrap gap-1 justify-center">
                      {m.tiers.map(t => (
                        <span key={t} className={`badge text-[9px] ${TIER_COLORS[t] || 'bg-gray-100 text-gray-500'}`}>
                          {t.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </td>
                ))}
              </tr>

              {/* Context Window */}
              <tr className="border-b border-gray-50">
                <td className="px-4 py-3 text-xs text-gray-500 font-medium">Context Window</td>
                {compared.map(m => {
                  const best = Math.max(...compared.map(c => c.context_window))
                  return (
                    <td key={m.slug} className={`px-4 py-3 text-center text-xs font-mono ${m.context_window === best ? 'font-bold text-brand' : 'text-gray-600'}`}>
                      {(m.context_window / 1000).toFixed(0)}K
                    </td>
                  )
                })}
              </tr>

              {/* Input Cost */}
              <tr className="border-b border-gray-50">
                <td className="px-4 py-3 text-xs text-gray-500 font-medium">Input $/1M tokens</td>
                {compared.map(m => {
                  const cheapest = Math.min(...compared.map(c => c.input_cost_per_mtok))
                  return (
                    <td key={m.slug} className={`px-4 py-3 text-center text-xs font-mono ${m.input_cost_per_mtok === cheapest ? 'font-bold text-green-600' : 'text-gray-600'}`}>
                      ${m.input_cost_per_mtok.toFixed(2)}
                    </td>
                  )
                })}
              </tr>

              {/* Output Cost */}
              <tr className="border-b border-gray-50">
                <td className="px-4 py-3 text-xs text-gray-500 font-medium">Output $/1M tokens</td>
                {compared.map(m => {
                  const cheapest = Math.min(...compared.map(c => c.output_cost_per_mtok))
                  return (
                    <td key={m.slug} className={`px-4 py-3 text-center text-xs font-mono ${m.output_cost_per_mtok === cheapest ? 'font-bold text-green-600' : 'text-gray-600'}`}>
                      ${m.output_cost_per_mtok.toFixed(2)}
                    </td>
                  )
                })}
              </tr>

              {/* Capabilities */}
              {(['supports_tools', 'supports_structured_output', 'supports_vision'] as const).map(cap => (
                <tr key={cap} className="border-b border-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-500 font-medium">
                    {cap === 'supports_tools' ? 'Tool Calling' : cap === 'supports_structured_output' ? 'Structured Output' : 'Vision'}
                  </td>
                  {compared.map(m => (
                    <td key={m.slug} className="px-4 py-3 text-center text-sm">
                      {m[cap] ? <span className="text-green-600 font-bold">✓</span> : <span className="text-gray-300">✗</span>}
                    </td>
                  ))}
                </tr>
              ))}

              {/* Outcomes */}
              <tr className="border-b border-gray-50">
                <td className="px-4 py-3 text-xs text-gray-500 font-medium">Outcome Reports</td>
                {compared.map(m => (
                  <td key={m.slug} className="px-4 py-3 text-center text-xs font-mono text-gray-600">
                    {m.outcomes || '--'}
                  </td>
                ))}
              </tr>

              {/* Avg Quality */}
              <tr className="border-b border-gray-50">
                <td className="px-4 py-3 text-xs text-gray-500 font-medium">Avg Quality</td>
                {compared.map(m => {
                  const best = Math.max(...compared.filter(c => c.avg_quality != null).map(c => c.avg_quality!))
                  return (
                    <td key={m.slug} className={`px-4 py-3 text-center text-xs font-mono ${m.avg_quality != null && m.avg_quality === best ? 'font-bold text-brand' : 'text-gray-600'}`}>
                      {m.avg_quality != null ? (m.avg_quality / 10 * 10).toFixed(1) : '--'}
                    </td>
                  )
                })}
              </tr>

              {/* Avg Latency */}
              <tr>
                <td className="px-4 py-3 text-xs text-gray-500 font-medium">Avg Latency</td>
                {compared.map(m => {
                  const fastest = Math.min(...compared.filter(c => c.avg_latency != null).map(c => c.avg_latency!))
                  return (
                    <td key={m.slug} className={`px-4 py-3 text-center text-xs font-mono ${m.avg_latency != null && m.avg_latency === fastest ? 'font-bold text-green-600' : 'text-gray-600'}`}>
                      {m.avg_latency != null ? `${m.avg_latency}ms` : '--'}
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400 card">
          <p className="text-lg font-medium mb-1">Select at least 2 models</p>
          <p className="text-sm">Click on model names above to add them to the comparison.</p>
        </div>
      )}
    </div>
  )
}

// Fallback model data seeded from the registry
const FALLBACK_MODELS: Model[] = [
  { slug: 'gpt-4o-mini', display_name: 'GPT-4o Mini', provider: 'openai', context_window: 128000, input_cost_per_mtok: 0.15, output_cost_per_mtok: 0.60, supports_tools: true, supports_structured_output: true, supports_vision: true, tiers: ['cheap_chat', 'cheap_structured'], outcomes: 2, avg_quality: 7.5, avg_latency: 850 },
  { slug: 'gpt-4o', display_name: 'GPT-4o', provider: 'openai', context_window: 128000, input_cost_per_mtok: 2.50, output_cost_per_mtok: 10.00, supports_tools: true, supports_structured_output: true, supports_vision: true, tiers: ['tool_agent', 'best_available'], outcomes: 1, avg_quality: 8.5, avg_latency: 1200 },
  { slug: 'gpt-4.1', display_name: 'GPT-4.1', provider: 'openai', context_window: 1000000, input_cost_per_mtok: 2.00, output_cost_per_mtok: 8.00, supports_tools: true, supports_structured_output: true, supports_vision: true, tiers: ['fast_code', 'tool_agent', 'best_available'], outcomes: 0, avg_quality: null, avg_latency: null },
  { slug: 'gpt-4.1-mini', display_name: 'GPT-4.1 Mini', provider: 'openai', context_window: 1000000, input_cost_per_mtok: 0.40, output_cost_per_mtok: 1.60, supports_tools: true, supports_structured_output: true, supports_vision: true, tiers: ['cheap_structured', 'fast_code'], outcomes: 0, avg_quality: null, avg_latency: null },
  { slug: 'gpt-4.1-nano', display_name: 'GPT-4.1 Nano', provider: 'openai', context_window: 1000000, input_cost_per_mtok: 0.10, output_cost_per_mtok: 0.40, supports_tools: true, supports_structured_output: true, supports_vision: false, tiers: ['cheap_chat'], outcomes: 0, avg_quality: null, avg_latency: null },
  { slug: 'claude-3-5-sonnet', display_name: 'Claude 3.5 Sonnet', provider: 'anthropic', context_window: 200000, input_cost_per_mtok: 3.00, output_cost_per_mtok: 15.00, supports_tools: true, supports_structured_output: true, supports_vision: true, tiers: ['fast_code', 'tool_agent'], outcomes: 2, avg_quality: 8.8, avg_latency: 950 },
  { slug: 'claude-3-5-haiku', display_name: 'Claude 3.5 Haiku', provider: 'anthropic', context_window: 200000, input_cost_per_mtok: 0.80, output_cost_per_mtok: 4.00, supports_tools: true, supports_structured_output: true, supports_vision: false, tiers: ['cheap_structured', 'fast_code'], outcomes: 0, avg_quality: null, avg_latency: null },
  { slug: 'claude-opus-4', display_name: 'Claude Opus 4', provider: 'anthropic', context_window: 200000, input_cost_per_mtok: 15.00, output_cost_per_mtok: 75.00, supports_tools: true, supports_structured_output: true, supports_vision: true, tiers: ['reasoning_pro', 'best_available'], outcomes: 2, avg_quality: 9.2, avg_latency: 2100 },
  { slug: 'gemini-2.0-flash', display_name: 'Gemini 2.0 Flash', provider: 'google', context_window: 1000000, input_cost_per_mtok: 0.10, output_cost_per_mtok: 0.40, supports_tools: true, supports_structured_output: true, supports_vision: true, tiers: ['cheap_chat', 'cheap_structured'], outcomes: 1, avg_quality: 7.0, avg_latency: 700 },
  { slug: 'gemini-2.5-pro', display_name: 'Gemini 2.5 Pro', provider: 'google', context_window: 1000000, input_cost_per_mtok: 1.25, output_cost_per_mtok: 10.00, supports_tools: true, supports_structured_output: true, supports_vision: true, tiers: ['reasoning_pro', 'best_available'], outcomes: 0, avg_quality: null, avg_latency: null },
  { slug: 'deepseek-v3', display_name: 'DeepSeek V3', provider: 'deepseek', context_window: 128000, input_cost_per_mtok: 0.27, output_cost_per_mtok: 1.10, supports_tools: true, supports_structured_output: true, supports_vision: false, tiers: ['cheap_chat', 'fast_code'], outcomes: 1, avg_quality: 7.8, avg_latency: 1100 },
  { slug: 'deepseek-r1', display_name: 'DeepSeek R1', provider: 'deepseek', context_window: 128000, input_cost_per_mtok: 0.55, output_cost_per_mtok: 2.19, supports_tools: false, supports_structured_output: false, supports_vision: false, tiers: ['reasoning_pro'], outcomes: 1, avg_quality: 8.0, avg_latency: 3500 },
  { slug: 'codestral-latest', display_name: 'Codestral', provider: 'mistral', context_window: 256000, input_cost_per_mtok: 0.30, output_cost_per_mtok: 0.90, supports_tools: false, supports_structured_output: true, supports_vision: false, tiers: ['fast_code'], outcomes: 1, avg_quality: 7.5, avg_latency: 800 },
  { slug: 'mistral-large', display_name: 'Mistral Large', provider: 'mistral', context_window: 128000, input_cost_per_mtok: 2.00, output_cost_per_mtok: 6.00, supports_tools: true, supports_structured_output: true, supports_vision: false, tiers: ['tool_agent'], outcomes: 0, avg_quality: null, avg_latency: null },
  { slug: 'llama-4-scout', display_name: 'Llama 4 Scout', provider: 'meta', context_window: 512000, input_cost_per_mtok: 0.18, output_cost_per_mtok: 0.30, supports_tools: true, supports_structured_output: false, supports_vision: true, tiers: ['cheap_chat', 'cheap_structured'], outcomes: 0, avg_quality: null, avg_latency: null },
  { slug: 'llama-4-maverick', display_name: 'Llama 4 Maverick', provider: 'meta', context_window: 256000, input_cost_per_mtok: 0.27, output_cost_per_mtok: 0.85, supports_tools: true, supports_structured_output: true, supports_vision: true, tiers: ['fast_code', 'tool_agent'], outcomes: 0, avg_quality: null, avg_latency: null },
]
