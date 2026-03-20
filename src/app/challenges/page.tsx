import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'

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

const CHALLENGE_ICONS = ['🔥', '🧑‍💻', '🗄️', '🖥️', '⚡', '🧪', '🌐', '📊']

const FAKE_DEADLINES = ['2d 14h', '4d 8h', '6d 0h', '1d 22h', '3d 6h', '5d 11h']

function generateParticipants(idx: number, max: number): number {
  // Deterministic fake participant count based on index
  return Math.min(max, Math.floor(max * (0.3 + ((idx * 17 + 7) % 10) * 0.06)))
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

  const activeCount = filteredChallenges.length

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* ── Page Hero ── */}
      <div style={{
        padding: '72px 40px 56px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg2)',
      }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 14px', borderRadius: 100,
            border: '1px solid var(--amber-dim)', background: 'var(--amber-dim)',
            fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--amber)',
            textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 20,
          }}>
            Challenges &middot; 3&times; Rewards
          </div>

          <h1 style={{
            fontFamily: 'var(--serif)', fontSize: 48, lineHeight: 1.1,
            color: 'var(--text)', fontWeight: 400, margin: '0 0 16px',
            maxWidth: 640,
          }}>
            Compete on real tasks.<br />
            <span style={{ color: 'var(--amber)', fontStyle: 'italic' }}>Earn credits.</span>
          </h1>

          <p style={{
            fontFamily: 'var(--sans)', fontSize: 15, lineHeight: 1.7,
            color: 'var(--text-2)', maxWidth: 520, margin: '0 0 0',
          }}>
            Solve real-world workflow challenges using MCP tools, earn reward
            multipliers, and climb the leaderboard.
          </p>
        </div>
      </div>

      {/* ── Active challenges header ── */}
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 40px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 0',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Green pulse dot */}
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: 'var(--green)',
              boxShadow: '0 0 6px var(--green)',
              display: 'inline-block',
            }} />
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600,
              color: 'var(--text)', textTransform: 'uppercase', letterSpacing: 0.6,
            }}>
              Active challenges
            </span>
          </div>

          <span style={{
            fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-3)',
          }}>
            {activeCount} active &middot; ends in 48h&ndash;6d
          </span>
        </div>
      </div>

      {/* ── 2-column Challenge Grid ── */}
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '32px 40px 64px' }}>
        {filteredChallenges.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 20,
          }}
          className="challenges-grid"
          >
            {filteredChallenges.map((challenge: any, idx: number) => {
              const diff = DIFFICULTY_COLORS[challenge.difficulty] || { bg: 'var(--bg3)', color: 'var(--text-3)' }
              const isFeatured = challenge.reward_multiplier && challenge.reward_multiplier >= 2
              const icon = CHALLENGE_ICONS[idx % CHALLENGE_ICONS.length]
              const deadline = FAKE_DEADLINES[idx % FAKE_DEADLINES.length]
              const multiplier = challenge.reward_multiplier || 1
              const maxParticipants = challenge.max_submissions || 100
              const currentParticipants = challenge.submission_count ?? generateParticipants(idx, maxParticipants)
              const progress = Math.min(100, Math.round((currentParticipants / maxParticipants) * 100))

              // Prize amounts derived from multiplier
              const prizeGold = Math.round(multiplier * 200)
              const prizeSilver = Math.round(multiplier * 80)
              const prizeBronze = Math.round(multiplier * 30)

              // Profile name from category or slug
              const profileName = challenge.category
                ? `${challenge.category}-profile-v1`
                : challenge.slug
                  ? `${challenge.slug}-profile-v1`
                  : 'general-profile-v1'

              return (
                <div
                  key={challenge.id}
                  style={{
                    background: 'var(--bg2)',
                    border: isFeatured ? '1px solid var(--amber)' : '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 24,
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'border-color .3s',
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

                  {/* Top row: icon + meta */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginBottom: 14,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 22 }}>{icon}</span>
                      {multiplier > 1 && (
                        <span style={{
                          fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
                          padding: '3px 10px', borderRadius: 100,
                          background: 'var(--amber-dim)', color: 'var(--amber)',
                          textTransform: 'uppercase', letterSpacing: 0.6,
                        }}>
                          {multiplier}&times; REWARDS
                        </span>
                      )}
                    </div>
                    <span style={{
                      fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-3)',
                    }}>
                      Ends in {deadline}
                    </span>
                  </div>

                  {/* Challenge name */}
                  <h2 style={{
                    fontFamily: 'var(--sans)', fontSize: 18, fontWeight: 700,
                    color: 'var(--text)', marginBottom: 8, lineHeight: 1.35,
                  }}>
                    {challenge.title}
                  </h2>

                  {/* Description */}
                  {challenge.description && (
                    <p style={{
                      fontFamily: 'var(--sans)', fontSize: 13.5,
                      color: 'var(--text-2)', lineHeight: 1.6,
                      marginBottom: 14,
                      display: '-webkit-box', WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {challenge.description}
                    </p>
                  )}

                  {/* Profile tag */}
                  <div style={{
                    fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-3)',
                    marginBottom: 16,
                  }}>
                    Profile: <span style={{ color: 'var(--text-2)' }}>{profileName}</span>
                  </div>

                  {/* Prize badges row */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <span style={{
                      fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600,
                      padding: '4px 10px', borderRadius: 6,
                      background: 'rgba(251,191,36,.10)', color: '#fbbf24',
                      border: '1px solid rgba(251,191,36,.2)',
                    }}>
                      🥇 {prizeGold} credits
                    </span>
                    <span style={{
                      fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600,
                      padding: '4px 10px', borderRadius: 6,
                      background: 'rgba(148,163,184,.10)', color: '#94a3b8',
                      border: '1px solid rgba(148,163,184,.2)',
                    }}>
                      🥈 {prizeSilver}
                    </span>
                    <span style={{
                      fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600,
                      padding: '4px 10px', borderRadius: 6,
                      background: 'rgba(196,124,74,.10)', color: '#c47c4a',
                      border: '1px solid rgba(196,124,74,.2)',
                    }}>
                      🥉 {prizeBronze}
                    </span>
                  </div>

                  {/* Progress bar with participants */}
                  <div style={{ marginBottom: 18 }}>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      marginBottom: 6,
                    }}>
                      <span style={{
                        fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-3)',
                      }}>
                        Participants: {currentParticipants} / {maxParticipants}
                      </span>
                    </div>
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

                  {/* CTA button */}
                  <Link
                    href={`/challenges/${challenge.slug}`}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '10px 22px', borderRadius: 8,
                      fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700,
                      textDecoration: 'none', textTransform: 'uppercase', letterSpacing: 0.6,
                      transition: 'opacity .2s',
                      ...(isFeatured
                        ? {
                            background: 'var(--amber)', color: '#000',
                            border: '1px solid var(--amber)',
                          }
                        : {
                            background: 'transparent', color: 'var(--text)',
                            border: '1px solid var(--border)',
                          }
                      ),
                    }}
                  >
                    Enter challenge &rarr;
                  </Link>
                </div>
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

      {/* ── How It Works ── */}
      <div style={{
        borderTop: '1px solid var(--border)',
        background: 'var(--bg2)',
        padding: '72px 40px',
      }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--amber)',
            textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16,
            textAlign: 'center',
          }}>
            How It Works
          </div>
          <h2 style={{
            fontFamily: 'var(--serif)', fontSize: 32, fontStyle: 'italic',
            color: 'var(--text)', marginBottom: 48, textAlign: 'center',
          }}>
            Four steps to compete
          </h2>

          {/* 4-step grid with 1px borders between, no gaps */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}
          className="how-grid"
          >
            {[
              {
                step: '01',
                title: 'Pick a challenge',
                desc: 'Browse active challenges by category, difficulty, and reward tier.',
              },
              {
                step: '02',
                title: 'Choose your stack',
                desc: 'Select the MCP tools and agent configuration that fits the task.',
              },
              {
                step: '03',
                title: 'Run and report',
                desc: 'Execute the workflow and submit telemetry through the API.',
              },
              {
                step: '04',
                title: 'Earn medals + credits',
                desc: 'Top runs earn routing credits, medals, and leaderboard placement.',
              },
            ].map((item, i) => (
              <div key={item.step} style={{
                padding: 28,
                textAlign: 'left',
                borderRight: i < 3 ? '1px solid var(--border)' : 'none',
                background: 'var(--bg2)',
              }}>
                <div style={{
                  fontFamily: 'var(--serif)', fontSize: 32, fontStyle: 'italic',
                  color: 'var(--amber)', lineHeight: 1, marginBottom: 14,
                }}>
                  {item.step}
                </div>
                <div style={{
                  fontFamily: 'var(--sans)', fontSize: 15, fontWeight: 700,
                  color: 'var(--text)', marginBottom: 8,
                }}>
                  {item.title}
                </div>
                <p style={{
                  fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--text-2)',
                  lineHeight: 1.65, margin: 0,
                }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom CTA ── */}
      <div style={{
        borderTop: '1px solid var(--border)',
        padding: '80px 40px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Glow effect */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 400, height: 200, borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(251,191,36,.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <h2 style={{
          fontFamily: 'var(--serif)', fontSize: 36, fontStyle: 'italic',
          color: 'var(--text)', marginBottom: 16, position: 'relative',
        }}>
          Ready to compete?
        </h2>
        <p style={{
          fontFamily: 'var(--sans)', fontSize: 15, color: 'var(--text-2)',
          maxWidth: 440, margin: '0 auto 32px', lineHeight: 1.7,
          position: 'relative',
        }}>
          Join the next challenge and prove your agent stack against real-world tasks.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', position: 'relative' }}>
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
            transition: 'border-color .2s',
          }}>
            View Leaderboards
          </Link>
        </div>
      </div>
    </div>
  )
}
