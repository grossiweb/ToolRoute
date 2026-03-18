import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const revalidate = 300

export const metadata = {
  title: 'LLM Model Routing — ToolRoute',
  description: 'Intelligent LLM model selection. 6 tiers, 20+ models, 6 providers. Data-driven routing recommendations for AI agents.',
}

const TIER_META: Record<string, { label: string; color: string; bg: string; description: string }> = {
  cheap_chat: { label: 'Cheap Chat', color: 'text-green-700', bg: 'bg-green-50', description: 'Simple conversation' },
  cheap_structured: { label: 'Cheap Structured', color: 'text-blue-700', bg: 'bg-blue-50', description: 'JSON output' },
  fast_code: { label: 'Fast Code', color: 'text-purple-700', bg: 'bg-purple-50', description: 'Code generation' },
  reasoning_pro: { label: 'Reasoning Pro', color: 'text-amber-700', bg: 'bg-amber-50', description: 'Complex analysis' },
  tool_agent: { label: 'Tool Agent', color: 'text-teal-700', bg: 'bg-teal-50', description: 'Tool calling' },
  best_available: { label: 'Best Available', color: 'text-red-700', bg: 'bg-red-50', description: 'Top of the line' },
}

const PROVIDER_COLORS: Record<string, string> = {
  openai: 'bg-gray-900 text-white',
  anthropic: 'bg-orange-100 text-orange-800',
  google: 'bg-blue-100 text-blue-800',
  mistral: 'bg-orange-50 text-orange-700',
  deepseek: 'bg-indigo-100 text-indigo-800',
  meta: 'bg-blue-50 text-blue-700',
}

export default async function ModelsPage() {
  const supabase = createServerSupabaseClient()

  const { data: models } = await supabase
    .from('model_registry')
    .select('*')
    .eq('status', 'active')
    .order('provider', { ascending: true })
    .order('input_cost_per_mtok', { ascending: true })

  const { data: aliases } = await supabase
    .from('model_aliases')
    .select('tier, model_id, priority, is_fallback')
    .eq('active', true)
    .order('priority', { ascending: true })

  // Build tier map per model
  const modelTiers: Record<string, string[]> = {}
  for (const a of aliases || []) {
    if (!modelTiers[a.model_id]) modelTiers[a.model_id] = []
    if (!modelTiers[a.model_id].includes(a.tier)) {
      modelTiers[a.model_id].push(a.tier)
    }
  }

  // Count outcome records per model
  const { data: outcomeCounts } = await supabase
    .from('model_outcome_records')
    .select('model_id')

  const outcomeMap: Record<string, number> = {}
  for (const o of outcomeCounts || []) {
    outcomeMap[o.model_id] = (outcomeMap[o.model_id] || 0) + 1
  }

  const allModels = models || []
  const providers = Array.from(new Set(allModels.map(m => m.provider))).sort()
  const totalOutcomes = Object.values(outcomeMap).reduce((s, c) => s + c, 0)

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold mb-3">
          MODEL ROUTING
        </div>
        <h1 className="text-3xl font-black text-gray-900 mb-2">LLM Model Intelligence</h1>
        <p className="text-gray-500 max-w-2xl">
          ToolRoute recommends the right model for every task — based on real execution data, not benchmarks.
          6 tiers, {allModels.length} models, {providers.length} providers.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="text-center bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-2xl font-black text-brand">{allModels.length}</div>
          <div className="text-xs text-gray-500">Models Tracked</div>
        </div>
        <div className="text-center bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-2xl font-black text-teal">{providers.length}</div>
          <div className="text-xs text-gray-500">Providers</div>
        </div>
        <div className="text-center bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-2xl font-black text-purple-600">6</div>
          <div className="text-xs text-gray-500">Routing Tiers</div>
        </div>
        <div className="text-center bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-2xl font-black text-amber-500">{totalOutcomes}</div>
          <div className="text-xs text-gray-500">Outcome Reports</div>
        </div>
      </div>

      {/* Tier Guide */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Routing Tiers</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {Object.entries(TIER_META).map(([tier, meta]) => (
            <div key={tier} className={`rounded-lg p-3 ${meta.bg} border border-gray-100`}>
              <div className={`text-xs font-bold ${meta.color} mb-1`}>{meta.label}</div>
              <div className="text-[10px] text-gray-500">{meta.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* API CTA */}
      <div className="mb-8 border-2 border-purple-200 rounded-xl p-5 bg-purple-50/30">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-gray-900">Route via API</h3>
            <p className="text-sm text-gray-500">POST /api/route/model with your task description. Zero cost, {'<'}50ms latency.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/api-docs" className="btn-primary text-sm">API Docs</Link>
          </div>
        </div>
        <div className="mt-3 bg-gray-900 rounded-lg p-3 font-mono text-xs text-gray-300 overflow-x-auto">
          {'curl -X POST https://toolroute.io/api/route/model \\'}<br/>
          {'  -H "Content-Type: application/json" \\'}<br/>
          {'  -d \'{"task": "write a python function to parse CSV"}\''}
        </div>
      </div>

      {/* Model Grid */}
      <h2 className="text-lg font-bold text-gray-900 mb-4">All Models</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allModels.map((model) => {
          const tiers = modelTiers[model.id] || []
          const outcomes = outcomeMap[model.id] || 0
          const providerColor = PROVIDER_COLORS[model.provider] || 'bg-gray-100 text-gray-700'

          return (
            <div key={model.id} className="card hover:border-purple-200 transition-all">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">{model.display_name}</h3>
                  <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 ${providerColor}`}>
                    {model.provider}
                  </span>
                </div>
                {model.supports_vision && (
                  <span className="text-xs" title="Supports vision">👁</span>
                )}
              </div>

              {/* Tiers */}
              <div className="flex flex-wrap gap-1 mb-3">
                {tiers.map(t => {
                  const meta = TIER_META[t]
                  return meta ? (
                    <span key={t} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>
                      {meta.label}
                    </span>
                  ) : null
                })}
              </div>

              {/* Capabilities */}
              <div className="flex gap-2 mb-3 text-[10px]">
                {model.supports_tool_calling && (
                  <span className="px-2 py-0.5 bg-teal-50 text-teal-700 rounded-full font-medium">Tools</span>
                )}
                {model.supports_structured_output && (
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium">JSON</span>
                )}
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-gray-400">Input cost</div>
                  <div className="font-bold text-gray-900">${parseFloat(model.input_cost_per_mtok || '0').toFixed(2)}/Mtok</div>
                </div>
                <div>
                  <div className="text-gray-400">Output cost</div>
                  <div className="font-bold text-gray-900">${parseFloat(model.output_cost_per_mtok || '0').toFixed(2)}/Mtok</div>
                </div>
                <div>
                  <div className="text-gray-400">Context</div>
                  <div className="font-bold text-gray-900">{(model.context_window / 1000).toFixed(0)}k</div>
                </div>
                <div>
                  <div className="text-gray-400">Outcomes</div>
                  <div className="font-bold text-gray-900">{outcomes > 0 ? outcomes : '—'}</div>
                </div>
              </div>

              {/* Strength badges */}
              <div className="mt-3 flex gap-2 text-[10px]">
                {(model.reasoning_strength === 'high' || model.reasoning_strength === 'very_high') && (
                  <span className="text-amber-600 font-medium">
                    {model.reasoning_strength === 'very_high' ? 'Reasoning++' : 'Reasoning+'}
                  </span>
                )}
                {(model.code_strength === 'high' || model.code_strength === 'very_high') && (
                  <span className="text-purple-600 font-medium">
                    {model.code_strength === 'very_high' ? 'Code++' : 'Code+'}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
