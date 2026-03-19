import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ServersGrid } from '@/components/ServersGrid'

export const revalidate = 120

export const metadata = {
  title: 'MCP Servers — ToolRoute',
  description: 'Browse 200+ MCP servers ranked by real execution benchmarks. Find the best tool for any agent task.',
}

function normalizeScore(score: number | null | undefined): number | null {
  if (score == null) return null
  return score > 10 ? score / 10 : score
}

export default async function ServersPage() {
  const supabase = createServerSupabaseClient()

  const { data: skills } = await supabase
    .from('skills')
    .select(`
      id, slug, canonical_name, short_description, vendor_type,
      skill_scores ( overall_score, value_score, output_score, reliability_score, efficiency_score, cost_score, trust_score ),
      skill_metrics ( github_stars, days_since_last_commit )
    `)
    .eq('status', 'active')
    .order('canonical_name')
    .limit(300)

  const { data: workflows } = await supabase
    .from('workflows')
    .select('slug, name')
    .order('name')

  // Flatten scores/metrics for client component
  const servers = (skills || []).map((s: any) => ({
    ...s,
    skill_scores: Array.isArray(s.skill_scores) ? s.skill_scores[0] : s.skill_scores,
    skill_metrics: Array.isArray(s.skill_metrics) ? s.skill_metrics[0] : s.skill_metrics,
  }))

  // Sort by value score descending
  servers.sort((a: any, b: any) => {
    const va = normalizeScore(a.skill_scores?.value_score ?? a.skill_scores?.overall_score) ?? 0
    const vb = normalizeScore(b.skill_scores?.value_score ?? b.skill_scores?.overall_score) ?? 0
    return vb - va
  })

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 40px' }}>
      {/* Page Hero */}
      <div className="page-hero" style={{ padding: '56px 0 40px', borderBottom: '1px solid var(--border)' }}>
        <div className="page-hero-label">MCP Servers</div>
        <h1 style={{
          fontFamily: 'var(--serif)',
          fontSize: 'clamp(36px, 5vw, 60px)',
          fontWeight: 400, lineHeight: 1.05,
          color: 'var(--text)', marginBottom: 12,
        }}>
          Find the right MCP server<br />
          <em style={{ fontStyle: 'italic', color: 'var(--amber)' }}>for the job.</em>
        </h1>
        <p style={{ fontSize: 16, color: 'var(--text-2)', maxWidth: 520, lineHeight: 1.65 }}>
          {servers.length}+ MCP servers ranked by real outcome data across 10 benchmark profiles.
          Filter by workflow, vertical, and trust level.
        </p>
      </div>

      <ServersGrid servers={servers} workflows={workflows || []} />
    </div>
  )
}
