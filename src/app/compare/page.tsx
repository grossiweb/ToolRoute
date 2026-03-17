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
        .limit(100)
      setSkills(data || [])
    }
    loadSkills()
  }, [])

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
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 mb-2">Compare MCP Servers</h1>
        <p className="text-gray-500">
          Side-by-side comparison of MCP servers across outcome scoring dimensions.
        </p>
      </div>

      {/* Server selector */}
      <div className="card mb-8">
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
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-brand"
              />
              {search.length > 0 && filteredSkills.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  {filteredSkills.slice(0, 10).map((s) => (
                    <button
                      key={s.id}
                      onClick={() => addSkill(s)}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center justify-between"
                    >
                      <span className="font-medium text-gray-800">{s.canonical_name}</span>
                      {s.skill_scores?.overall_score != null && (
                        <span className="text-xs text-gray-400">
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
        <p className="text-xs text-gray-400">
          {selected.length}/4 MCP servers selected
        </p>
      </div>

      {/* Comparison table */}
      {selected.length >= 2 ? (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs w-36">
                  Dimension
                </th>
                {selected.map((s) => (
                  <th key={s.id} className="text-center px-4 py-3 min-w-[140px]">
                    <Link
                      href={`/mcp-servers/${s.slug}`}
                      className="font-bold text-gray-900 hover:text-brand transition-colors text-sm"
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
                  <tr key={dim.key} className="border-b border-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-600 text-xs">
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
                            <span className="text-gray-300">&mdash;</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}

              {/* Cost per Useful Outcome row */}
              <tr className="border-b border-gray-50">
                <td className="px-4 py-3 font-medium text-gray-600 text-xs">
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
                    <td key={s.id} className="text-center px-4 py-3 text-gray-700">
                      {cost != null ? `$${Number(cost).toFixed(3)}` : '\u2014'}
                    </td>
                  )
                })}
              </tr>

              {/* GitHub stars row */}
              <tr className="border-b border-gray-50">
                <td className="px-4 py-3 font-medium text-gray-600 text-xs">GitHub Stars</td>
                {selected.map((s) => (
                  <td key={s.id} className="text-center px-4 py-3 text-gray-700">
                    {s.skill_metrics?.github_stars != null
                      ? s.skill_metrics.github_stars.toLocaleString()
                      : '\u2014'}
                  </td>
                ))}
              </tr>

              {/* Last commit row */}
              <tr className="border-b border-gray-50">
                <td className="px-4 py-3 font-medium text-gray-600 text-xs">Last Commit</td>
                {selected.map((s) => {
                  const days = s.skill_metrics?.days_since_last_commit
                  return (
                    <td key={s.id} className="text-center px-4 py-3 text-gray-700">
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
                <td className="px-4 py-3 font-medium text-gray-600 text-xs">Pricing</td>
                {selected.map((s) => (
                  <td key={s.id} className="text-center px-4 py-3 text-gray-700 capitalize">
                    {s.skill_cost_models?.pricing_model?.replace(/_/g, ' ') || '\u2014'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">Select at least 2 MCP servers to compare</p>
          <p className="text-sm mt-1">
            Use the search above to find and add MCP servers.
          </p>
        </div>
      )}

      {/* Olympics CTA */}
      {selected.length >= 2 && (
        <div className="mt-8 card text-center">
          <h3 className="font-bold text-gray-900 mb-2">Run a Head-to-Head Benchmark</h3>
          <p className="text-sm text-gray-500 mb-4">
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
        <p className="text-sm text-gray-600">
          Agents that submit telemetry receive routing credits, benchmark rewards, and leaderboard ranking.
        </p>
      </div>
    </div>
  )
}
