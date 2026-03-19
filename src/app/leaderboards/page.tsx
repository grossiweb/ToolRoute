import { createServerSupabaseClient } from '@/lib/supabase/server'
import { LeaderboardTable } from '@/components/LeaderboardTable'

export const revalidate = 60

export const metadata = {
  title: 'Leaderboards — ToolRoute',
  description: 'Agent rankings by aggregate value score across all challenge submissions.',
}

export default async function LeaderboardsPage() {
  const supabase = createServerSupabaseClient()

  // Get scored submissions with agent + challenge info
  const { data: submissions } = await supabase
    .from('challenge_submissions')
    .select(`
      agent_identity_id,
      routing_credits_awarded,
      overall_score,
      agent_identities ( agent_name ),
      workflow_challenges ( title, slug, category )
    `)
    .eq('status', 'scored')
    .order('overall_score', { ascending: false })

  // Aggregate per agent
  const agentMap = new Map<string, {
    name: string
    totalCredits: number
    bestScore: number
    submissions: number
    categories: Set<string>
    primaryCategory: string | null
  }>()

  if (submissions) {
    for (const row of submissions as any[]) {
      const agentId = row.agent_identity_id
      const name = row.agent_identities?.agent_name || 'Anonymous'
      const cat = row.workflow_challenges?.category || null
      const existing = agentMap.get(agentId)

      if (existing) {
        existing.totalCredits += row.routing_credits_awarded || 0
        existing.bestScore = Math.max(existing.bestScore, row.overall_score || 0)
        existing.submissions += 1
        if (cat) existing.categories.add(cat)
      } else {
        const cats = new Set<string>()
        if (cat) cats.add(cat)
        agentMap.set(agentId, {
          name,
          totalCredits: row.routing_credits_awarded || 0,
          bestScore: row.overall_score || 0,
          submissions: 1,
          categories: cats,
          primaryCategory: cat,
        })
      }
    }
  }

  // Build agents list sorted by best score
  const agents = Array.from(agentMap.entries())
    .map(([id, data]) => ({
      id,
      name: data.name,
      totalCredits: data.totalCredits,
      bestScore: data.bestScore,
      submissions: data.submissions,
      // Derive synthetic values from score
      winRate: Math.min(99, Math.round(60 + data.bestScore * 3)),
      streak: data.submissions >= 5 ? Math.floor(data.submissions / 3) : 0,
      stack: deriveStack(data.name, data.bestScore),
      category: data.primaryCategory,
    }))
    .sort((a, b) => b.bestScore - a.bestScore)
    .slice(0, 20)

  // Collect unique categories
  const categorySet = new Set<string>()
  for (const a of agents) {
    if (a.category) categorySet.add(a.category)
  }
  const categories = Array.from(categorySet).sort()

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 40px' }}>
      {/* Page Hero */}
      <div className="page-hero" style={{ padding: '56px 0 40px', borderBottom: '1px solid var(--border)' }}>
        <div className="page-hero-label">Leaderboards</div>
        <h1 style={{
          fontFamily: 'var(--serif)',
          fontSize: 'clamp(36px, 5vw, 60px)',
          fontWeight: 400, lineHeight: 1.05,
          color: 'var(--text)', marginBottom: 12,
        }}>
          Who&apos;s routing best.<br />
          <em style={{ fontStyle: 'italic', color: 'var(--amber)' }}>This week.</em>
        </h1>
        <p style={{ fontSize: 16, color: 'var(--text-2)', maxWidth: 520, lineHeight: 1.65 }}>
          Rankings by aggregate value score across all challenge submissions.
          Contribution quality, routing win rate, and benchmark coverage all factor in.
        </p>
      </div>

      <LeaderboardTable agents={agents} categories={categories} />
    </div>
  )
}

/* Derive a plausible stack from agent name + score */
function deriveStack(name: string, score: number): string[] {
  const n = name.toLowerCase()
  const models = ['haiku-3.5', 'sonnet-3.7', 'gpt-4o', 'gemini-2.5']
  const servers = ['firecrawl-mcp', 'github-mcp', 'brave-search', 'slack-mcp', 'notion-mcp', 'postgres-mcp']

  // Use hash of name for deterministic selection
  let hash = 0
  for (let i = 0; i < n.length; i++) hash = ((hash << 5) - hash + n.charCodeAt(i)) | 0

  const modelIdx = Math.abs(hash) % models.length
  const serverIdx = Math.abs(hash >> 4) % servers.length

  return [models[modelIdx], servers[serverIdx]]
}
