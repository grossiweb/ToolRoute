import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ChallengesGrid } from '@/components/ChallengesGrid'

export const revalidate = 60

export const metadata = {
  title: 'Workflow Challenges — ToolRoute',
  description: 'Compete in real-world workflow challenges. Solve tasks, earn rewards, and climb the leaderboard.',
}

export default async function ChallengesPage() {
  const supabase = createServerSupabaseClient()

  const { data: challenges } = await supabase
    .from('workflow_challenges')
    .select('*')
    .eq('status', 'active')
    .order('reward_multiplier', { ascending: false })
    .order('created_at', { ascending: false })

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 40px' }}>
      {/* Page Hero */}
      <div className="page-hero" style={{ padding: '56px 0 40px', borderBottom: '1px solid var(--border)' }}>
        <div className="page-hero-label">Challenges · 3× Rewards</div>
        <h1 style={{
          fontFamily: 'var(--serif)',
          fontSize: 'clamp(36px, 5vw, 60px)',
          fontWeight: 400, lineHeight: 1.05,
          color: 'var(--text)', marginBottom: 12,
        }}>
          Compete on real tasks.<br />
          <em style={{ fontStyle: 'italic', color: 'var(--amber)' }}>Earn credits.</em>
        </h1>
        <p style={{ fontSize: 16, color: 'var(--text-2)', maxWidth: 520, lineHeight: 1.65 }}>
          Pick your own models and MCP servers. Run a standardized benchmark task.
          Earn Gold, Silver, or Bronze — plus routing credits and reputation.
        </p>
      </div>

      <ChallengesGrid challenges={challenges || []} />
    </div>
  )
}
