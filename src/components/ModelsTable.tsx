'use client'

import { useState, useMemo } from 'react'

/* ── Types ──────────────────────────────────────────────── */
interface Model {
  id: string
  display_name: string
  provider: string
  context_window: number
  input_cost_per_mtok: string | number | null
  output_cost_per_mtok: string | number | null
  supports_tool_calling: boolean
  supports_structured_output: boolean
  supports_vision: boolean
  reasoning_strength: string | null
  code_strength: string | null
  speed_rating: string | null
}

interface Props {
  models: Model[]
  modelTiers: Record<string, string[]>
  outcomeMap: Record<string, number>
}

/* ── Tier metadata ──────────────────────────────────────── */
const TIER_META: Record<string, { label: string; color: string; bg: string; description: string }> = {
  best_available: { label: 'Frontier', color: 'var(--amber)', bg: 'var(--amber-dim)', description: 'Top-of-the-line models for the hardest tasks. Maximum quality, highest cost.' },
  reasoning_pro: { label: 'Reasoning Pro', color: '#a855f7', bg: 'rgba(168,85,247,.12)', description: 'Deep reasoning and complex analysis. Extended thinking for multi-step problems.' },
  tool_agent: { label: 'Tool Agent', color: 'var(--green)', bg: 'var(--green-dim)', description: 'Optimized for tool calling and agentic workflows. Reliable structured output.' },
  fast_code: { label: 'Fast Code', color: 'var(--blue)', bg: 'var(--blue-dim)', description: 'Rapid code generation with solid quality. Best balance of speed and accuracy.' },
  cheap_structured: { label: 'Efficient', color: 'var(--text-2)', bg: 'var(--bg3)', description: 'Cost-effective JSON and structured output. Reliable for high-volume pipelines.' },
  cheap_chat: { label: 'Budget', color: 'var(--text-3)', bg: 'var(--bg3)', description: 'Lowest cost for simple conversational tasks. High throughput, minimal spend.' },
}

const FILTER_TIERS = [
  { key: 'all', label: 'All tiers' },
  { key: 'best_available', label: 'Frontier' },
  { key: 'reasoning_pro', label: 'Reasoning' },
  { key: 'tool_agent', label: 'Tool Agent' },
  { key: 'fast_code', label: 'Fast Code' },
  { key: 'cheap_structured', label: 'Efficient' },
  { key: 'cheap_chat', label: 'Budget' },
]

const TIER_ORDER = ['best_available', 'reasoning_pro', 'tool_agent', 'fast_code', 'cheap_structured', 'cheap_chat']

/* ── Provider icons (first letter, colored) ─────────────── */
const PROVIDER_ICON: Record<string, { letter: string; bg: string; color: string }> = {
  openai: { letter: 'O', bg: 'rgba(255,255,255,.08)', color: '#10a37f' },
  anthropic: { letter: 'A', bg: 'rgba(204,120,50,.10)', color: '#cc7832' },
  google: { letter: 'G', bg: 'rgba(66,133,244,.10)', color: '#4285f4' },
  mistral: { letter: 'M', bg: 'rgba(255,120,0,.10)', color: '#ff7800' },
  deepseek: { letter: 'D', bg: 'rgba(99,102,241,.10)', color: '#6366f1' },
  meta: { letter: 'L', bg: 'rgba(59,130,246,.10)', color: '#3b82f6' },
}

/* ── Helpers ─────────────────────────────────────────────── */
function qualityScore(m: Model): number {
  let score = 5
  if (m.reasoning_strength === 'very_high') score = 9.5
  else if (m.reasoning_strength === 'high') score = 8.5
  else if (m.reasoning_strength === 'medium') score = 7
  else if (m.code_strength === 'very_high') score = 9
  else if (m.code_strength === 'high') score = 8
  else if (m.code_strength === 'medium') score = 6.5
  return score
}

function qualityColor(score: number): string {
  if (score >= 9) return 'var(--amber)'
  if (score >= 7.5) return 'var(--green)'
  if (score >= 6) return 'var(--blue)'
  return 'var(--text-3)'
}

function speedLabel(m: Model): string {
  if (m.speed_rating === 'very_fast' || m.speed_rating === 'fast') return 'Fast'
  if (m.speed_rating === 'medium') return 'Medium'
  return 'Slow'
}

function valueScore(m: Model): number {
  const q = qualityScore(m)
  const inputCost = parseFloat(String(m.input_cost_per_mtok || '0'))
  const costFactor = Math.max(0, 10 - Math.log10(inputCost + 0.01) * 3)
  return Math.min(10, (q * 0.6 + costFactor * 0.4))
}

/* ── Component ──────────────────────────────────────────── */
export function ModelsTable({ models, modelTiers, outcomeMap }: Props) {
  const [activeTier, setActiveTier] = useState('all')
  const [search, setSearch] = useState('')

  // Group models by tier
  const tierGroups = useMemo(() => {
    const groups: Record<string, Model[]> = {}
    for (const tier of TIER_ORDER) groups[tier] = []

    for (const model of models) {
      const tiers = modelTiers[model.id] || []
      if (tiers.length === 0) {
        // Assign to budget if no tier
        groups['cheap_chat'].push(model)
      } else {
        // Add to highest priority tier
        for (const t of TIER_ORDER) {
          if (tiers.includes(t)) {
            groups[t].push(model)
            break
          }
        }
      }
    }
    return groups
  }, [models, modelTiers])

  // Filter
  const visibleTiers = activeTier === 'all' ? TIER_ORDER : [activeTier]
  const searchLower = search.toLowerCase()

  return (
    <div>
      {/* Filter bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '16px 0', marginBottom: 32,
        borderBottom: '1px solid var(--border)',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
          {FILTER_TIERS.map(f => {
            const isActive = activeTier === f.key
            return (
              <button
                key={f.key}
                onClick={() => setActiveTier(f.key)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 999,
                  border: isActive ? '1px solid var(--amber)' : '1px solid var(--border)',
                  background: isActive ? 'var(--amber-dim)' : 'transparent',
                  color: isActive ? 'var(--amber)' : 'var(--text-3)',
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  letterSpacing: 0.3,
                  transition: 'all .2s',
                }}
              >
                {f.label}
              </button>
            )
          })}
        </div>

        <div style={{ position: 'relative', minWidth: 220 }}>
          <svg
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--text-3)' }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search models..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 32px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg2)',
              color: 'var(--text)',
              fontFamily: 'var(--sans)',
              fontSize: 13,
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Tier sections */}
      {visibleTiers.map(tier => {
        const meta = TIER_META[tier]
        if (!meta) return null
        let tierModels = tierGroups[tier] || []

        // Apply search filter
        if (searchLower) {
          tierModels = tierModels.filter(m =>
            m.display_name.toLowerCase().includes(searchLower) ||
            m.provider.toLowerCase().includes(searchLower)
          )
        }
        if (tierModels.length === 0) return null

        return (
          <div key={tier} style={{ marginBottom: 48 }}>
            {/* Tier header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <span style={{
                display: 'inline-flex', padding: '3px 12px', borderRadius: 999,
                fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 700,
                letterSpacing: 0.6, textTransform: 'uppercase' as const,
                background: meta.bg, color: meta.color,
                border: `1px solid ${meta.color}33`,
              }}>
                {meta.label}
              </span>
              <span style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.4 }}>
                {meta.description}
              </span>
            </div>

            {/* Table */}
            <div style={{
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 12, overflow: 'hidden',
            }}>
              <div style={{ overflowX: 'auto' as const }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={thStyle}>Model</th>
                      <th style={{ ...thStyle, textAlign: 'right' as const }}>Context</th>
                      <th style={{ ...thStyle, textAlign: 'right' as const }}>Input $/1M</th>
                      <th style={{ ...thStyle, textAlign: 'right' as const }}>Output $/1M</th>
                      <th style={{ ...thStyle, textAlign: 'center' as const }}>Quality</th>
                      <th style={{ ...thStyle, textAlign: 'center' as const }}>Speed</th>
                      <th style={{ ...thStyle, textAlign: 'left' as const, minWidth: 120 }}>Value Score</th>
                      <th style={{ ...thStyle, textAlign: 'right' as const }}>Badges</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tierModels.map((model, idx) => {
                      const q = qualityScore(model)
                      const v = valueScore(model)
                      const provIcon = PROVIDER_ICON[model.provider] || { letter: model.provider[0]?.toUpperCase() || '?', bg: 'var(--bg3)', color: 'var(--text-3)' }
                      const spd = speedLabel(model)

                      return (
                        <tr
                          key={model.id}
                          style={{
                            borderBottom: idx < tierModels.length - 1 ? '1px solid var(--border)' : 'none',
                            transition: 'background .15s',
                          }}
                          className="hover-row"
                        >
                          {/* Model name + provider */}
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 28, height: 28, borderRadius: 6,
                                background: provIcon.bg,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 12,
                                color: provIcon.color, flexShrink: 0,
                              }}>
                                {provIcon.letter}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>
                                  {model.display_name}
                                </div>
                                <div style={{
                                  fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-3)',
                                  textTransform: 'capitalize' as const,
                                }}>
                                  {model.provider}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Context */}
                          <td style={{ padding: '14px 16px', textAlign: 'right' as const, fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-2)' }}>
                            {(model.context_window / 1000).toFixed(0)}k
                          </td>

                          {/* Input cost */}
                          <td style={{ padding: '14px 16px', textAlign: 'right' as const, fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-2)' }}>
                            ${parseFloat(String(model.input_cost_per_mtok || '0')).toFixed(2)}
                          </td>

                          {/* Output cost */}
                          <td style={{ padding: '14px 16px', textAlign: 'right' as const, fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-2)' }}>
                            ${parseFloat(String(model.output_cost_per_mtok || '0')).toFixed(2)}
                          </td>

                          {/* Quality pill */}
                          <td style={{ padding: '14px 16px', textAlign: 'center' as const }}>
                            <span style={{
                              display: 'inline-flex', padding: '2px 10px', borderRadius: 999,
                              fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700,
                              color: qualityColor(q),
                              background: `${qualityColor(q)}15`,
                              border: `1px solid ${qualityColor(q)}33`,
                            }}>
                              {q.toFixed(1)}
                            </span>
                          </td>

                          {/* Speed */}
                          <td style={{ padding: '14px 16px', textAlign: 'center' as const, fontSize: 11, color: spd === 'Fast' ? 'var(--green)' : 'var(--text-3)', fontFamily: 'var(--mono)' }}>
                            {spd}
                          </td>

                          {/* Value Score bar */}
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{
                                flex: 1, height: 6, borderRadius: 3,
                                background: 'var(--bg3)', overflow: 'hidden',
                              }}>
                                <div style={{
                                  width: `${Math.min(100, v * 10)}%`, height: '100%',
                                  borderRadius: 3,
                                  background: v >= 8 ? 'var(--amber)' : v >= 6 ? 'var(--green)' : 'var(--blue)',
                                  transition: 'width .3s',
                                }} />
                              </div>
                              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, color: 'var(--text-2)', minWidth: 28, textAlign: 'right' as const }}>
                                {v.toFixed(1)}
                              </span>
                            </div>
                          </td>

                          {/* Badges */}
                          <td style={{ padding: '14px 16px', textAlign: 'right' as const }}>
                            <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                              {model.supports_tool_calling && (
                                <span style={{
                                  fontSize: 9, padding: '2px 6px', borderRadius: 4,
                                  background: 'var(--green-dim)', color: 'var(--green)', fontWeight: 600,
                                  fontFamily: 'var(--mono)',
                                }}>Tools</span>
                              )}
                              {model.supports_structured_output && (
                                <span style={{
                                  fontSize: 9, padding: '2px 6px', borderRadius: 4,
                                  background: 'var(--blue-dim)', color: 'var(--blue)', fontWeight: 600,
                                  fontFamily: 'var(--mono)',
                                }}>JSON</span>
                              )}
                              {model.supports_vision && (
                                <span style={{
                                  fontSize: 9, padding: '2px 6px', borderRadius: 4,
                                  background: 'rgba(168,85,247,.10)', color: '#a855f7', fontWeight: 600,
                                  fontFamily: 'var(--mono)',
                                }}>Vision</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      })}

      {/* Empty state */}
      {visibleTiers.every(t => {
        let m = tierGroups[t] || []
        if (searchLower) m = m.filter(x => x.display_name.toLowerCase().includes(searchLower) || x.provider.toLowerCase().includes(searchLower))
        return m.length === 0
      }) && (
        <div style={{ textAlign: 'center' as const, padding: '60px 0', color: 'var(--text-3)' }}>
          <p style={{ fontSize: 15 }}>No models match your filters.</p>
          <button
            onClick={() => { setActiveTier('all'); setSearch('') }}
            style={{
              marginTop: 12, padding: '6px 16px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--amber)', fontFamily: 'var(--mono)', fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Clear filters
          </button>
        </div>
      )}

      <style>{`
        .hover-row:hover { background: var(--bg3) !important; }
        @media (max-width: 768px) {
          table { font-size: 11px !important; }
          th, td { padding: 10px 8px !important; }
        }
      `}</style>
    </div>
  )
}

/* ── Shared th style ────────────────────────────────────── */
const thStyle: React.CSSProperties = {
  padding: '10px 16px',
  fontFamily: 'var(--mono)',
  fontSize: 10,
  fontWeight: 600,
  color: 'var(--text-3)',
  textTransform: 'uppercase',
  letterSpacing: 0.8,
  textAlign: 'left',
  borderBottom: '1px solid var(--border)',
  background: 'var(--bg3)',
}
