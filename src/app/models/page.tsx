import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Suspense } from 'react'
import { ModelRoutingDemo } from '@/components/ModelRoutingDemo'

export const revalidate = 60

export const metadata = {
  title: 'LLM Model Routing — ToolRoute',
  description: 'Intelligent LLM model selection. 6 tiers, 20+ models, 6 providers. Data-driven routing recommendations for AI agents.',
}

const TIER_META: Record<string, { label: string; color: string; bg: string; description: string }> = {
  cheap_chat: { label: 'Cheap Chat', color: 'var(--green)', bg: 'var(--green-dim)', description: 'Simple conversation' },
  cheap_structured: { label: 'Cheap Structured', color: 'var(--blue)', bg: 'var(--blue-dim)', description: 'JSON output' },
  fast_code: { label: 'Fast Code', color: 'var(--amber)', bg: 'var(--amber-dim)', description: 'Code generation' },
  reasoning_pro: { label: 'Reasoning Pro', color: '#a855f7', bg: 'rgba(168,85,247,.12)', description: 'Complex analysis' },
  tool_agent: { label: 'Tool Agent', color: 'var(--green)', bg: 'var(--green-dim)', description: 'Tool calling' },
  best_available: { label: 'Best Available', color: 'var(--amber)', bg: 'var(--amber-dim)', description: 'Top of the line' },
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
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 40px' }}>
      {/* Page Hero */}
      <div className="page-hero" style={{ padding: '56px 0 40px', borderBottom: '1px solid var(--border)' }}>
        <div className="page-hero-label">Models</div>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 400, lineHeight: 1.05, color: 'var(--text)', marginBottom: 12 }}>
          Pick the right LLM<br /><em style={{ fontStyle: 'italic', color: 'var(--amber)' }}>for every step.</em>
        </h1>
        <p style={{ fontSize: 16, color: 'var(--text-2)', maxWidth: 520, lineHeight: 1.65 }}>
          {allModels.length} models across {providers.length} providers, ranked by real execution data. No API key needed to query.
        </p>
        <Link href="/models/compare" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 14, fontSize: 13, fontWeight: 600, color: 'var(--amber)', textDecoration: 'none', fontFamily: 'var(--mono)' }}>
          Compare models →
        </Link>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 32, marginTop: 32 }}>
        {[
          { val: allModels.length, label: 'Models' },
          { val: providers.length, label: 'Providers' },
          { val: 6, label: 'Tiers' },
          { val: totalOutcomes, label: 'Outcomes' },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: 'center', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 16px' }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 28, fontStyle: 'italic', color: 'var(--amber)' }}>{s.val}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.8 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tier Guide */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>Routing Tiers</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }} className="tier-grid">
          {Object.entries(TIER_META).map(([tier, meta]) => (
            <div key={tier} style={{ borderRadius: 8, padding: 12, background: meta.bg, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: meta.color, marginBottom: 4 }}>{meta.label}</div>
              <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{meta.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Demo */}
      <Suspense>
        <ModelRoutingDemo />
      </Suspense>

      {/* Model Grid */}
      <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>All Models</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }} className="model-grid">
        {allModels.map((model) => {
          const tiers = modelTiers[model.id] || []
          const outcomes = outcomeMap[model.id] || 0

          return (
            <div key={model.id} style={{
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 16, padding: 24,
              transition: 'border-color .3s, transform .25s', cursor: 'pointer',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{model.display_name}</div>
                  <span style={{
                    display: 'inline-block', fontFamily: 'var(--mono)', fontSize: 10,
                    padding: '2px 8px', borderRadius: 5,
                    background: 'var(--bg3)', border: '1px solid var(--border)',
                    color: 'var(--text-3)',
                  }}>
                    {model.provider}
                  </span>
                </div>
                {model.supports_vision && (
                  <span style={{ fontSize: 12 }} title="Supports vision">👁</span>
                )}
              </div>

              {/* Tiers */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                {tiers.map(t => {
                  const meta = TIER_META[t]
                  return meta ? (
                    <span key={t} style={{
                      fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 5,
                      background: meta.bg, color: meta.color,
                    }}>
                      {meta.label}
                    </span>
                  ) : null
                })}
              </div>

              {/* Capabilities */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                {model.supports_tool_calling && (
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 5, background: 'var(--green-dim)', color: 'var(--green)', fontWeight: 500 }}>Tools</span>
                )}
                {model.supports_structured_output && (
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 5, background: 'var(--blue-dim)', color: 'var(--blue)', fontWeight: 500 }}>JSON</span>
                )}
              </div>

              {/* Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                <div>
                  <div style={{ color: 'var(--text-3)', fontSize: 10 }}>Input cost</div>
                  <div style={{ fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 13 }}>${parseFloat(model.input_cost_per_mtok || '0').toFixed(2)}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-3)', fontSize: 10 }}>Output cost</div>
                  <div style={{ fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 13 }}>${parseFloat(model.output_cost_per_mtok || '0').toFixed(2)}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-3)', fontSize: 10 }}>Context</div>
                  <div style={{ fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 13 }}>{(model.context_window / 1000).toFixed(0)}k</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-3)', fontSize: 10 }}>Outcomes</div>
                  <div style={{ fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 13 }}>{outcomes > 0 ? outcomes : '—'}</div>
                </div>
              </div>

              {/* Strength badges */}
              <div style={{ marginTop: 12, display: 'flex', gap: 8, fontSize: 10 }}>
                {(model.reasoning_strength === 'high' || model.reasoning_strength === 'very_high') && (
                  <span style={{ color: 'var(--amber)', fontWeight: 600 }}>
                    {model.reasoning_strength === 'very_high' ? 'Reasoning++' : 'Reasoning+'}
                  </span>
                )}
                {(model.code_strength === 'high' || model.code_strength === 'very_high') && (
                  <span style={{ color: 'var(--green)', fontWeight: 600 }}>
                    {model.code_strength === 'very_high' ? 'Code++' : 'Code+'}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <style>{`
        @media (max-width: 900px) { .model-grid { grid-template-columns: 1fr 1fr !important; } .tier-grid { grid-template-columns: repeat(3, 1fr) !important; } }
        @media (max-width: 600px) { .model-grid { grid-template-columns: 1fr !important; } .tier-grid { grid-template-columns: 1fr 1fr !important; } }
      `}</style>
    </div>
  )
}
