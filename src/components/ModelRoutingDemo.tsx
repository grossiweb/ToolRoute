'use client'

import { useState, useEffect, useRef } from 'react'

const EXAMPLE_TASKS = [
  'write a python function to parse CSV',
  'summarize this meeting transcript',
  'call the Stripe API and process webhooks',
  'design a microservices architecture',
  'format API response as JSON schema',
  'analyze quarterly revenue trends and forecast',
]

const DEFAULT_TASK = 'write a python function to parse CSV'

// GPT-4o baseline costs for savings calculation
const GPT4O_INPUT_COST = 2.5 // per MTok
const GPT4O_OUTPUT_COST = 10.0 // per MTok

export function ModelRoutingDemo() {
  const [task, setTask] = useState(DEFAULT_TASK)
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resultCopied, setResultCopied] = useState(false)
  const autoFired = useRef(false)

  async function handleRoute(taskOverride?: string) {
    const t = taskOverride || task
    if (!t.trim()) return
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch('/api/route/model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: t }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Routing failed')
      } else {
        setResult(data)
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  // Calculate savings vs GPT-4o
  function calcSavings() {
    if (!result?.model_details || !result?.estimated_cost) return null
    const inputCost = result.model_details.input_cost_per_mtok ?? 0
    const outputCost = result.model_details.output_cost_per_mtok ?? 0
    const inputTokens = result.estimated_cost.input_tokens ?? 500
    const outputTokens = result.estimated_cost.output_tokens ?? 500

    const routedCost = (inputTokens * inputCost + outputTokens * outputCost) / 1_000_000
    const gpt4oCost = (inputTokens * GPT4O_INPUT_COST + outputTokens * GPT4O_OUTPUT_COST) / 1_000_000

    if (gpt4oCost <= 0 || routedCost >= gpt4oCost) return null
    const pct = Math.round((1 - routedCost / gpt4oCost) * 100)
    return pct > 0 ? pct : null
  }

  const handleCopyResult = () => {
    if (!result) return
    const text = `ToolRoute recommendation for "${task}":
Model: ${result.model_details?.display_name} (${result.model_details?.provider})
Tier: ${result.tier_label || result.tier}
Confidence: ${(result.confidence * 100).toFixed(0)}%
Est. Cost: $${result.estimated_cost?.estimated_usd?.toFixed(4) || '—'}
${result.reasoning || ''}`
    navigator.clipboard.writeText(text)
    setResultCopied(true)
    setTimeout(() => setResultCopied(false), 2000)
  }

  // Auto-fire on first render with default task
  useEffect(() => {
    if (!autoFired.current) {
      autoFired.current = true
      handleRoute(DEFAULT_TASK)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const savings = result ? calcSavings() : null

  return (
    <div className="mb-8">
      {/* Big input — the primary action */}
      <div className="border-2 border-brand/20 rounded-xl p-6 bg-brand-light/30 mb-4">
        <label className="block text-lg font-bold text-gray-900 mb-1">
          What do you want your agent to do?
        </label>
        <p className="text-sm text-gray-500 mb-4">
          Describe a task — we&apos;ll pick the cheapest model that works. Live API call, not a demo.
        </p>

        <div className="flex gap-3 mb-3">
          <input
            type="text"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRoute()}
            placeholder="e.g. write a python function to parse CSV"
            className="flex-1 px-5 py-3.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-base bg-white"
          />
          <button
            onClick={() => handleRoute()}
            disabled={loading || !task.trim()}
            className="px-6 py-3.5 rounded-xl bg-brand text-white text-sm font-bold hover:bg-brand-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            {loading ? 'Routing...' : 'Route it'}
          </button>
        </div>

        {/* Example chips */}
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] text-gray-400 leading-6">Try:</span>
          {EXAMPLE_TASKS.map((example) => (
            <button
              key={example}
              onClick={() => { setTask(example); handleRoute(example) }}
              className="text-[10px] px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-600 hover:border-brand/30 hover:text-brand transition-colors"
            >
              {example}
            </button>
          ))}
        </div>

        {/* Savings callout */}
        <div className="mt-4 text-center text-sm text-gray-400">
          Typical routes are <span className="font-bold text-teal">60-90% cheaper</span> than defaulting to GPT-4o
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3 mb-3">
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Savings banner */}
          {savings && savings > 0 && (
            <div className="bg-teal-light px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-teal font-black text-lg">{savings}%</span>
                <span className="text-teal text-sm font-medium">cheaper than GPT-4o for this task</span>
              </div>
              <span className="text-[10px] text-teal/70">
                ${result.estimated_cost?.estimated_usd?.toFixed(4)} vs ${((result.estimated_cost?.input_tokens * GPT4O_INPUT_COST + result.estimated_cost?.output_tokens * GPT4O_OUTPUT_COST) / 1_000_000).toFixed(4)}
              </span>
            </div>
          )}

          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-brand bg-brand-light px-2 py-0.5 rounded-full">
                {result.tier_label || result.tier}
              </span>
              <span className="text-xs text-gray-400">
                {result.routing_metadata?.routing_latency_ms}ms
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">
                {result.routing_metadata?.candidates_evaluated} candidates evaluated
              </span>
              <button
                onClick={handleCopyResult}
                className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
              >
                {resultCopied ? '✓ Copied' : 'Copy result'}
              </button>
            </div>
          </div>

          {/* Main result */}
          <div className="px-4 py-4">
            {/* Model recommendation */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-brand-light flex items-center justify-center text-brand font-bold text-sm">
                {result.model_details?.provider?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-bold text-gray-900">{result.model_details?.display_name}</div>
                <div className="text-xs text-gray-400">{result.model_details?.provider} &middot; {result.recommended_model}</div>
              </div>
              <div className="ml-auto text-right">
                <div className="text-lg font-black text-brand">{(result.confidence * 100).toFixed(0)}%</div>
                <div className="text-[10px] text-gray-400">confidence</div>
              </div>
            </div>

            {/* Why this model */}
            {result.reasoning && (
              <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 mb-3">
                <span className="font-semibold text-gray-700">Why this model: </span>
                {result.reasoning}
              </div>
            )}

            {/* Signals */}
            {result.signals && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {Object.entries(result.signals).map(([key, val]) => (
                  <span
                    key={key}
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      val ? 'bg-brand-light text-brand' : 'bg-gray-50 text-gray-400'
                    }`}
                  >
                    {val ? '✓' : '✗'} {key.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            )}

            {/* Cost */}
            <div className="grid grid-cols-2 gap-3 text-xs mb-3">
              <div className="bg-gray-50 rounded-lg p-2.5">
                <div className="text-gray-400 mb-0.5">Estimated Cost</div>
                <div className="font-bold text-gray-900">
                  ${result.estimated_cost?.estimated_usd?.toFixed(4) || '—'}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2.5">
                <div className="text-gray-400 mb-0.5">Cost per MTok</div>
                <div className="font-bold text-gray-900">
                  ${result.model_details?.input_cost_per_mtok?.toFixed(2) || '—'} in / ${result.model_details?.output_cost_per_mtok?.toFixed(2) || '—'} out
                </div>
              </div>
            </div>

            {/* Escalation — the secret weapon, called out prominently */}
            {result.escalation && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-amber-600 font-bold text-xs">AUTO-ESCALATION</span>
                </div>
                <div className="text-sm text-gray-700">
                  If <span className="font-semibold">{result.model_details?.display_name}</span> fails, we automatically escalate to{' '}
                  <span className="font-semibold text-amber-700">{result.escalation.tier}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">{result.escalation.trigger}</div>
              </div>
            )}

            {/* Fallback chain */}
            {result.fallback_chain && result.fallback_chain.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-2.5 text-xs">
                <div className="text-gray-400 mb-1">Fallback Chain (same tier)</div>
                <div className="flex flex-wrap gap-1">
                  {result.fallback_chain.map((fb: any, i: number) => (
                    <span key={i} className="px-2 py-0.5 bg-white border border-gray-200 rounded-full text-gray-700 font-medium">
                      {fb.slug}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
