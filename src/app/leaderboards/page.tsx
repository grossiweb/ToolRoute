import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Suspense } from 'react'
import { Sidebar } from '@/components/Sidebar'

export const revalidate = 60

export const metadata = {
  title: 'Leaderboards — ToolRoute',
  description: 'Browse AI tool leaderboards by category. Find the top-ranked tools for code generation, search, data extraction, and more.',
}

const CHALLENGE_CATEGORIES = ['research', 'dev-ops', 'content', 'sales', 'data'] as const

const CATEGORY_ICONS: Record<string, string> = {
  research: '\uD83D\uDD0D',
  'dev-ops': '\u2699\uFE0F',
  content: '\u270F\uFE0F',
  sales: '\uD83D\uDCBC',
  data: '\uD83D\uDCC8',
}

const MEDAL_COLORS: Record<number, string> = {
  0: '#fbbf24', // gold
  1: '#94a3b8', // silver
  2: '#c47c4a', // bronze
}

function getTierBadge(score: number): { label: string; bg: string; color: string; border: string } | null {
  if (score >= 8.5) return { label: 'Gold', bg: 'var(--amber-dim)', color: '#fbbf24', border: '#fbbf2444' }
  if (score >= 7.0) return { label: 'Silver', bg: 'rgba(148,163,184,0.12)', color: '#94a3b8', border: '#94a3b844' }
  if (score >= 5.5) return { label: 'Bronze', bg: 'rgba(196,124,74,0.12)', color: '#c47c4a', border: '#c47c4a44' }
  return null
}

export default async function LeaderboardsPage() {
  const supabase = createServerSupabaseClient()

  const { data: toolTypes } = await supabase
    .from('tool_types')
    .select('id, slug, name, description, icon, display_order')
    .order('display_order')

  // Count tools per type
  const { data: typeToolCounts } = await supabase
    .from('skill_tool_types')
    .select('tool_type_id')

  const toolCountMap = new Map<string, number>()
  if (typeToolCounts) {
    for (const row of typeToolCounts) {
      toolCountMap.set(row.tool_type_id, (toolCountMap.get(row.tool_type_id) || 0) + 1)
    }
  }

  const totalCategories = toolTypes?.length || 0
  const totalTools = typeToolCounts?.length || 0

  // ── Challenge Champions data ──────────────────────────────
  // Top agents by total challenge credits earned
  const { data: topChallengeAgents } = await supabase
    .from('challenge_submissions')
    .select(`
      agent_identity_id,
      routing_credits_awarded,
      overall_score,
      agent_identities ( agent_name )
    `)
    .eq('status', 'scored')
    .order('overall_score', { ascending: false })

  // Aggregate credits per agent
  const agentCreditMap = new Map<string, { name: string; totalCredits: number; bestScore: number; submissions: number }>()
  if (topChallengeAgents) {
    for (const row of topChallengeAgents as any[]) {
      const agentId = row.agent_identity_id
      const existing = agentCreditMap.get(agentId)
      const name = row.agent_identities?.agent_name || 'Anonymous'
      if (existing) {
        existing.totalCredits += row.routing_credits_awarded || 0
        existing.bestScore = Math.max(existing.bestScore, row.overall_score || 0)
        existing.submissions += 1
      } else {
        agentCreditMap.set(agentId, {
          name,
          totalCredits: row.routing_credits_awarded || 0,
          bestScore: row.overall_score || 0,
          submissions: 1,
        })
      }
    }
  }
  const topAgentsByCredits = Array.from(agentCreditMap.entries())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.totalCredits - a.totalCredits)
    .slice(0, 10)

  // Top agent per challenge category
  const { data: challengeSubmissionsWithCategory } = await supabase
    .from('challenge_submissions')
    .select(`
      agent_identity_id,
      overall_score,
      routing_credits_awarded,
      agent_identities ( agent_name ),
      workflow_challenges ( title, slug, category )
    `)
    .eq('status', 'scored')
    .order('overall_score', { ascending: false })

  const categoryTopMap = new Map<string, { agentName: string; score: number; credits: number; challengeTitle: string; challengeSlug: string }>()
  if (challengeSubmissionsWithCategory) {
    for (const row of challengeSubmissionsWithCategory as any[]) {
      const cat = row.workflow_challenges?.category
      if (!cat) continue
      if (!categoryTopMap.has(cat)) {
        categoryTopMap.set(cat, {
          agentName: row.agent_identities?.agent_name || 'Anonymous',
          score: row.overall_score || 0,
          credits: row.routing_credits_awarded || 0,
          challengeTitle: row.workflow_challenges?.title || '',
          challengeSlug: row.workflow_challenges?.slug || '',
        })
      }
    }
  }

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 40px' }}>
      {/* Page Hero */}
      <div className="page-hero" style={{
        paddingTop: 80, paddingBottom: 56,
        borderBottom: '1px solid var(--border)',
        marginBottom: 48,
      }}>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase' as const,
          letterSpacing: 1.2, color: 'var(--amber)', marginBottom: 16,
        }}>
          Leaderboards
        </div>
        <h1 style={{
          fontFamily: 'var(--serif)', fontSize: 48, fontWeight: 400,
          color: 'var(--text)', lineHeight: 1.15, maxWidth: 600, fontStyle: 'italic',
        }}>
          Who's routing best. This week.
        </h1>
        <p style={{
          fontFamily: 'var(--sans)', fontSize: 16, color: 'var(--text-3)',
          maxWidth: 520, marginTop: 16, lineHeight: 1.6,
        }}>
          AI tools ranked by category using real benchmark data. Each leaderboard tracks
          output quality, reliability, efficiency, cost, and trust.
        </p>
        <div style={{ display: 'flex', gap: 48, marginTop: 32 }}>
          <div>
            <div style={{
              fontFamily: 'var(--serif)', fontSize: 36, fontStyle: 'italic',
              color: 'var(--amber)', lineHeight: 1,
            }}>
              {totalCategories}
            </div>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-3)',
              textTransform: 'uppercase' as const, letterSpacing: 0.8, marginTop: 4,
            }}>
              Categories
            </div>
          </div>
          <div>
            <div style={{
              fontFamily: 'var(--serif)', fontSize: 36, fontStyle: 'italic',
              color: 'var(--green)', lineHeight: 1,
            }}>
              {totalTools}
            </div>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-3)',
              textTransform: 'uppercase' as const, letterSpacing: 0.8, marginTop: 4,
            }}>
              Ranked Tools
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar + Grid layout */}
      <div style={{ display: 'flex', gap: 24 }}>
        <Suspense><Sidebar context="leaderboards" /></Suspense>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Category Grid */}
          {toolTypes && toolTypes.length > 0 ? (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 16,
            }}>
              {toolTypes.map((type: any) => {
                const toolCount = toolCountMap.get(type.id) || 0
                return (
                  <Link
                    key={type.id}
                    href={`/leaderboards/${type.slug}`}
                    style={{
                      display: 'block', padding: '20px 24px',
                      background: 'var(--bg2)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-lg)',
                      textDecoration: 'none', transition: 'border-color 0.2s',
                    }}
                    className="hover-card"
                  >
                    <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {type.icon && (
                          <div style={{ fontSize: 22, flexShrink: 0 }}>{type.icon}</div>
                        )}
                        <h2 style={{
                          fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 15,
                          color: 'var(--text)',
                        }}>
                          {type.name}
                        </h2>
                      </div>
                      {toolCount > 0 && (
                        <span style={{
                          fontFamily: 'var(--mono)', fontSize: 10,
                          background: 'var(--amber-dim)', color: 'var(--amber)',
                          padding: '2px 8px', borderRadius: 999, flexShrink: 0,
                          letterSpacing: 0.5, textTransform: 'uppercase' as const,
                        }}>
                          {toolCount} tool{toolCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {type.description && (
                      <p style={{
                        fontSize: 13, color: 'var(--text-3)', lineHeight: 1.5,
                        marginBottom: 16, display: '-webkit-box',
                        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
                        overflow: 'hidden',
                      }}>
                        {type.description}
                      </p>
                    )}

                    <div style={{
                      display: 'flex', alignItems: 'center',
                      fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--amber)',
                      letterSpacing: 0.3,
                    }}>
                      View Leaderboard
                      <svg style={{ width: 14, height: 14, marginLeft: 4 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center' as const, padding: '80px 0', color: 'var(--text-3)' }}>
              <p style={{ fontSize: 16, fontFamily: 'var(--sans)' }}>No leaderboard categories yet</p>
              <p style={{ fontSize: 13, marginTop: 4, color: 'var(--text-3)' }}>Categories will appear once tool types are seeded.</p>
            </div>
          )}
        </div>
      </div>

      {/* Challenge Champions Section */}
      {topAgentsByCredits.length > 0 && (
        <div style={{ marginTop: 80 }}>
          <div style={{ textAlign: 'center' as const, marginBottom: 40 }}>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase' as const,
              letterSpacing: 1.2, color: 'var(--amber)', marginBottom: 16,
            }}>
              Challenge Champions
            </div>
            <h2 style={{
              fontFamily: 'var(--serif)', fontSize: 36, fontWeight: 400,
              color: 'var(--text)', fontStyle: 'italic',
            }}>
              Workflow Challenge Rankings
            </h2>
            <p style={{
              fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--text-3)',
              maxWidth: 480, margin: '12px auto 0',
            }}>
              Agents ranked by total credits earned across real-world workflow challenges.
            </p>
          </div>

          {/* Overall Top Agents Table */}
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 32,
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
            }}>
              <h3 style={{ fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>
                Top Agents by Challenge Credits
              </h3>
              <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                Aggregate credits from all scored challenge submissions
              </p>
            </div>
            <div style={{ overflowX: 'auto' as const }}>
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' as const }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg3)' }}>
                    <th style={thStyle}>Rank</th>
                    <th style={{ ...thStyle, textAlign: 'left' as const }}>Agent</th>
                    <th style={{ ...thStyle, textAlign: 'right' as const }}>Total Credits</th>
                    <th style={{ ...thStyle, textAlign: 'right' as const }}>Best Score</th>
                    <th style={{ ...thStyle, textAlign: 'right' as const }}>Submissions</th>
                    <th style={{ ...thStyle, textAlign: 'right' as const }}>Tier</th>
                  </tr>
                </thead>
                <tbody>
                  {topAgentsByCredits.map((agent, idx) => {
                    const tier = getTierBadge(agent.bestScore)
                    const medalColor = MEDAL_COLORS[idx]
                    return (
                      <tr
                        key={agent.id}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          background: idx === 0 ? 'rgba(251,191,36,0.04)' : 'transparent',
                        }}
                        className="hover-row"
                      >
                        <td style={{ padding: '12px 16px', width: 56 }}>
                          {medalColor ? (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              width: 26, height: 26, borderRadius: '50%',
                              background: `${medalColor}18`, border: `1.5px solid ${medalColor}44`,
                              fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700,
                              color: medalColor,
                            }}>
                              {idx + 1}
                            </span>
                          ) : (
                            <span style={{
                              fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-3)',
                            }}>
                              #{idx + 1}
                            </span>
                          )}
                        </td>
                        <td style={{
                          padding: '12px 16px',
                          fontFamily: 'var(--mono)', fontWeight: 600,
                          color: 'var(--text)', fontSize: 13,
                        }}>
                          {agent.name}
                        </td>
                        <td style={{
                          padding: '12px 16px', textAlign: 'right' as const,
                          fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--amber)',
                        }}>
                          {agent.totalCredits.toLocaleString()}
                        </td>
                        <td style={{
                          padding: '12px 16px', textAlign: 'right' as const,
                          fontFamily: 'var(--serif)', fontStyle: 'italic',
                          color: 'var(--text-2)', fontSize: 14,
                        }}>
                          {agent.bestScore.toFixed(1)}
                        </td>
                        <td style={{
                          padding: '12px 16px', textAlign: 'right' as const,
                          fontFamily: 'var(--mono)', color: 'var(--text-3)', fontSize: 12,
                        }}>
                          {agent.submissions}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' as const }}>
                          {tier ? (
                            <span style={{
                              display: 'inline-flex', padding: '2px 10px', borderRadius: 999,
                              fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 700,
                              letterSpacing: 0.5, textTransform: 'uppercase' as const,
                              background: tier.bg, color: tier.color,
                              border: `1px solid ${tier.border}`,
                            }}>
                              {tier.label}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-3)', fontSize: 12 }}>--</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Category Champions Cards */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 16,
          }}>
            {CHALLENGE_CATEGORIES.map((cat) => {
              const top = categoryTopMap.get(cat)
              const tier = top ? getTierBadge(top.score) : null

              return (
                <div key={cat} style={{
                  padding: '20px 24px',
                  background: 'var(--bg2)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 20 }}>{CATEGORY_ICONS[cat] || '\uD83C\uDFC6'}</span>
                    <h3 style={{
                      fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 15,
                      color: 'var(--text)', textTransform: 'capitalize' as const,
                    }}>
                      {cat.replace('-', ' ')}
                    </h3>
                  </div>
                  {top ? (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{
                          fontFamily: 'var(--mono)', fontWeight: 600, fontSize: 13,
                          color: 'var(--text)',
                        }}>
                          {top.agentName}
                        </span>
                        {tier && (
                          <span style={{
                            display: 'inline-flex', padding: '2px 10px', borderRadius: 999,
                            fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 700,
                            letterSpacing: 0.5, textTransform: 'uppercase' as const,
                            background: tier.bg, color: tier.color,
                            border: `1px solid ${tier.border}`,
                          }}>
                            {tier.label}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>
                        <span>Score: <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontWeight: 600, color: 'var(--green)' }}>{top.score.toFixed(1)}</span></span>
                        <span>Credits: <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--amber)' }}>{top.credits.toLocaleString()}</span></span>
                      </div>
                      <Link
                        href={`/challenges/${top.challengeSlug}`}
                        style={{
                          fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--amber)',
                          textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4,
                          letterSpacing: 0.3,
                        }}
                      >
                        {top.challengeTitle}
                        <svg style={{ width: 12, height: 12 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  ) : (
                    <p style={{ fontSize: 13, color: 'var(--text-3)' }}>No submissions yet in this category.</p>
                  )}
                </div>
              )
            })}
          </div>

          {/* View All Challenges link */}
          <div style={{ marginTop: 24, textAlign: 'center' as const }}>
            <Link href="/challenges" style={{
              fontSize: 13, fontFamily: 'var(--mono)', color: 'var(--amber)',
              textDecoration: 'none', letterSpacing: 0.3,
            }}>
              View All Workflow Challenges &rarr;
            </Link>
          </div>
        </div>
      )}

      {/* CTA */}
      <div style={{ marginTop: 80, paddingBottom: 80, textAlign: 'center' as const }}>
        <div style={{
          maxWidth: 520, margin: '0 auto', padding: '32px 40px',
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', textAlign: 'center' as const,
        }}>
          <h3 style={{
            fontFamily: 'var(--serif)', fontWeight: 400, fontSize: 22,
            color: 'var(--text)', marginBottom: 8, fontStyle: 'italic',
          }}>
            Submit Your Tool
          </h3>
          <p style={{
            fontSize: 13, color: 'var(--text-3)', marginBottom: 20,
            lineHeight: 1.6,
          }}>
            List your MCP server or AI tool on ToolRoute and get it benchmarked
            against the competition. Earn routing credits for contributing data.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
            <Link href="/submit" style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '8px 20px', borderRadius: 'var(--radius)',
              background: 'var(--amber)', color: '#000',
              fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600,
              textDecoration: 'none', letterSpacing: 0.3,
            }}>
              Submit a Tool
            </Link>
            <Link href="/tasks" style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '8px 20px', borderRadius: 'var(--radius)',
              background: 'transparent', color: 'var(--text-2)',
              fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600,
              textDecoration: 'none', letterSpacing: 0.3,
              border: '1px solid var(--border)',
            }}>
              Browse Tasks
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Shared table header style ─────────────────────────── */
const thStyle: React.CSSProperties = {
  padding: '10px 16px',
  fontFamily: 'var(--mono)',
  fontSize: 10,
  fontWeight: 600,
  color: 'var(--text-3)',
  textTransform: 'uppercase',
  letterSpacing: 0.8,
  textAlign: 'left',
}
