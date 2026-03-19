import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Suspense } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { SearchBar } from '@/components/SearchBar'

export const revalidate = 60

export const metadata = {
  title: 'Workflow Challenges — ToolRoute',
  description: 'Compete in real-world workflow challenges. Solve tasks, earn rewards, and climb the leaderboard.',
}

const DIFFICULTY_COLORS: Record<string, { bg: string; color: string }> = {
  beginner: { bg: 'var(--green-dim)', color: 'var(--green)' },
  intermediate: { bg: 'var(--amber-dim)', color: 'var(--amber)' },
  advanced: { bg: 'rgba(249,115,22,.12)', color: '#f97316' },
  expert: { bg: 'rgba(239,68,68,.12)', color: '#ef4444' },
}

export default async function ChallengesPage({
  searchParams,
}: {
  searchParams: { category?: string; difficulty?: string; q?: string }
}) {
  const supabase = createServerSupabaseClient()

  let query = supabase
    .from('workflow_challenges')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (searchParams.category) {
    query = query.eq('category', searchParams.category)
  }
  if (searchParams.difficulty) {
    query = query.eq('difficulty', searchParams.difficulty)
  }

  const { data: challenges } = await query

  let filteredChallenges = challenges || []

  // Search filter
  const searchQuery = searchParams.q?.trim().toLowerCase()
  if (searchQuery) {
    filteredChallenges = filteredChallenges.filter((c: any) =>
      c.title?.toLowerCase().includes(searchQuery) ||
      c.description?.toLowerCase().includes(searchQuery)
    )
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* ── Page Hero ── */}
      <div style={{
        padding: '72px 40px 56px',
        textAlign: 'center',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg2)',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 14px', borderRadius: 100,
          border: '1px solid var(--amber-dim)', background: 'var(--amber-dim)',
          fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--amber)',
          textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 20,
        }}>
          Challenges
        </div>

        <h1 style={{
          fontFamily: 'var(--serif)', fontSize: 48, lineHeight: 1.1,
          color: 'var(--text)', fontStyle: 'italic', margin: '0 auto 16px',
          maxWidth: 640,
        }}>
          Compete on real tasks.<br />Earn credits.
        </h1>

        <p style={{
          fontFamily: 'var(--sans)', fontSize: 15, lineHeight: 1.7,
          color: 'var(--text-2)', maxWidth: 520, margin: '0 auto 28px',
        }}>
          Solve real-world workflow challenges using MCP tools, earn reward multipliers, and climb the leaderboard.
        </p>

        <div style={{ maxWidth: 400, margin: '0 auto' }}>
          <Suspense>
            <SearchBar basePath="/challenges" placeholder="Search challenges..." />
          </Suspense>
        </div>

        {searchQuery && (
          <p style={{
            fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-3)',
            marginTop: 16,
          }}>
            Showing <span style={{ color: 'var(--text)', fontWeight: 600 }}>{filteredChallenges.length}</span> results for &quot;<span style={{ color: 'var(--amber)' }}>{searchParams.q}</span>&quot;
          </p>
        )}
      </div>

      {/* ── Stats bar ── */}
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 40px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 24, padding: '20px 0',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontFamily: 'var(--serif)', fontSize: 22, fontStyle: 'italic',
              color: 'var(--amber)',
            }}>
              {filteredChallenges.length}
            </span>
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-3)',
              textTransform: 'uppercase', letterSpacing: 0.8,
            }}>
              active challenges
            </span>
          </div>
        </div>
      </div>

      {/* ── Sidebar + Grid ── */}
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '32px 40px 64px' }}>
        <div style={{ display: 'flex', gap: 24 }}>
          <Suspense><Sidebar context="challenges" /></Suspense>
          <div style={{ flex: 1, minWidth: 0 }}>
            {filteredChallenges.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: 16,
              }}>
                {filteredChallenges.map((challenge: any, idx: number) => {
                  const diff = DIFFICULTY_COLORS[challenge.difficulty] || { bg: 'var(--bg3)', color: 'var(--text-3)' }
                  const isFeatured = challenge.reward_multiplier && challenge.reward_multiplier >= 2
                  const progress = challenge.max_submissions
                    ? Math.min(100, Math.round(((challenge.submission_count ?? 0) / challenge.max_submissions) * 100))
                    : null

                  return (
                    <Link
                      key={challenge.id}
                      href={`/challenges/${challenge.slug}`}
                      style={{
                        display: 'block', textDecoration: 'none',
                        background: 'var(--bg2)',
                        border: isFeatured ? '1px solid var(--amber)' : '1px solid var(--border)',
                        borderRadius: 'var(--radius-lg)',
                        padding: 22,
                        transition: 'border-color .3s, transform .25s',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                      className="challenge-card-hover"
                    >
                      {/* Featured glow */}
                      {isFeatured && (
                        <div style={{
                          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                          background: 'linear-gradient(90deg, transparent, var(--amber), transparent)',
                        }} />
                      )}

                      {/* Top row: badges */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                        <span style={{
                          fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600,
                          padding: '3px 10px', borderRadius: 100,
                          background: diff.bg, color: diff.color,
                          textTransform: 'uppercase', letterSpacing: 0.6,
                        }}>
                          {(challenge.difficulty || 'unknown').toUpperCase()}
                        </span>
                        {challenge.category && (
                          <span style={{
                            fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600,
                            padding: '3px 10px', borderRadius: 100,
                            background: 'var(--blue-dim)', color: 'var(--blue)',
                            textTransform: 'capitalize',
                          }}>
                            {challenge.category}
                          </span>
                        )}
                        {challenge.reward_multiplier && challenge.reward_multiplier > 1 && (
                          <span style={{
                            fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
                            padding: '3px 10px', borderRadius: 100,
                            background: 'var(--amber-dim)', color: 'var(--amber)',
                            marginLeft: 'auto',
                          }}>
                            {challenge.reward_multiplier}x REWARDS
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h2 style={{
                        fontFamily: 'var(--sans)', fontSize: 16, fontWeight: 700,
                        color: 'var(--text)', marginBottom: 8, lineHeight: 1.35,
                      }}>
                        {challenge.title}
                      </h2>

                      {/* Description */}
                      {challenge.description && (
                        <p style={{
                          fontFamily: 'var(--sans)', fontSize: 13.5,
                          color: 'var(--text-2)', lineHeight: 1.6,
                          marginBottom: 16,
                          display: '-webkit-box', WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>
                          {challenge.description}
                        </p>
                      )}

                      {/* Prize badges */}
                      {challenge.reward_multiplier && challenge.reward_multiplier >= 2 && (
                        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                          {[
                            { label: '1st', color: 'var(--gold)', bg: 'rgba(251,191,36,.12)' },
                            { label: '2nd', color: 'var(--silver)', bg: 'rgba(148,163,184,.12)' },
                            { label: '3rd', color: 'var(--bronze)', bg: 'rgba(196,124,74,.12)' },
                          ].map(prize => (
                            <span key={prize.label} style={{
                              fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
                              padding: '3px 10px', borderRadius: 6,
                              background: prize.bg, color: prize.color,
                              border: `1px solid ${prize.color}33`,
                            }}>
                              {prize.label}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Stats grid */}
                      <div style={{
                        display: 'grid', gridTemplateColumns: '1fr 1fr',
                        gap: '8px 16px', marginBottom: 16,
                      }}>
                        {challenge.expected_tools != null && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-3)' }}>Tools:</span>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text)', fontWeight: 600 }}>{challenge.expected_tools}</span>
                          </div>
                        )}
                        {challenge.expected_steps != null && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-3)' }}>Steps:</span>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text)', fontWeight: 600 }}>{challenge.expected_steps}</span>
                          </div>
                        )}
                        {challenge.time_limit_minutes != null && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-3)' }}>Time:</span>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text)', fontWeight: 600 }}>{challenge.time_limit_minutes}m</span>
                          </div>
                        )}
                        {challenge.cost_ceiling_usd != null && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-3)' }}>Cost cap:</span>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text)', fontWeight: 600 }}>${challenge.cost_ceiling_usd}</span>
                          </div>
                        )}
                      </div>

                      {/* Progress bar */}
                      {progress !== null && (
                        <div style={{ marginBottom: 14 }}>
                          <div style={{
                            height: 4, borderRadius: 2,
                            background: 'var(--bg3)',
                            overflow: 'hidden',
                          }}>
                            <div style={{
                              height: '100%', borderRadius: 2,
                              width: `${progress}%`,
                              background: 'var(--amber)',
                              transition: 'width .5s ease',
                            }} />
                          </div>
                        </div>
                      )}

                      {/* Footer */}
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        borderTop: '1px solid var(--border)', paddingTop: 14,
                      }}>
                        <span style={{
                          fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-3)',
                        }}>
                          {challenge.submission_count ?? 0} / {challenge.max_submissions ?? '\u221e'} submissions
                        </span>
                        <span style={{
                          fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600,
                          color: 'var(--amber)',
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                        }}>
                          View details
                          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div style={{
                textAlign: 'center', padding: '80px 20px',
                color: 'var(--text-3)',
              }}>
                <p style={{
                  fontFamily: 'var(--serif)', fontSize: 20, fontStyle: 'italic',
                  color: 'var(--text-2)', marginBottom: 8,
                }}>
                  No active challenges found
                </p>
                <p style={{ fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--text-3)' }}>
                  {searchParams.category || searchParams.difficulty || searchQuery
                    ? 'Try adjusting your filters.'
                    : 'Challenges will appear once they are created.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── How Challenges Work ── */}
      <div style={{
        borderTop: '1px solid var(--border)',
        background: 'var(--bg2)',
        padding: '72px 40px',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--amber)',
            textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16,
          }}>
            How It Works
          </div>
          <h2 style={{
            fontFamily: 'var(--serif)', fontSize: 32, fontStyle: 'italic',
            color: 'var(--text)', marginBottom: 48,
          }}>
            How Challenges Work
          </h2>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24,
          }}
          className="how-grid"
          >
            {[
              {
                step: '01',
                title: 'Pick a Challenge',
                desc: 'Browse active challenges filtered by category, difficulty, and reward tier. Each has clear success criteria.',
              },
              {
                step: '02',
                title: 'Solve with Tools',
                desc: 'Use MCP tools to complete the workflow. Your run is scored on completeness, quality, and efficiency.',
              },
              {
                step: '03',
                title: 'Earn Rewards',
                desc: 'Top submissions earn routing credits, reputation points, and leaderboard placement. Higher multipliers = bigger prizes.',
              },
            ].map(item => (
              <div key={item.step} style={{
                background: 'var(--bg3)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)', padding: 28,
                textAlign: 'left',
              }}>
                <div style={{
                  fontFamily: 'var(--serif)', fontSize: 36, fontStyle: 'italic',
                  color: 'var(--amber)', lineHeight: 1, marginBottom: 14,
                }}>
                  {item.step}
                </div>
                <div style={{
                  fontFamily: 'var(--sans)', fontSize: 16, fontWeight: 700,
                  color: 'var(--text)', marginBottom: 8,
                }}>
                  {item.title}
                </div>
                <p style={{
                  fontFamily: 'var(--sans)', fontSize: 13.5, color: 'var(--text-2)',
                  lineHeight: 1.65,
                }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div style={{ marginTop: 48 }}>
            <Link href="/submit" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '12px 28px', borderRadius: 8,
              background: 'var(--amber)', color: '#000',
              fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700,
              textDecoration: 'none', textTransform: 'uppercase', letterSpacing: 0.6,
              transition: 'opacity .2s',
            }}>
              Submit a Challenge
            </Link>
            <Link href="/leaderboards" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '12px 28px', borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text)',
              fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600,
              textDecoration: 'none', textTransform: 'uppercase', letterSpacing: 0.6,
              marginLeft: 12,
              transition: 'border-color .2s',
            }}>
              View Leaderboards
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
