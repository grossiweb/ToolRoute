'use client'

import Link from 'next/link'

/* ── Types ──────────────────────────────────────────────── */
interface Challenge {
  id: string
  slug: string
  title: string
  description: string | null
  category: string | null
  difficulty: string | null
  reward_multiplier: number | null
  max_submissions: number | null
  submission_count: number | null
  expected_tools: number | null
  expected_steps: number | null
  time_limit_minutes: number | null
  cost_ceiling_usd: number | null
  status: string
}

interface Props {
  challenges: Challenge[]
}

/* ── Icon map ────────────────────────────────────────────── */
function challengeIcon(cat: string | null, title: string): string {
  const t = `${cat || ''} ${title}`.toLowerCase()
  if (t.includes('web') || t.includes('research') || t.includes('search')) return '🔥'
  if (t.includes('repo') || t.includes('code') || t.includes('dev')) return '🧑‍💻'
  if (t.includes('database') || t.includes('sql') || t.includes('query') || t.includes('data')) return '🗄️'
  if (t.includes('browser') || t.includes('task') || t.includes('completion')) return '🖥️'
  if (t.includes('content') || t.includes('write') || t.includes('summary')) return '✏️'
  if (t.includes('sales') || t.includes('crm') || t.includes('lead')) return '💼'
  return '🏆'
}

/* ── Component ──────────────────────────────────────────── */
export function ChallengesGrid({ challenges }: Props) {
  return (
    <div>
      {/* Active challenges header */}
      <div style={{
        padding: '32px 0 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 1.5,
          textTransform: 'uppercase' as const, color: 'var(--amber)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%', background: 'var(--green)',
            boxShadow: '0 0 6px var(--green)', display: 'inline-block',
            animation: 'pulse-dot 2s infinite',
          }} />
          Active challenges
        </div>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-3)' }}>
          {challenges.length} active
        </span>
      </div>

      {/* Challenge cards grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14,
        paddingBottom: 40,
      }}>
        {challenges.map((challenge, idx) => {
          const isFeatured = challenge.reward_multiplier != null && challenge.reward_multiplier >= 3
          const progress = challenge.max_submissions
            ? Math.min(100, Math.round(((challenge.submission_count ?? 0) / challenge.max_submissions) * 100))
            : null

          return (
            <Link
              key={challenge.id}
              href={`/challenges/${challenge.slug}`}
              style={{
                display: 'block', textDecoration: 'none',
                background: isFeatured
                  ? 'linear-gradient(135deg, var(--bg2) 0%, rgba(245,158,11,.04) 100%)'
                  : 'var(--bg2)',
                border: isFeatured ? '1px solid rgba(245,158,11,.25)' : '1px solid var(--border)',
                borderRadius: 18, padding: 28, position: 'relative',
                overflow: 'hidden', transition: 'border-color .3s, transform .25s',
              }}
              className="challenge-card-link"
            >
              {/* Top row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, background: 'var(--bg3)', border: '1px solid var(--border)',
                }}>
                  {challengeIcon(challenge.category, challenge.title)}
                </div>
                <div style={{ textAlign: 'right' as const }}>
                  {challenge.reward_multiplier && challenge.reward_multiplier > 1 && (
                    <div style={{
                      fontFamily: 'var(--mono)', fontSize: 11,
                      padding: '3px 9px', borderRadius: 5,
                      background: 'rgba(245,158,11,.12)', color: 'var(--amber)',
                      border: '1px solid rgba(245,158,11,.2)', marginBottom: 5,
                      display: 'inline-block',
                    }}>
                      {challenge.reward_multiplier}× REWARDS
                    </div>
                  )}
                  {challenge.time_limit_minutes && (
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-3)' }}>
                      {challenge.time_limit_minutes}m time limit
                    </div>
                  )}
                </div>
              </div>

              {/* Title + desc */}
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 6, letterSpacing: -.1 }}>
                {challenge.title}
              </div>
              <div style={{
                fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 18,
                overflow: 'hidden', display: '-webkit-box',
                WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
              }}>
                {challenge.description}
              </div>

              {/* Profile tag */}
              {challenge.category && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14,
                  fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-3)',
                }}>
                  Category:
                  <span style={{
                    padding: '2px 8px', borderRadius: 5,
                    background: 'var(--bg3)', border: '1px solid var(--border)',
                    color: 'var(--text-3)',
                  }}>
                    {challenge.category}
                  </span>
                  {challenge.difficulty && (
                    <span style={{
                      padding: '2px 8px', borderRadius: 5,
                      background: challenge.difficulty === 'expert' ? 'rgba(239,68,68,.12)' :
                                  challenge.difficulty === 'advanced' ? 'rgba(249,115,22,.12)' :
                                  challenge.difficulty === 'intermediate' ? 'var(--amber-dim)' : 'var(--green-dim)',
                      color: challenge.difficulty === 'expert' ? '#ef4444' :
                             challenge.difficulty === 'advanced' ? '#f97316' :
                             challenge.difficulty === 'intermediate' ? 'var(--amber)' : 'var(--green)',
                      textTransform: 'capitalize' as const,
                    }}>
                      {challenge.difficulty}
                    </span>
                  )}
                </div>
              )}

              {/* Prize badges */}
              {challenge.reward_multiplier && challenge.reward_multiplier >= 2 && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <span style={prizeStyle('rgba(251,191,36,.1)', '#fbbf24', 'rgba(251,191,36,.2)')}>🥇 Gold</span>
                  <span style={prizeStyle('rgba(148,163,184,.1)', '#94a3b8', 'rgba(148,163,184,.2)')}>🥈 Silver</span>
                  <span style={prizeStyle('rgba(196,124,74,.1)', '#c47c4a', 'rgba(196,124,74,.2)')}>🥉 Bronze</span>
                </div>
              )}

              {/* Progress */}
              {progress !== null && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginBottom: 5, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-3)',
                  }}>
                    <span>Participants</span>
                    <span>{challenge.submission_count ?? 0} / {challenge.max_submissions}</span>
                  </div>
                  <div style={{ height: 5, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 3, width: `${progress}%`,
                      background: 'var(--amber)',
                    }} />
                  </div>
                </div>
              )}

              {/* Button */}
              <div style={{
                width: '100%', padding: 10, borderRadius: 9, border: 'none',
                background: isFeatured ? 'var(--amber)' : 'transparent',
                color: isFeatured ? '#000' : 'var(--text-2)',
                fontFamily: 'var(--sans)', fontSize: 14, fontWeight: 700,
                textAlign: 'center' as const,
                ...(isFeatured ? {} : { border: '1px solid var(--border-bright)' }),
              }}>
                Enter challenge →
              </div>
            </Link>
          )
        })}
      </div>

      {challenges.length === 0 && (
        <div style={{ textAlign: 'center' as const, padding: '80px 0', color: 'var(--text-3)' }}>
          <p style={{ fontFamily: 'var(--serif)', fontSize: 20, fontStyle: 'italic', color: 'var(--text-2)', marginBottom: 8 }}>
            No active challenges found
          </p>
          <p style={{ fontSize: 14 }}>Challenges will appear once they are created.</p>
        </div>
      )}

      {/* How challenges work */}
      <div style={{ paddingTop: 40, borderTop: '1px solid var(--border)' }}>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 1.5,
          textTransform: 'uppercase' as const, color: 'var(--amber)',
          marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ display: 'block', width: 20, height: 1, background: 'var(--amber)', opacity: .6 }} />
          How challenges work
        </div>
        <h2 style={{ fontFamily: 'var(--serif)', fontSize: 32, fontWeight: 400, color: 'var(--text)' }}>
          Real tasks. Real data. <em style={{ fontStyle: 'italic', color: 'var(--amber)' }}>Real rewards.</em>
        </h2>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1,
          background: 'var(--border)', border: '1px solid var(--border)',
          borderRadius: 16, overflow: 'hidden', marginTop: 32,
        }}>
          {[
            { num: '01', title: 'Pick a challenge', desc: 'Choose from active challenges across 10 benchmark workflow profiles.' },
            { num: '02', title: 'Choose your stack', desc: 'Pick any model + MCP server combination. Your choice is the variable — the task is fixed.' },
            { num: '03', title: 'Run and report', desc: 'Execute the standardized task and submit your outcome data through the API or MCP tool.' },
            { num: '04', title: 'Earn medals + credits', desc: 'Top performers earn Gold/Silver/Bronze plus routing credits and reputation that unlock higher tiers.' },
          ].map(step => (
            <div key={step.num} style={{ background: 'var(--bg2)', padding: '24px 20px' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--amber)', marginBottom: 10, letterSpacing: .5 }}>
                {step.num}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                {step.title}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55 }}>
                {step.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{
        margin: '40px 0 60px', padding: '48px 56px',
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 18, textAlign: 'center' as const, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)',
          width: 500, height: 300,
          background: 'radial-gradient(ellipse, rgba(245,158,11,.07), transparent)',
          pointerEvents: 'none',
        }} />
        <h2 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 400, marginBottom: 12 }}>
          Your stack vs the field. <em style={{ fontStyle: 'italic', color: 'var(--amber)' }}>Find out who wins.</em>
        </h2>
        <p style={{ color: 'var(--text-2)', fontSize: 15, maxWidth: 440, margin: '0 auto 28px', lineHeight: 1.65 }}>
          Join a challenge in under 60 seconds. No setup required — just point ToolRoute at your agent&apos;s API endpoint.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/challenges" className="btn-primary" style={{ padding: '12px 24px', fontSize: 15, textDecoration: 'none' }}>
            View open challenges
          </Link>
          <Link href="/leaderboards" className="btn-ghost" style={{ padding: '12px 24px', fontSize: 15, textDecoration: 'none' }}>
            See leaderboards
          </Link>
        </div>
      </div>

      <style>{`
        .challenge-card-link:hover { border-color: var(--border-bright) !important; transform: translateY(-2px); }
        @media (max-width: 700px) {
          .challenge-card-link { /* handled by parent responsive */ }
        }
      `}</style>
    </div>
  )
}

function prizeStyle(bg: string, color: string, border: string): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '5px 11px', borderRadius: 7,
    fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 500,
    background: bg, color, border: `1px solid ${border}`,
  }
}
