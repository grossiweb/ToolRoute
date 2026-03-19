'use client'

import { useEffect, useState } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import { formatScore, getScoreColor } from '@/lib/scoring'
import Link from 'next/link'

export default function ComparePage() {
  const [skills, setSkills] = useState<any[]>([])
  const [selected, setSelected] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [rollups, setRollups] = useState<Record<string, any>>({})
  const [linkCopied, setLinkCopied] = useState(false)
  const supabase = createBrowserSupabaseClient()

  useEffect(() => {
    async function loadSkills() {
      const { data } = await supabase
        .from('skills')
        .select(`
          id, slug, canonical_name, vendor_type,
          skill_scores ( overall_score, value_score, trust_score, reliability_score, output_score, efficiency_score, cost_score ),
          skill_metrics ( github_stars, days_since_last_commit ),
          skill_cost_models ( pricing_model, monthly_base_cost_usd )
        `)
        .eq('status', 'active')
        .order('canonical_name')
        .limit(500)
      setSkills(data || [])
    }
    loadSkills()
  }, [])

  // Auto-select from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const serverSlugs = params.get('servers')?.split(',')
    if (serverSlugs && serverSlugs.length > 0 && skills.length > 0 && selected.length === 0) {
      const matched = skills.filter(s => serverSlugs.includes(s.slug))
      if (matched.length > 0) setSelected(matched.slice(0, 4))
    }
  }, [skills])

  // Fetch rollups for selected skills
  useEffect(() => {
    async function loadRollups() {
      if (selected.length === 0) return
      const ids = selected.map((s) => s.id)
      const { data } = await supabase
        .from('skill_benchmark_rollups')
        .select('skill_id, cost_per_useful_outcome_usd')
        .in('skill_id', ids)
      if (data) {
        const map: Record<string, any> = {}
        for (const row of data) {
          map[row.skill_id] = row
        }
        setRollups(map)
      }
    }
    loadRollups()
  }, [selected])

  const filteredSkills = skills.filter(
    (s) =>
      !selected.find((sel) => sel.id === s.id) &&
      s.canonical_name.toLowerCase().includes(search.toLowerCase())
  )

  function addSkill(skill: any) {
    if (selected.length < 4) {
      setSelected([...selected, skill])
      setSearch('')
    }
  }

  function removeSkill(id: string) {
    setSelected(selected.filter((s) => s.id !== id))
  }

  const dimensions = [
    { key: 'value_score', label: 'Value Score' },
    { key: 'output_score', label: 'Output Quality' },
    { key: 'reliability_score', label: 'Reliability' },
    { key: 'efficiency_score', label: 'Efficiency' },
    { key: 'cost_score', label: 'Cost' },
    { key: 'trust_score', label: 'Trust' },
    { key: 'overall_score', label: 'Overall' },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="page-hero" style={{ padding: '56px 0 40px', borderBottom: '1px solid var(--border)' }}>
        <div className="page-hero-label">COMPARE</div>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 400, lineHeight: 1.05, color: 'var(--text)', marginBottom: 12 }}>
          Compare MCP<br /><em style={{ fontStyle: 'italic', color: 'var(--amber)' }}>Servers.</em>
        </h1>
        <p className="text-[var(--text-2)]">
          Side-by-side comparison of MCP servers across outcome scoring dimensions.
        </p>
      </div>

      {/* Server selector */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }} className=" mb-8">
        <div className="flex items-center gap-3 flex-wrap mb-4">
          {selected.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-2 bg-brand-light text-brand px-3 py-1.5 rounded-full text-sm font-medium"
            >
              {s.canonical_name}
              <button
                onClick={() => removeSkill(s.id)}
                className="hover:text-red-600 transition-colors"
                aria-label={`Remove ${s.canonical_name}`}
              >
                &times;
              </button>
            </div>
          ))}
          {selected.length < 4 && (
            <div className="relative flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder={selected.length === 0 ? 'Search MCP servers to compare...' : 'Add another server...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border border-[var(--border)] rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-brand"
              />
              {search.length > 0 && filteredSkills.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  {filteredSkills.slice(0, 10).map((s) => (
                    <button
                      key={s.id}
                      onClick={() => addSkill(s)}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--bg2)] transition-colors flex items-center justify-between"
                    >
                      <span className="font-medium text-[var(--text)]">{s.canonical_name}</span>
                      {s.skill_scores?.overall_score != null && (
                        <span className="text-xs text-[var(--text-3)]">
                          {formatScore(s.skill_scores.overall_score)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <p className="text-xs text-[var(--text-3)]">
          {selected.length}/4 MCP servers selected
        </p>
      </div>

      {/* Share comparison */}
      {selected.length >= 2 && (
        <div className="flex items-center justify-between mb-8">
          <p className="text-sm text-[var(--text-2)]">
            Comparing <span className="font-semibold text-[var(--text-2)]">{selected.length}</span> servers across {dimensions.length} dimensions
          </p>
          <button
            onClick={() => {
              const slugs = selected.map(s => s.slug).join(',')
              const url = `${window.location.origin}/compare?servers=${slugs}`
              navigator.clipboard.writeText(url)
              setLinkCopied(true)
              setTimeout(() => setLinkCopied(false), 2000)
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm font-medium text-[var(--text-2)] hover:border-brand/30 hover:text-brand transition-all"
          >
            {linkCopied ? (
              <>
                <svg className="w-4 h-4 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Link Copied!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                Share Comparison
              </>
            )}
          </button>
        </div>
      )}

      {/* Comparison table */}
      {selected.length >= 2 ? (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }} className=" overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left px-4 py-3 font-semibold text-[var(--text-2)] text-xs w-36">
                  Dimension
                </th>
                {selected.map((s) => (
                  <th key={s.id} className="text-center px-4 py-3 min-w-[140px]">
                    <Link
                      href={`/mcp-servers/${s.slug}`}
                      className="font-bold text-[var(--text)] hover:text-brand transition-colors text-sm"
                    >
                      {s.canonical_name}
                    </Link>
                    {s.vendor_type === 'official' && (
                      <div className="mt-0.5">
                        <span className="badge bg-teal-light text-teal text-[10px]">Official</span>
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dimensions.map((dim) => {
                const values = selected.map(
                  (s) => s.skill_scores?.[dim.key] as number | null
                )
                const validValues = values.filter((v): v is number => v != null)
                const maxVal = validValues.length > 0 ? Math.max(...validValues) : null

                return (
                  <tr key={dim.key} className="border-b border-[var(--border)]">
                    <td className="px-4 py-3 font-medium text-[var(--text-2)] text-xs">
                      {dim.label}
                    </td>
                    {selected.map((s, idx) => {
                      const val = values[idx]
                      const isBest = val != null && val === maxVal && validValues.length > 1
                      return (
                        <td key={s.id} className="text-center px-4 py-3">
                          {val != null ? (
                            <span
                              className={`font-bold ${
                                isBest ? 'text-teal' : getScoreColor(val)?.split(' ')[0] || ''
                              }`}
                            >
                              {formatScore(val)}
                              {isBest && (
                                <span className="ml-1 text-[10px] text-teal font-normal">Best</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-[var(--text-3)]">&mdash;</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}

              {/* Cost per Useful Outcome row */}
              <tr className="border-b border-[var(--border)]">
                <td className="px-4 py-3 font-medium text-[var(--text-2)] text-xs">
                  <span className="group relative cursor-help">
                    Cost per Useful Outcome
                    <span className="pointer-events-none absolute left-0 bottom-full mb-1 w-56 rounded bg-gray-800 px-3 py-2 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      Total cost divided by successful task outcomes. Includes retries and correction overhead.
                    </span>
                  </span>
                </td>
                {selected.map((s) => {
                  const cost = rollups[s.id]?.cost_per_useful_outcome_usd
                  return (
                    <td key={s.id} className="text-center px-4 py-3 text-[var(--text-2)]">
                      {cost != null ? `$${Number(cost).toFixed(3)}` : '\u2014'}
                    </td>
                  )
                })}
              </tr>

              {/* GitHub stars row */}
              <tr className="border-b border-[var(--border)]">
                <td className="px-4 py-3 font-medium text-[var(--text-2)] text-xs">GitHub Stars</td>
                {selected.map((s) => (
                  <td key={s.id} className="text-center px-4 py-3 text-[var(--text-2)]">
                    {s.skill_metrics?.github_stars != null
                      ? s.skill_metrics.github_stars.toLocaleString()
                      : '\u2014'}
                  </td>
                ))}
              </tr>

              {/* Last commit row */}
              <tr className="border-b border-[var(--border)]">
                <td className="px-4 py-3 font-medium text-[var(--text-2)] text-xs">Last Commit</td>
                {selected.map((s) => {
                  const days = s.skill_metrics?.days_since_last_commit
                  return (
                    <td key={s.id} className="text-center px-4 py-3 text-[var(--text-2)]">
                      {days != null
                        ? days === 0
                          ? 'Today'
                          : `${days}d ago`
                        : '\u2014'}
                    </td>
                  )
                })}
              </tr>

              {/* Pricing row */}
              <tr>
                <td className="px-4 py-3 font-medium text-[var(--text-2)] text-xs">Pricing</td>
                {selected.map((s) => (
                  <td key={s.id} className="text-center px-4 py-3 text-[var(--text-2)] capitalize">
                    {s.skill_cost_models?.pricing_model?.replace(/_/g, ' ') || '\u2014'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-16 text-[var(--text-3)]">
          <p className="text-lg font-medium">Select at least 2 MCP servers to compare</p>
          <p className="text-sm mt-1">
            Use the search above to find and add MCP servers.
          </p>
        </div>
      )}

      {/* Why This Tool Wins — Verdict */}
      {selected.length >= 2 && (() => {
        const scoreDims = [
          { key: 'output_score', label: 'Output Quality' },
          { key: 'reliability_score', label: 'Reliability' },
          { key: 'efficiency_score', label: 'Efficiency' },
          { key: 'cost_score', label: 'Cost' },
          { key: 'trust_score', label: 'Trust' },
        ]

        // Find winner by value_score
        const ranked = [...selected]
          .map(s => {
            const sc = s.skill_scores || {}
            const vs = sc.value_score ?? sc.overall_score ?? 0
            return { ...s, _vs: vs }
          })
          .sort((a, b) => b._vs - a._vs)

        const winner = ranked[0]
        const runnerUp = ranked[1]
        if (!winner || !runnerUp) return null

        const wScores = winner.skill_scores || {}
        const rScores = runnerUp.skill_scores || {}

        const advantages: { label: string; delta: number }[] = []
        const runnerUpWins: { label: string; delta: number }[] = []

        for (const dim of scoreDims) {
          const wVal = wScores[dim.key] ?? 0
          const rVal = rScores[dim.key] ?? 0
          const delta = wVal - rVal
          if (delta > 0.05) advantages.push({ label: dim.label, delta })
          else if (delta < -0.05) runnerUpWins.push({ label: dim.label, delta: Math.abs(delta) })
        }

        const winCount = advantages.length

        return (
          <div className="mt-8 card border-teal/20">
            <div className="flex items-start gap-3 mb-4">
              <span className="text-2xl">🏆</span>
              <div>
                <h3 className="font-bold text-[var(--text)]">
                  Why <span className="text-teal">{winner.canonical_name}</span> Wins
                </h3>
                <p className="text-sm text-[var(--text-2)] mt-1">
                  {winner.canonical_name} leads in {winCount} of {scoreDims.length} scoring dimensions
                  with a <span className="font-bold text-teal">{formatScore(winner._vs)}</span> value score
                  vs {runnerUp.canonical_name}&apos;s <span className="font-semibold text-brand">{formatScore(runnerUp._vs)}</span>.
                </p>
              </div>
            </div>

            {advantages.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-[var(--text-2)] uppercase tracking-wide mb-2">Key Advantages</h4>
                <div className="flex flex-wrap gap-2">
                  {advantages.map(a => (
                    <span key={a.label} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-medium">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                      +{a.delta.toFixed(1)} {a.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {runnerUpWins.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-[var(--text-2)] uppercase tracking-wide mb-2">
                  Where <span className="text-brand">{runnerUp.canonical_name}</span> is stronger
                </h4>
                <div className="flex flex-wrap gap-2">
                  {runnerUpWins.map(a => (
                    <span key={a.label} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-light text-brand text-xs font-medium">
                      +{a.delta.toFixed(1)} {a.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
              <p className="text-[10px] text-[var(--text-3)]">Verdict based on {scoreDims.length}-dimension outcome scoring</p>
              <button
                onClick={() => {
                  const slugs = selected.map(s => s.slug).join(',')
                  const url = `${window.location.origin}/compare?servers=${slugs}`
                  navigator.clipboard.writeText(url)
                  setLinkCopied(true)
                  setTimeout(() => setLinkCopied(false), 2000)
                }}
                className="text-xs text-[var(--text-2)] hover:text-brand transition-colors"
              >
                {linkCopied ? '✓ Copied!' : 'Share verdict →'}
              </button>
            </div>
          </div>
        )
      })()}

      {/* Olympics CTA */}
      {selected.length >= 2 && (
        <div className="mt-8 card text-center">
          <h3 className="font-bold text-[var(--text)] mb-2">Run a Head-to-Head Benchmark</h3>
          <p className="text-sm text-[var(--text-2)] mb-4">
            Compare these MCP servers on real tasks through the MCP Server Olympics.
            Earn 2.5x routing credits for comparative evaluations.
          </p>
          <Link href="/olympics" className="btn-primary text-sm">
            View Olympics Events
          </Link>
        </div>
      )}

      {/* Telemetry Incentive Callout */}
      <div className="mt-8 rounded-xl border border-teal/20 bg-teal-light px-6 py-5 text-center">
        <h3 className="font-bold text-teal mb-1 text-sm">Earn routing credits by reporting outcomes</h3>
        <p className="text-sm text-[var(--text-2)]">
          Agents that submit telemetry receive routing credits, benchmark rewards, and leaderboard ranking.
        </p>
      </div>
    </div>
  )
}
