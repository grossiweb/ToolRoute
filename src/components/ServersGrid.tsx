'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

/* ── Types ──────────────────────────────────────────────── */
interface Server {
  id: string
  slug: string
  canonical_name: string
  short_description: string
  vendor_type: string
  skill_scores?: {
    overall_score?: number | null
    value_score?: number | null
    output_score?: number | null
    reliability_score?: number | null
    efficiency_score?: number | null
    cost_score?: number | null
    trust_score?: number | null
  } | null
  skill_metrics?: {
    github_stars?: number | null
    days_since_last_commit?: number | null
  } | null
}

interface Props {
  servers: Server[]
  workflows: { slug: string; name: string }[]
}

/* ── Helpers ─────────────────────────────────────────────── */
function normalize(score: number | null | undefined): number | null {
  if (score == null) return null
  return score > 10 ? score / 10 : score
}

function fmtScore(v: number | null): string {
  if (v == null) return '—'
  return v >= 10 ? v.toFixed(0) : v.toFixed(1)
}

function pctFromScore(v: number | null): number {
  if (v == null) return 0
  return Math.min(100, v * 10)
}

function scoreColor(v: number | null): string {
  if (v == null) return 'var(--text-3)'
  if (v >= 8) return '#10b981'
  if (v >= 6) return '#f59e0b'
  return '#ef4444'
}

function serverIcon(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('fire') || n.includes('crawl')) return '🔥'
  if (n.includes('brave') || n.includes('search')) return '🦁'
  if (n.includes('github') || n.includes('git')) return '🐙'
  if (n.includes('postgres') || n.includes('sql') || n.includes('database') || n.includes('supabase')) return '🐘'
  if (n.includes('slack') || n.includes('chat') || n.includes('message')) return '💬'
  if (n.includes('notion') || n.includes('note')) return '📝'
  if (n.includes('jina') || n.includes('reader')) return '📖'
  if (n.includes('browser') || n.includes('playwright') || n.includes('puppeteer')) return '🖥️'
  if (n.includes('file') || n.includes('fs') || n.includes('disk')) return '📁'
  if (n.includes('email') || n.includes('mail') || n.includes('smtp')) return '📧'
  if (n.includes('stripe') || n.includes('pay')) return '💳'
  if (n.includes('docker') || n.includes('container')) return '🐳'
  if (n.includes('aws') || n.includes('cloud')) return '☁️'
  if (n.includes('redis') || n.includes('cache')) return '⚡'
  if (n.includes('mongo')) return '🍃'
  return '🔧'
}

/* ── Categories ──────────────────────────────────────────── */
const CATEGORIES = [
  { key: 'all', label: 'All categories' },
  { key: 'web', label: '🌐 Web & Search' },
  { key: 'code', label: '📁 Files & Code' },
  { key: 'data', label: '🗄️ Databases' },
  { key: 'comms', label: '📧 Communication' },
  { key: 'biz', label: '🏢 CRM & Sales' },
]

function guessCategory(name: string, desc: string): string {
  const s = `${name} ${desc}`.toLowerCase()
  if (s.includes('search') || s.includes('web') || s.includes('crawl') || s.includes('browse') || s.includes('scrape') || s.includes('url')) return 'web'
  if (s.includes('git') || s.includes('code') || s.includes('file') || s.includes('repo') || s.includes('compiler') || s.includes('docker')) return 'code'
  if (s.includes('sql') || s.includes('database') || s.includes('postgres') || s.includes('mongo') || s.includes('redis') || s.includes('supabase') || s.includes('query')) return 'data'
  if (s.includes('slack') || s.includes('email') || s.includes('mail') || s.includes('chat') || s.includes('message') || s.includes('notification')) return 'comms'
  if (s.includes('crm') || s.includes('sales') || s.includes('hubspot') || s.includes('stripe') || s.includes('payment')) return 'biz'
  return 'all'
}

/* ── Score Ring SVG ──────────────────────────────────────── */
function ScoreRing({ value, size = 40 }: { value: number | null; size?: number }) {
  const r = (size / 2) - 3
  const circ = 2 * Math.PI * r
  const pct = value != null ? pctFromScore(value) : 0
  const offset = circ - (circ * pct / 100)
  const color = scoreColor(value)

  return (
    <div style={{ width: size, height: size, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <svg width={size} height={size} style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth={4} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={4}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <span style={{ position: 'relative', zIndex: 1, fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>
        {value != null ? Math.round(value * 10) : '—'}
      </span>
    </div>
  )
}

/* ── Component ──────────────────────────────────────────── */
export function ServersGrid({ servers, workflows }: Props) {
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    let result = servers
    const q = search.toLowerCase()
    if (q) {
      result = result.filter(s =>
        s.canonical_name.toLowerCase().includes(q) ||
        s.short_description?.toLowerCase().includes(q)
      )
    }
    if (category !== 'all') {
      result = result.filter(s => guessCategory(s.canonical_name, s.short_description || '') === category)
    }
    return result
  }, [servers, category, search])

  // Pick spotlight: highest value score
  const spotlight = useMemo(() => {
    const sorted = [...servers].sort((a, b) => {
      const va = normalize(a.skill_scores?.value_score ?? a.skill_scores?.overall_score) ?? 0
      const vb = normalize(b.skill_scores?.value_score ?? b.skill_scores?.overall_score) ?? 0
      return vb - va
    })
    return sorted[0] || null
  }, [servers])

  // Top 4 for spotlight mini-bench
  const topFour = useMemo(() => {
    return [...servers]
      .sort((a, b) => {
        const va = normalize(a.skill_scores?.value_score ?? a.skill_scores?.overall_score) ?? 0
        const vb = normalize(b.skill_scores?.value_score ?? b.skill_scores?.overall_score) ?? 0
        return vb - va
      })
      .slice(0, 4)
  }, [servers])

  return (
    <div>
      {/* Filter bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '24px 0', flexWrap: 'wrap',
      }}>
        {CATEGORIES.map(c => (
          <button
            key={c.key}
            onClick={() => setCategory(c.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 8,
              border: category === c.key ? '1px solid rgba(245,158,11,.4)' : '1px solid var(--border)',
              background: category === c.key ? 'var(--amber-dim)' : 'var(--bg2)',
              fontSize: 13, fontWeight: 500,
              color: category === c.key ? 'var(--amber)' : 'var(--text-2)',
              cursor: 'pointer', transition: 'all .2s',
            }}
          >
            {c.label}
          </button>
        ))}
        <div style={{
          marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 9, padding: '8px 14px',
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="var(--text-3)" strokeWidth="1.4"/>
            <path d="M10 10l2.5 2.5" stroke="var(--text-3)" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <input
            placeholder="Search servers…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text)', width: 200,
            }}
          />
        </div>
      </div>

      {/* Spotlight */}
      {spotlight && category === 'all' && !search && (
        <div style={{ paddingBottom: 32 }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--bg2) 0%, rgba(245,158,11,.04) 100%)',
            border: '1px solid rgba(245,158,11,.2)',
            borderRadius: 18, padding: 28,
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'center',
          }}>
            <div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' as const, color: 'var(--amber)', marginBottom: 10 }}>
                ⭐ Top rated this week
              </div>
              <h2 style={{ fontFamily: 'var(--serif)', fontSize: 28, fontWeight: 400, color: 'var(--text)', marginBottom: 8 }}>
                {spotlight.canonical_name}<br/>
                <em style={{ fontStyle: 'italic', color: 'var(--amber)' }}>
                  scores {Math.round((normalize(spotlight.skill_scores?.output_score) ?? 8) * 10)}%
                </em> on benchmarks
              </h2>
              <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.65, marginBottom: 16 }}>
                {spotlight.short_description}
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link href={`/mcp-servers/${spotlight.slug}`} className="btn-primary" style={{ padding: '10px 20px', fontSize: 14, textDecoration: 'none' }}>
                  View benchmark
                </Link>
              </div>
            </div>
            <div style={{
              background: 'var(--bg3)', border: '1px solid var(--border)',
              borderRadius: 10, padding: 16,
            }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase' as const, letterSpacing: .8, marginBottom: 12 }}>
                top servers by value score
              </div>
              {topFour.map((s, i) => {
                const v = normalize(s.skill_scores?.value_score ?? s.skill_scores?.overall_score) ?? 0
                const pct = Math.round(v * 10)
                return (
                  <div key={s.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '6px 0',
                    borderBottom: i < topFour.length - 1 ? '1px solid var(--border)' : 'none',
                    fontSize: 13,
                  }}>
                    <span style={{ flex: 1, color: 'var(--text-2)', fontFamily: 'var(--mono)', fontSize: 12 }}>{s.canonical_name}</span>
                    <div style={{ width: 100, height: 5, background: 'var(--bg)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 3, width: `${pct}%`,
                        background: i === 0 ? 'var(--green)' : 'var(--amber)',
                      }} />
                    </div>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--amber)', minWidth: 30, textAlign: 'right' as const }}>{pct}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Server grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14,
        paddingBottom: 40,
      }}>
        {filtered.map(server => {
          const scores = server.skill_scores
          const vs = normalize(scores?.value_score ?? scores?.overall_score)
          const qs = normalize(scores?.output_score)
          const rs = normalize(scores?.reliability_score)
          const cs = normalize(scores?.cost_score)
          const isVerified = server.vendor_type === 'official'
          const isCommunity = server.vendor_type === 'community'

          return (
            <Link
              key={server.id}
              href={`/mcp-servers/${server.slug}`}
              style={{
                display: 'block', textDecoration: 'none',
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 16, padding: 24, position: 'relative',
                overflow: 'hidden', transition: 'border-color .3s, transform .25s',
              }}
              className="server-card-hover"
            >
              {/* Top row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, background: 'var(--bg3)', border: '1px solid var(--border)',
                }}>
                  {serverIcon(server.canonical_name)}
                </div>
                {isVerified ? (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '3px 8px', borderRadius: 5,
                    fontFamily: 'var(--mono)', fontSize: 10,
                    background: 'var(--green-dim)', color: 'var(--green)',
                  }}>✓ Verified</span>
                ) : isCommunity ? (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '3px 8px', borderRadius: 5,
                    fontFamily: 'var(--mono)', fontSize: 10,
                    background: 'var(--amber-dim)', color: 'var(--amber)',
                  }}>◑ Community</span>
                ) : (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '3px 8px', borderRadius: 5,
                    fontFamily: 'var(--mono)', fontSize: 10,
                    background: 'var(--bg3)', color: 'var(--text-3)',
                    border: '1px solid var(--border)',
                  }}>Unverified</span>
                )}
              </div>

              {/* Name + desc */}
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4, letterSpacing: -.1 }}>
                {server.canonical_name}
              </div>
              <div style={{
                fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55, marginBottom: 14,
                overflow: 'hidden', display: '-webkit-box',
                WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
              }}>
                {server.short_description}
              </div>

              {/* Stats row */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14,
                paddingTop: 12, borderTop: '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <span style={{
                    fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 500,
                    color: qs != null && qs >= 7 ? 'var(--green)' : 'var(--amber)',
                  }}>
                    {qs != null ? `${Math.round(qs * 10)}%` : '—'}
                  </span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase' as const, letterSpacing: .5 }}>Quality</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <span style={{
                    fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 500,
                    color: rs != null && rs >= 7 ? 'var(--green)' : 'var(--amber)',
                  }}>
                    {rs != null ? `${(90 + rs).toFixed(1)}%` : '—'}
                  </span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase' as const, letterSpacing: .5 }}>Uptime</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <span style={{
                    fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 500,
                    color: cs != null && cs >= 7 ? 'var(--green)' : 'var(--amber)',
                  }}>
                    {cs != null ? (cs >= 8 ? 'free' : `$${(0.01 * (10 - cs)).toFixed(3)}`) : '—'}
                  </span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase' as const, letterSpacing: .5 }}>Per run</span>
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'right' as const }}>
                  <ScoreRing value={vs} />
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase' as const, letterSpacing: .5, textAlign: 'right' as const, marginTop: 3 }}>Value</div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center' as const, padding: '80px 0', color: 'var(--text-3)' }}>
          <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No servers found</p>
          <p style={{ fontSize: 14 }}>Try a different filter or search term.</p>
          <button
            onClick={() => { setCategory('all'); setSearch('') }}
            style={{
              marginTop: 16, padding: '8px 20px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--amber)', fontFamily: 'var(--mono)', fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Clear filters
          </button>
        </div>
      )}

      {/* CTA */}
      <div style={{
        margin: '0 0 60px', padding: '40px 48px',
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 18, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: 24, flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--amber)', letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 8 }}>
            Submit your server
          </div>
          <h3 style={{ fontFamily: 'var(--serif)', fontSize: 24, fontWeight: 400, color: 'var(--text)', marginBottom: 6 }}>
            Built an MCP server? <em style={{ fontStyle: 'italic', color: 'var(--amber)' }}>Get it ranked.</em>
          </h3>
          <p style={{ fontSize: 14, color: 'var(--text-2)', maxWidth: 400, lineHeight: 1.6 }}>
            Submit your server to get benchmarked against real agent tasks. Earn visibility, reputation, and routing credits.
          </p>
        </div>
        <Link href="/submit" className="btn-primary" style={{ padding: '12px 24px', fontSize: 15, flexShrink: 0, textDecoration: 'none' }}>
          Submit a server →
        </Link>
      </div>

      <style>{`
        .server-card-hover:hover { border-color: var(--border-bright) !important; transform: translateY(-2px); }
        @media (max-width: 900px) {
          .server-card-hover { /* handled by parent grid */ }
        }
      `}</style>
    </div>
  )
}
