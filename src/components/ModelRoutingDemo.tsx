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

export function ModelRoutingDemo() {
  const [task, setTask] = useState(DEFAULT_TASK)
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
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

  // Auto-fire on first render with default task
  useEffect(() => {
    if (!autoFired.current) {
      autoFired.current = true
      handleRoute(DEFAULT_TASK)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mb-8 border-2 border-purple-200 rounded-xl p-5 bg-purple-50/30">
      <h3 className="font-bold text-gray-900 mb-1">Try Model Routing</h3>
      <p className="text-sm text-gray-500 mb-4">
        Describe a task and see which model ToolRoute recommends — live.
      </p>

      {/* Input */}
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={task}
          onChange={(e) => setTask(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleRoute()}
          placeholder="e.g. write a python function to parse CSV"
          className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400 text-sm"
        />
        <button
          onClick={handleRoute}
          disabled={loading || !task.trim()}
          className="px-5 py-2.5 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          {loading ? 'Routing...' : 'Route'}
        </button>
      </div>

      {/* Example chips */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <span className="text-[10px] text-gray-400 leading-6">Try:</span>
        {EXAMPLE_TASKS.map((example) => (
          <button
            key={example}
            onClick={() => { setTask(example); handleRoute(example) }}
            className="text-[10px] px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-600 hover:border-purple-300 hover:text-purple-700 transition-colors"
          >
            {example}
          </button>
        ))}
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
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                {result.tier_label || result.tier}
              </span>
              <span className="text-xs text-gray-400">
                {result.routing_metadata?.routing_latency_ms}ms
              </span>
            </div>
            <div className="text-xs text-gray-400">
              {result.routing_metadata?.candidates_evaluated} candidates evaluated
            </div>
          </div>

          {/* Main result */}
          <div className="px-4 py-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 font-bold text-sm">
                {result.model_details?.provider?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-bold text-gray-900">{result.model_details?.display_name}</div>
                <div className="text-xs text-gray-400">{result.model_details?.provider} &middot; {result.recommended_model}</div>
              </div>
              <div className="ml-auto text-right">
                <div className="text-lg font-black text-purple-600">{(result.confidence * 100).toFixed(0)}%</div>
                <div className="text-[10px] text-gray-400">confidence</div>
              </div>
            </div>

            {/* Signals */}
            {result.signals && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {Object.entries(result.signals).map(([key, val]) => (
                  <span
                    key={key}
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      val ? 'bg-purple-50 text-purple-700' : 'bg-gray-50 text-gray-400'
                    }`}
                  >
                    {val ? '✓' : '✗'} {key.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            )}

            {/* Cost + reasoning */}
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

            {/* Fallback + Escalation */}
            <div className="flex gap-3 text-xs">
              {result.fallback_chain && result.fallback_chain.length > 0 && (
                <div className="flex-1 bg-gray-50 rounded-lg p-2.5">
                  <div className="text-gray-400 mb-1">Fallback Chain</div>
                  <div className="flex flex-wrap gap-1">
                    {result.fallback_chain.map((fb: any, i: number) => (
                      <span key={i} className="px-2 py-0.5 bg-white border border-gray-200 rounded-full text-gray-700 font-medium">
                        {fb.slug}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {result.escalation && (
                <div className="flex-1 bg-gray-50 rounded-lg p-2.5">
                  <div className="text-gray-400 mb-1">Escalation</div>
                  <div className="text-gray-700 font-medium">{result.escalation.tier}</div>
                  <div className="text-gray-400 text-[10px] mt-0.5">{result.escalation.trigger}</div>
                </div>
              )}
            </div>

            {/* Reasoning */}
            {result.reasoning && (
              <div className="mt-3 text-xs text-gray-500 italic border-t border-gray-100 pt-3">
                {result.reasoning}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
