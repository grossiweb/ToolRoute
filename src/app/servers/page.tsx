import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Suspense } from 'react'
import { SortDropdown } from '@/components/SortDropdown'
import { SearchBar } from '@/components/SearchBar'
import { Sidebar } from '@/components/Sidebar'
import { SkillCard } from '@/components/SkillCard'
import { Metadata } from 'next'

function normalizeScore(score: number | null | undefined): number | null {
  if (score == null) return null
  return score > 10 ? score / 10 : score
}

export const revalidate = 120

export const metadata: Metadata = {
  title: 'MCP Servers — ToolRoute',
  description: 'Browse 200+ MCP servers ranked by real execution benchmarks. Find the best tool for any agent task.',
}

export default async function ServersPage({
  searchParams,
}: {
  searchParams: { sort?: string; workflow?: string; vertical?: string; q?: string }
}) {
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

  const servers = skills || []

  // Get unique workflows for filter
  const { data: workflows } = await supabase
    .from('workflows')
    .select('slug, name')
    .order('name')

  // Filter by search query
  let filteredServers = servers
  const searchQuery = searchParams.q?.trim().toLowerCase()
  if (searchQuery) {
    filteredServers = filteredServers.filter((s: any) =>
      s.canonical_name.toLowerCase().includes(searchQuery) ||
      s.short_description?.toLowerCase().includes(searchQuery)
    )
  }

  // Filter by workflow if selected
  if (searchParams.workflow) {
    const { data: workflowSkillIds } = await supabase
      .from('skill_workflows')
      .select('skill_id, workflows!inner(slug)')
      .eq('workflows.slug', searchParams.workflow)

    if (workflowSkillIds && workflowSkillIds.length > 0) {
      const matchedIds = new Set(workflowSkillIds.map((ws: any) => ws.skill_id))
      filteredServers = servers.filter((s: any) => matchedIds.has(s.id))
    }
  }

  // Filter by vertical if selected
  if (searchParams.vertical) {
    const { data: verticalSkillIds } = await supabase
      .from('skill_verticals')
      .select('skill_id, verticals!inner(slug)')
      .eq('verticals.slug', searchParams.vertical)

    if (verticalSkillIds && verticalSkillIds.length > 0) {
      const matchedIds = new Set(verticalSkillIds.map((vs: any) => vs.skill_id))
      filteredServers = filteredServers.filter((s: any) => matchedIds.has(s.id))
    }
  }

  // Sort servers based on selected sort key
  const sortKey = searchParams.sort || 'score'

  const sortedServers = [...filteredServers].sort((a: any, b: any) => {
    const scoresA = Array.isArray(a.skill_scores) ? a.skill_scores[0] : a.skill_scores
    const scoresB = Array.isArray(b.skill_scores) ? b.skill_scores[0] : b.skill_scores
    const metricsA = Array.isArray(a.skill_metrics) ? a.skill_metrics[0] : a.skill_metrics
    const metricsB = Array.isArray(b.skill_metrics) ? b.skill_metrics[0] : b.skill_metrics

    switch (sortKey) {
      case 'output': return (normalizeScore(scoresB?.output_score) ?? 0) - (normalizeScore(scoresA?.output_score) ?? 0)
      case 'reliability': return (normalizeScore(scoresB?.reliability_score) ?? 0) - (normalizeScore(scoresA?.reliability_score) ?? 0)
      case 'efficiency': return (normalizeScore(scoresB?.efficiency_score) ?? 0) - (normalizeScore(scoresA?.efficiency_score) ?? 0)
      case 'cost': return (normalizeScore(scoresB?.cost_score) ?? 0) - (normalizeScore(scoresA?.cost_score) ?? 0)
      case 'trust': return (normalizeScore(scoresB?.trust_score) ?? 0) - (normalizeScore(scoresA?.trust_score) ?? 0)
      case 'stars': return (metricsB?.github_stars ?? 0) - (metricsA?.github_stars ?? 0)
      case 'recent': return (metricsA?.days_since_last_commit ?? 999) - (metricsB?.days_since_last_commit ?? 999)
      default: return (normalizeScore(scoresB?.value_score ?? scoresB?.overall_score) ?? 0) - (normalizeScore(scoresA?.value_score ?? scoresA?.overall_score) ?? 0)
    }
  })

  // Compute badges for servers
  const serverBadges = new Map<string, string[]>()
  for (const skill of sortedServers) {
    const scores = Array.isArray(skill.skill_scores) ? skill.skill_scores[0] : skill.skill_scores
    const metrics = Array.isArray(skill.skill_metrics) ? skill.skill_metrics[0] : skill.skill_metrics
    if (!scores) continue

    const badges: string[] = []
    const vs = normalizeScore(scores.value_score ?? scores.overall_score)
    const os = normalizeScore(scores.output_score)
    const rs = normalizeScore(scores.reliability_score)
    const cs = normalizeScore(scores.cost_score)
    const stars = metrics?.github_stars

    if (vs != null && vs >= 9.0) badges.push('Top Rated')
    else if (os != null && os >= 9.0) badges.push('Best Output')
    else if (rs != null && rs >= 9.0) badges.push('Most Reliable')
    else if (cs != null && cs >= 9.0) badges.push('Best Budget')

    if (stars != null && stars >= 5000) badges.push('Popular')
    // Note: "Active" badge handled natively by SkillCard via isFresh check

    if (badges.length > 0) serverBadges.set(skill.id, badges.slice(0, 2))
  }

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 40px' }}>
      {/* Page Hero */}
      <div className="page-hero" style={{ padding: '56px 0 40px', borderBottom: '1px solid var(--border)' }}>
        <div className="page-hero-label">MCP Servers</div>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 400, lineHeight: 1.05, color: 'var(--text)', marginBottom: 12 }}>
          Find the right MCP server<br /><em style={{ fontStyle: 'italic', color: 'var(--amber)' }}>for the job.</em>
        </h1>
        <p style={{ fontSize: 16, color: 'var(--text-2)', maxWidth: 520, lineHeight: 1.65 }}>
          {servers.length} servers ranked by real execution data. Every score is outcome-backed on a 0-10 scale across 5 dimensions.
        </p>
        <div className="max-w-md">
          <Suspense>
            <SearchBar basePath="/servers" placeholder="Search MCP servers by name or description..." />
          </Suspense>
        </div>
        {searchQuery && (
          <p style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 12 }}>
            Showing <span style={{ fontWeight: 600, color: 'var(--text)' }}>{filteredServers.length}</span> results for &quot;<span style={{ fontWeight: 600, color: 'var(--amber)' }}>{searchParams.q}</span>&quot;
          </p>
        )}
      </div>

      {/* Stats bar + Sort */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, marginTop: 24, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, fontSize: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 700, color: 'var(--text)' }}>{filteredServers.length}</span>
            <span style={{ color: 'var(--text-3)' }}>servers</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 700, color: 'var(--text)' }}>{workflows?.length || 0}</span>
            <span style={{ color: 'var(--text-3)' }}>categories</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 700, color: 'var(--text)' }}>5</span>
            <span style={{ color: 'var(--text-3)' }}>score dimensions</span>
          </div>
        </div>
        <Suspense>
          <SortDropdown currentSort={searchParams.sort || 'score'} basePath="/servers" workflow={searchParams.workflow} vertical={searchParams.vertical} />
        </Suspense>
      </div>

      {/* Sidebar + Grid */}
      <div className="flex gap-6">
        <Suspense><Sidebar context="default" /></Suspense>
        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedServers.map((skill: any) => {
              const scores = Array.isArray(skill.skill_scores) ? skill.skill_scores[0] : skill.skill_scores
              const metrics = Array.isArray(skill.skill_metrics) ? skill.skill_metrics[0] : skill.skill_metrics
              return (
                <SkillCard
                  key={skill.id}
                  skill={{
                    ...skill,
                    skill_scores: scores,
                    skill_metrics: metrics,
                  }}
                  badges={serverBadges.get(skill.id)}
                />
              )
            })}
          </div>

          {sortedServers.length === 0 && (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-3)' }}>
              <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No servers found</p>
              <p style={{ fontSize: 14 }}>Try a different filter or check back soon.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
