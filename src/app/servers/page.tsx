import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Suspense } from 'react'
import { SearchBar } from '@/components/SearchBar'
import { Sidebar } from '@/components/Sidebar'
import { formatScore } from '@/lib/scoring'
import { Metadata } from 'next'
import Link from 'next/link'

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

  // Filter by workflow if selected (two-step to avoid PostgREST embedded filter issues)
  if (searchParams.workflow) {
    const { data: wfRecord } = await supabase.from('workflows').select('id').eq('slug', searchParams.workflow).maybeSingle()
    const { data: workflowSkillIds } = wfRecord
      ? await supabase.from('skill_workflows').select('skill_id').eq('workflow_id', wfRecord.id)
      : { data: null }

    if (workflowSkillIds && workflowSkillIds.length > 0) {
      const matchedIds = new Set(workflowSkillIds.map((ws: any) => ws.skill_id))
      filteredServers = servers.filter((s: any) => matchedIds.has(s.id))
    }
  }

  // Filter by vertical if selected (two-step to avoid PostgREST embedded filter issues)
  if (searchParams.vertical) {
    const { data: vtRecord } = await supabase.from('verticals').select('id').eq('slug', searchParams.vertical).maybeSingle()
    const { data: verticalSkillIds } = vtRecord
      ? await supabase.from('skill_verticals').select('skill_id').eq('vertical_id', vtRecord.id)
      : { data: null }

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

  // Get spotlight server (top-rated)
  const spotlight = sortedServers.length > 0 ? sortedServers[0] : null
  const spotlightScores = spotlight
    ? (Array.isArray(spotlight.skill_scores) ? spotlight.skill_scores[0] : spotlight.skill_scores)
    : null

  // Top 4 for benchmark comparison table
  const benchmarkServers = sortedServers.slice(0, 4)

  // Derive trust badge
  function getTrustBadge(vendorType: string): { label: string; color: string; bg: string } {
    if (vendorType === 'official') return { label: 'Verified', color: 'var(--green)', bg: 'rgba(52,211,153,0.12)' }
    return { label: 'Community', color: 'var(--amber)', bg: 'rgba(251,191,36,0.12)' }
  }

  // Derive icon letter from name
  function getIcon(name: string): string {
    const words = name.split(/[\s-]+/)
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
    return name.substring(0, 2).toUpperCase()
  }

  // Build tags from scores
  function getTags(scores: any): string[] {
    if (!scores) return []
    const tags: string[] = []
    const os = normalizeScore(scores.output_score)
    const rs = normalizeScore(scores.reliability_score)
    const cs = normalizeScore(scores.cost_score)
    if (os != null && os >= 9) tags.push('High Output')
    if (rs != null && rs >= 9) tags.push('Reliable')
    if (cs != null && cs >= 8.5) tags.push('Cost-Effective')
    if (tags.length === 0) tags.push('Benchmarked')
    return tags.slice(0, 2)
  }

  const activeCategory = searchParams.workflow || ''

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 40px' }}>
      {/* ── Page Hero (left-aligned) ── */}
      <div className="page-hero" style={{
        paddingTop: 80,
        paddingBottom: 56,
        borderBottom: '1px solid var(--border)',
      }}>
        <div className="page-hero-label">MCP Servers</div>
        <h1 style={{
          fontFamily: 'var(--serif)',
          fontSize: 'clamp(36px, 5vw, 60px)',
          fontWeight: 400,
          lineHeight: 1.05,
          color: 'var(--text)',
          marginBottom: 16,
        }}>
          Find the right MCP server<br />
          <em style={{ fontStyle: 'italic', color: 'var(--amber)' }}>for the job.</em>
        </h1>
        <p style={{
          fontSize: 16,
          color: 'var(--text-2)',
          maxWidth: 560,
          lineHeight: 1.65,
        }}>
          {servers.length}+ servers ranked by real execution data. Every score is outcome-backed across 5 dimensions.
        </p>
      </div>

      {/* ── Sidebar + Content Layout ── */}
      <div style={{ display: 'flex', gap: 32, paddingTop: 32 }}>
        {/* Sidebar */}
        <div style={{ width: 200, flexShrink: 0 }} className="hidden md:block">
          <Suspense>
            <Sidebar context="default" />
          </Suspense>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Search bar */}
          <div style={{ marginBottom: 24, maxWidth: 400 }}>
            <Suspense>
              <SearchBar basePath="/servers" placeholder="Search servers..." />
            </Suspense>
          </div>

      {searchQuery && (
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 16, fontFamily: 'var(--mono)' }}>
          Showing <span style={{ fontWeight: 600, color: 'var(--text)' }}>{filteredServers.length}</span> results
          for &quot;<span style={{ fontWeight: 600, color: 'var(--amber)' }}>{searchParams.q}</span>&quot;
        </p>
      )}

      {/* ── Spotlight Section (2-column grid) ── */}
      {spotlight && spotlightScores && (
        <section style={{ padding: '48px 0 0' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 32,
            alignItems: 'start',
          }}>
            {/* Left: Spotlight info */}
            <div style={{
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: 32,
            }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 12px', borderRadius: 100,
                background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)',
                fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--amber)',
                textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 20,
              }}>
                <span style={{ fontSize: 12 }}>&#11088;</span> Top Rated
              </div>

              <h2 style={{
                fontFamily: 'var(--serif)',
                fontSize: 28,
                fontWeight: 400,
                fontStyle: 'italic',
                color: 'var(--text)',
                lineHeight: 1.2,
                marginBottom: 8,
              }}>
                {(spotlight as any).canonical_name}
              </h2>

              <p style={{
                fontSize: 14, color: 'var(--text-2)', lineHeight: 1.65,
                marginBottom: 24, maxWidth: 400,
              }}>
                {(spotlight as any).short_description}
              </p>

              <div style={{ display: 'flex', gap: 12 }}>
                <Link
                  href={`/mcp-servers/${(spotlight as any).slug}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '10px 24px', borderRadius: 100,
                    background: 'var(--amber)', color: '#000',
                    fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600,
                    textDecoration: 'none', transition: 'opacity .2s',
                  }}
                >
                  View details <span>&rarr;</span>
                </Link>
                <Link
                  href={`/compare?skills=${(spotlight as any).slug}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '10px 24px', borderRadius: 100,
                    border: '1px solid var(--border)', background: 'transparent',
                    color: 'var(--text-2)',
                    fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500,
                    textDecoration: 'none', transition: 'all .2s',
                  }}
                >
                  Compare
                </Link>
              </div>
            </div>

            {/* Right: Mini benchmark comparison table */}
            <div style={{
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: 24,
            }}>
              <div style={{
                fontFamily: 'var(--mono)', fontSize: 10,
                textTransform: 'uppercase', letterSpacing: 1.2,
                color: 'var(--text-3)', marginBottom: 16,
              }}>
                Benchmark Comparison
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {benchmarkServers.map((server: any, idx: number) => {
                  const sc = Array.isArray(server.skill_scores) ? server.skill_scores[0] : server.skill_scores
                  const vs = normalizeScore(sc?.value_score ?? sc?.overall_score)
                  const pct = vs != null ? (vs / 10) * 100 : 0
                  const barColor = (vs ?? 0) >= 8 ? 'var(--green)' : (vs ?? 0) >= 6 ? 'var(--amber)' : 'var(--text-3)'

                  return (
                    <div key={server.id}>
                      <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        marginBottom: 6,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-3)',
                            width: 16,
                          }}>
                            {idx + 1}.
                          </span>
                          <span style={{
                            fontSize: 13, fontWeight: 600, color: 'var(--text)',
                            fontFamily: 'var(--sans)',
                          }}>
                            {server.canonical_name}
                          </span>
                        </div>
                        <span style={{
                          fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700,
                          color: barColor,
                        }}>
                          {vs != null ? formatScore(vs) : '--'}
                        </span>
                      </div>
                      <div style={{
                        height: 6, borderRadius: 3,
                        background: 'var(--bg3)', overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%', borderRadius: 3,
                          width: `${pct}%`,
                          background: barColor,
                          transition: 'width .4s ease',
                        }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Server Grid (3-column) ── */}
      <section style={{ padding: '48px 0 0' }}>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 10,
          textTransform: 'uppercase', letterSpacing: 1.2,
          color: 'var(--text-3)', marginBottom: 20,
        }}>
          {sortedServers.length} Servers
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
        }}>
          {sortedServers.map((skill: any) => {
            const scores = Array.isArray(skill.skill_scores) ? skill.skill_scores[0] : skill.skill_scores
            const metrics = Array.isArray(skill.skill_metrics) ? skill.skill_metrics[0] : skill.skill_metrics
            const valueScore = normalizeScore(scores?.value_score ?? scores?.overall_score)
            const outputScore = normalizeScore(scores?.output_score)
            const reliabilityScore = normalizeScore(scores?.reliability_score)
            const costScore = normalizeScore(scores?.cost_score)
            const badge = getTrustBadge(skill.vendor_type)
            const tags = getTags(scores)

            // SVG score ring
            const pct = valueScore != null ? (valueScore / 10) * 100 : 0
            const r = 18
            const circ = 2 * Math.PI * r
            const ringOffset = circ - (pct / 100) * circ
            const ringColor = (valueScore ?? 0) >= 8 ? 'var(--green)' : (valueScore ?? 0) >= 6 ? 'var(--amber)' : 'var(--text-3)'

            return (
              <Link
                key={skill.id}
                href={`/mcp-servers/${skill.slug}`}
                className="server-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  background: 'var(--bg2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 24,
                  textDecoration: 'none',
                  transition: 'border-color .25s, transform .2s',
                  cursor: 'pointer',
                }}
              >
                {/* Top row: emoji icon + trust badge */}
                <div style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', marginBottom: 14,
                }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: 'var(--bg3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700,
                    color: 'var(--text-2)', flexShrink: 0,
                  }}>
                    {getIcon(skill.canonical_name)}
                  </div>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '2px 8px', borderRadius: 5,
                    background: badge.bg, color: badge.color,
                    fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600,
                  }}>
                    <span style={{
                      width: 5, height: 5, borderRadius: '50%',
                      background: badge.color, display: 'inline-block',
                    }} />
                    {badge.label}
                  </span>
                </div>

                {/* Server name */}
                <h3 style={{
                  fontWeight: 700, color: 'var(--text)',
                  fontSize: 15, letterSpacing: -0.2, marginBottom: 4,
                  fontFamily: 'var(--sans)',
                }}>
                  {skill.canonical_name}
                </h3>

                {/* Description */}
                <p style={{
                  fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55,
                  overflow: 'hidden', display: '-webkit-box',
                  WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
                  marginBottom: 12,
                }}>
                  {skill.short_description}
                </p>

                {/* Tags */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                  {tags.map(tag => (
                    <span key={tag} style={{
                      padding: '3px 10px', borderRadius: 100,
                      background: 'var(--bg3)', color: 'var(--text-3)',
                      fontFamily: 'var(--mono)', fontSize: 10,
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Stats footer: Quality %, Uptime %, Per run cost, Score ring SVG */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 16, marginTop: 'auto',
                  paddingTop: 14, borderTop: '1px solid var(--border)',
                  fontSize: 11, fontFamily: 'var(--mono)',
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{
                      color: 'var(--text-3)', textTransform: 'uppercase',
                      letterSpacing: 0.5, fontSize: 9, marginBottom: 2,
                    }}>Quality</span>
                    <span style={{
                      fontWeight: 600,
                      color: (outputScore ?? 0) >= 8 ? 'var(--green)' : (outputScore ?? 0) >= 6 ? 'var(--amber)' : 'var(--text-2)',
                    }}>
                      {outputScore != null ? `${Math.round((outputScore / 10) * 100)}%` : '--'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{
                      color: 'var(--text-3)', textTransform: 'uppercase',
                      letterSpacing: 0.5, fontSize: 9, marginBottom: 2,
                    }}>Uptime</span>
                    <span style={{
                      fontWeight: 600,
                      color: (reliabilityScore ?? 0) >= 8 ? 'var(--green)' : (reliabilityScore ?? 0) >= 6 ? 'var(--amber)' : 'var(--text-2)',
                    }}>
                      {reliabilityScore != null ? `${Math.round((reliabilityScore / 10) * 100)}%` : '--'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{
                      color: 'var(--text-3)', textTransform: 'uppercase',
                      letterSpacing: 0.5, fontSize: 9, marginBottom: 2,
                    }}>Per run</span>
                    <span style={{
                      fontWeight: 600,
                      color: (costScore ?? 0) >= 8 ? 'var(--green)' : (costScore ?? 0) >= 6 ? 'var(--amber)' : 'var(--text-2)',
                    }}>
                      {costScore != null ? `${Math.round((costScore / 10) * 100)}%` : '--'}
                    </span>
                  </div>

                  {/* Score ring SVG */}
                  <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0, marginLeft: 'auto' }}>
                    <svg viewBox="0 0 44 44" style={{ width: 44, height: 44, transform: 'rotate(-90deg)' }}>
                      <circle cx="22" cy="22" r={r} fill="none" stroke="var(--bg3)" strokeWidth="3" />
                      <circle
                        cx="22" cy="22" r={r} fill="none"
                        stroke={ringColor} strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray={circ}
                        strokeDashoffset={ringOffset}
                      />
                    </svg>
                    <div style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{
                        fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700,
                        color: 'var(--text)',
                      }}>
                        {valueScore != null ? formatScore(valueScore) : '--'}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        {sortedServers.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-3)' }}>
            <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No servers found</p>
            <p style={{ fontSize: 14 }}>Try a different filter or check back soon.</p>
          </div>
        )}
      </section>

      {/* ── CTA Banner (horizontal layout) ── */}
      <section style={{
        margin: '56px 0 64px',
        padding: '40px 40px',
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 32,
      }}>
        <div>
          <h2 style={{
            fontFamily: 'var(--serif)',
            fontSize: 24,
            fontWeight: 400,
            color: 'var(--text)',
            marginBottom: 6,
          }}>
            Built an MCP server?
          </h2>
          <p style={{
            fontSize: 14,
            color: 'var(--text-2)',
            lineHeight: 1.6,
            maxWidth: 480,
          }}>
            Submit your server to the directory. Get benchmarked, scored, and discovered by agents worldwide.
          </p>
        </div>
        <Link
          href="/submit"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 28px',
            borderRadius: 100,
            background: 'var(--amber)',
            color: '#000',
            fontFamily: 'var(--sans)',
            fontSize: 14,
            fontWeight: 600,
            textDecoration: 'none',
            transition: 'opacity .2s',
            flexShrink: 0,
          }}
        >
          Submit your server
          <span style={{ fontSize: 16 }}>&rarr;</span>
        </Link>
      </section>
        </div>{/* end main content */}
      </div>{/* end sidebar + content flex */}
    </div>
  )
}
