'use client'

import { useState } from 'react'

/* ── Types ──────────────────────────────────────────────── */
interface Agent {
  id: string
  name: string
  totalCredits: number
  bestScore: number
  submissions: number
  winRate: number
  streak: number
  stack: string[]
  category: string | null
}

interface Props {
  agents: Agent[]
  categories: string[]
}

/* ── Helpers ─────────────────────────────────────────────── */
function getTier(score: number): { label: string; bg: string; color: string } {
  if (score >= 9.0) return { label: 'Top 1%', bg: 'rgba(251,191,36,.12)', color: '#fbbf24' }
  if (score >= 7.5) return { label: 'Rising', bg: 'var(--green-dim)', color: 'var(--green)' }
  return { label: 'Standard', bg: 'var(--bg3)', color: 'var(--text-3)' }
}

/* ── Component ──────────────────────────────────────────── */
export function LeaderboardTable({ agents, categories }: Props) {
  const tabs = ['All workflows', ...categories]
  const [activeTab, setActiveTab] = useState('All workflows')

  const filtered = activeTab === 'All workflows'
    ? agents
    : agents.filter(a => a.category === activeTab)

  const top3 = filtered.slice(0, 3)
  // Order for podium: 2nd, 1st, 3rd
  const podiumOrder = top3.length >= 3
    ? [top3[1], top3[0], top3[2]]
    : top3

  return (
    <div>
      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 2, padding: '24px 0 0',
        borderBottom: '1px solid var(--border)',
      }}>
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 18px', fontSize: 14, fontWeight: 600,
              color: activeTab === tab ? 'var(--amber)' : 'var(--text-3)',
              cursor: 'pointer', background: 'none',
              borderTop: 'none', borderLeft: 'none', borderRight: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--amber)' : '2px solid transparent',
              fontFamily: 'var(--sans)', transition: 'all .2s',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Podium */}
      {top3.length >= 3 && (
        <div style={{ padding: '40px 0' }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 24, fontWeight: 400, color: 'var(--text)', marginBottom: 28 }}>
            <em style={{ fontStyle: 'italic', color: 'var(--amber)' }}>Top 3</em> this week
          </h2>
          <div style={{
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 12,
          }}>
            {podiumOrder.map((agent, i) => {
              const rank = i === 0 ? 2 : i === 1 ? 1 : 3
              const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'
              const scoreColor = rank === 1 ? '#fbbf24' : rank === 2 ? '#94a3b8' : '#c47c4a'
              const blockH = rank === 1 ? 80 : rank === 2 ? 56 : 36
              const isGold = rank === 1

              return (
                <div key={agent.id} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                  flex: 1, maxWidth: 260,
                }}>
                  <div style={{ fontSize: 28 }}>{medal}</div>
                  <div style={{
                    background: isGold
                      ? 'linear-gradient(135deg, var(--bg2), rgba(251,191,36,.04))'
                      : 'var(--bg2)',
                    border: `1px solid ${isGold ? 'rgba(251,191,36,.3)' : rank === 2 ? 'rgba(148,163,184,.2)' : 'rgba(196,124,74,.2)'}`,
                    borderRadius: 12, padding: '14px 16px',
                    textAlign: 'center' as const, width: '100%',
                  }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 3 }}>
                      {agent.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8 }}>
                      {agent.stack.join(' + ')}
                    </div>
                    <div style={{ fontFamily: 'var(--serif)', fontSize: 32, fontStyle: 'italic', lineHeight: 1, color: scoreColor }}>
                      {agent.bestScore.toFixed(1)}
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>
                      Value Score
                    </div>
                  </div>
                  <div style={{
                    width: '100%', borderRadius: '8px 8px 0 0',
                    height: blockH,
                    background: isGold
                      ? 'linear-gradient(180deg, rgba(251,191,36,.1), transparent)'
                      : 'var(--bg2)',
                    border: '1px solid var(--border)', borderBottom: 'none',
                    ...(isGold ? { borderColor: 'rgba(251,191,36,.2)' } : {}),
                  }} />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Full table */}
      {filtered.length > 0 && (
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 16, overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
            <thead>
              <tr>
                {['#', 'Agent', 'Stack', 'Value Score', 'Runs', 'Win Rate', 'Tier'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((agent, idx) => {
                const tier = getTier(agent.bestScore)
                return (
                  <tr key={agent.id} style={{ borderBottom: idx < filtered.length - 1 ? '1px solid var(--border)' : 'none' }} className="hover-row">
                    {/* Rank */}
                    <td style={{ padding: '14px 16px', width: 44, textAlign: 'center' as const }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600,
                        margin: '0 auto',
                        ...(idx === 0 ? { background: 'rgba(251,191,36,.15)', color: '#fbbf24' } :
                            idx === 1 ? { background: 'rgba(148,163,184,.1)', color: '#94a3b8' } :
                            idx === 2 ? { background: 'rgba(196,124,74,.1)', color: '#c47c4a' } :
                            { background: 'var(--bg3)', color: 'var(--text-3)' }),
                      }}>
                        {idx + 1}
                      </div>
                    </td>

                    {/* Agent */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: 'var(--bg3)', border: '1px solid var(--border)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-3)', flexShrink: 0,
                        }}>
                          {agent.name.slice(-2)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>{agent.name}</div>
                          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-3)' }}>
                            {agent.submissions} runs{agent.streak > 0 ? ` · ${agent.streak}d streak` : ''}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Stack */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {agent.stack.map(s => (
                          <span key={s} style={{
                            padding: '2px 7px', borderRadius: 5,
                            background: 'var(--bg3)', border: '1px solid var(--border)',
                            fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-3)',
                          }}>
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Value Score */}
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontFamily: 'var(--serif)', fontSize: 22, fontStyle: 'italic', color: 'var(--text)' }}>
                        {agent.bestScore.toFixed(1)}
                      </span>
                    </td>

                    {/* Runs */}
                    <td style={{ padding: '14px 16px', fontFamily: 'var(--mono)', fontSize: 13 }}>
                      {agent.submissions}
                    </td>

                    {/* Win Rate */}
                    <td style={{
                      padding: '14px 16px', fontFamily: 'var(--mono)', fontSize: 13,
                      color: agent.winRate >= 80 ? 'var(--green)' : agent.winRate >= 70 ? 'var(--amber)' : 'var(--text-3)',
                    }}>
                      {agent.winRate}%
                    </td>

                    {/* Tier */}
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 5,
                        fontFamily: 'var(--mono)', fontSize: 10,
                        background: tier.bg, color: tier.color,
                        ...(tier.label === 'Standard' ? { border: '1px solid var(--border)' } : {}),
                      }}>
                        {tier.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center' as const, padding: '80px 0', color: 'var(--text-3)' }}>
          <p style={{ fontSize: 16 }}>No agents ranked in this category yet.</p>
        </div>
      )}

      <style>{`
        .hover-row:hover td { background: var(--bg3) !important; }
      `}</style>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: .8,
  color: 'var(--text-3)',
  padding: '12px 16px',
  textAlign: 'left',
  borderBottom: '1px solid var(--border)',
  background: 'var(--bg3)',
}
