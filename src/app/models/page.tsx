import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ModelsTable } from '@/components/ModelsTable'

export const revalidate = 60

export const metadata = {
  title: 'LLM Model Routing — ToolRoute',
  description: 'Intelligent LLM model selection. 6 tiers, 20+ models, 6 providers. Data-driven routing recommendations for AI agents.',
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
      <div className="page-hero" style={{
        paddingTop: 80, paddingBottom: 56,
        borderBottom: '1px solid var(--border)',
        marginBottom: 48,
      }}>
        <div className="page-hero-label">Models</div>
        <h1 style={{
          fontFamily: 'var(--serif)',
          fontSize: 'clamp(36px, 5vw, 60px)',
          fontWeight: 400,
          lineHeight: 1.05,
          color: 'var(--text)',
          marginBottom: 16,
        }}>
          Pick the right LLM<br />
          <em style={{ fontStyle: 'italic', color: 'var(--amber)' }}>for every step.</em>
        </h1>
        <p style={{
          fontSize: 16, color: 'var(--text-2)', maxWidth: 560, lineHeight: 1.65,
        }}>
          {allModels.length} models across {providers.length} providers organized into 6 routing tiers.
          Ranked by real execution data with quality, speed, and value scores. No API key needed.
        </p>
        <div style={{ display: 'flex', gap: 48, marginTop: 32 }}>
          <div>
            <div style={{
              fontFamily: 'var(--serif)', fontSize: 36, fontStyle: 'italic',
              color: 'var(--amber)', lineHeight: 1,
            }}>
              {allModels.length}
            </div>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-3)',
              textTransform: 'uppercase' as const, letterSpacing: 0.8, marginTop: 4,
            }}>
              Models
            </div>
          </div>
          <div>
            <div style={{
              fontFamily: 'var(--serif)', fontSize: 36, fontStyle: 'italic',
              color: 'var(--green)', lineHeight: 1,
            }}>
              {providers.length}
            </div>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-3)',
              textTransform: 'uppercase' as const, letterSpacing: 0.8, marginTop: 4,
            }}>
              Providers
            </div>
          </div>
          <div>
            <div style={{
              fontFamily: 'var(--serif)', fontSize: 36, fontStyle: 'italic',
              color: 'var(--blue)', lineHeight: 1,
            }}>
              6
            </div>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-3)',
              textTransform: 'uppercase' as const, letterSpacing: 0.8, marginTop: 4,
            }}>
              Tiers
            </div>
          </div>
          <div>
            <div style={{
              fontFamily: 'var(--serif)', fontSize: 36, fontStyle: 'italic',
              color: 'var(--text-2)', lineHeight: 1,
            }}>
              {totalOutcomes}
            </div>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-3)',
              textTransform: 'uppercase' as const, letterSpacing: 0.8, marginTop: 4,
            }}>
              Outcomes
            </div>
          </div>
        </div>
      </div>

      {/* Models Table with filters */}
      <ModelsTable
        models={allModels}
        modelTiers={modelTiers}
        outcomeMap={outcomeMap}
      />

      {/* CTA */}
      <div style={{ marginTop: 48, paddingBottom: 80, textAlign: 'center' as const }}>
        <div style={{
          maxWidth: 560, margin: '0 auto', padding: '36px 40px',
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 16,
        }}>
          <h3 style={{
            fontFamily: 'var(--serif)', fontWeight: 400, fontSize: 24,
            color: 'var(--text)', marginBottom: 8, fontStyle: 'italic',
          }}>
            Need model routing in your agent?
          </h3>
          <p style={{
            fontSize: 14, color: 'var(--text-3)', marginBottom: 24,
            lineHeight: 1.6, maxWidth: 420, margin: '0 auto 24px',
          }}>
            Use the ToolRoute API or SDK to get optimal model recommendations
            for any task — with cost, quality, and speed scoring built in.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
            <Link href="/api-docs" style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '10px 24px', borderRadius: 8,
              background: 'var(--amber)', color: '#000',
              fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600,
              textDecoration: 'none', letterSpacing: 0.3,
            }}>
              View API Docs
            </Link>
            <Link href="/models/compare" style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '10px 24px', borderRadius: 8,
              background: 'transparent', color: 'var(--text-2)',
              fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600,
              textDecoration: 'none', letterSpacing: 0.3,
              border: '1px solid var(--border)',
            }}>
              Compare Models
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
