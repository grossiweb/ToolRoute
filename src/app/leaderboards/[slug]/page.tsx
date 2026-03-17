import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatScore, getScoreTextColor, normalizeScore } from '@/lib/scoring'
import Link from 'next/link'
import { Suspense } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { SortDropdown } from '@/components/SortDropdown'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'

export const revalidate = 3600

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const supabase = createServerSupabaseClient()
  const { data: toolType } = await supabase
    .from('tool_types')
    .select('name, description')
    .eq('slug', params.slug)
    .single()

  if (!toolType) {
    return { title: 'Leaderboard Not Found — ToolRoute' }
  }

  return {
    title: `${toolType.name} Leaderboard | ToolRoute`,
    description: toolType.description || `Top ${toolType.name} tools ranked by real benchmark data on ToolRoute.`,
  }
}

export default async function LeaderboardDetailPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: { sort?: string }
}) {
  const supabase = createServerSupabaseClient()

  // Fetch the tool type
  const { data: toolType } = await supabase
    .from('tool_types')
    .select('id, slug, name, description, icon')
    .eq('slug', params.slug)
    .single()

  if (!toolType) notFound()

  // Fetch tools for this type with scores and metrics
  const { data: typeTools } = await supabase
    .from('skill_tool_types')
    .select(`
      skills (
        slug, canonical_name, vendor_type,
        skill_scores ( value_score, overall_score, output_score, reliability_score, efficiency_score, cost_score, trust_score ),
        skill_metrics ( github_stars )
      )
    `)
    .eq('tool_type_id', toolType.id)

  // Sort tools based on selected sort key
  const sortKey = searchParams.sort || 'score'

  const sortedTools = (typeTools || [])
    .filter((t: any) => t.skills)
    .sort((a: any, b: any) => {
      const scoresA = a.skills?.skill_scores
      const scoresB = b.skills?.skill_scores

      switch (sortKey) {
        case 'output': return (normalizeScore(scoresB?.output_score) ?? 0) - (normalizeScore(scoresA?.output_score) ?? 0)
        case 'reliability': return (normalizeScore(scoresB?.reliability_score) ?? 0) - (normalizeScore(scoresA?.reliability_score) ?? 0)
        case 'efficiency': return (normalizeScore(scoresB?.efficiency_score) ?? 0) - (normalizeScore(scoresA?.efficiency_score) ?? 0)
        case 'cost': return (normalizeScore(scoresB?.cost_score) ?? 0) - (normalizeScore(scoresA?.cost_score) ?? 0)
        case 'trust': return (normalizeScore(scoresB?.trust_score) ?? 0) - (normalizeScore(scoresA?.trust_score) ?? 0)
        case 'stars': return (b.skills?.skill_metrics?.github_stars ?? 0) - (a.skills?.skill_metrics?.github_stars ?? 0)
        default: return (normalizeScore(scoresB?.value_score ?? scoresB?.overall_score) ?? 0) - (normalizeScore(scoresA?.value_score ?? scoresA?.overall_score) ?? 0)
      }
    })

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/leaderboards" className="hover:text-teal transition-colors">Leaderboards</Link>
        <span>/</span>
        <span className="text-gray-600">{toolType.name}</span>
      </div>

      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          {toolType.icon && (
            <span className="text-3xl">{toolType.icon}</span>
          )}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 text-teal text-xs font-semibold">
            LEADERBOARD
          </div>
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-3">
          {toolType.name}
        </h1>
        {toolType.description && (
          <p className="text-gray-500 max-w-3xl text-lg">
            {toolType.description}
          </p>
        )}
        <div className="flex items-center gap-4 mt-6 text-sm">
          <div className="text-center">
            <span className="text-2xl font-bold text-teal">{sortedTools.length}</span>
            <span className="text-gray-400 ml-2">tool{sortedTools.length !== 1 ? 's' : ''} ranked</span>
          </div>
        </div>
      </div>

      {/* Sidebar + Content */}
      <div className="flex gap-6">
        <Suspense><Sidebar context="leaderboards" /></Suspense>
        <div className="flex-1 min-w-0">
      {/* Leaderboard Table */}
      {sortedTools.length > 0 ? (
        <div className="card overflow-hidden p-0">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-900">{toolType.name} Rankings</h2>
              <p className="text-xs text-gray-400 mt-0.5">Ranked by overall ToolRoute Score across all benchmark dimensions</p>
            </div>
            <Suspense>
              <SortDropdown currentSort={searchParams.sort || 'score'} basePath={`/leaderboards/${params.slug}`} />
            </Suspense>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs w-14">Rank</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Tool Name</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs">ToolRoute Score</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs">Output</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs">Reliability</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs">Efficiency</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs">Cost</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs">Trust</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs">Stars</th>
                </tr>
              </thead>
              <tbody>
                {sortedTools.map((entry: any, idx: number) => {
                  const skill = entry.skills
                  const scores = skill?.skill_scores
                  const overallScore = normalizeScore(scores?.value_score ?? scores?.overall_score)
                  const outputScore = normalizeScore(scores?.output_score)
                  const reliabilityScore = normalizeScore(scores?.reliability_score)
                  const efficiencyScore = normalizeScore(scores?.efficiency_score)
                  const costScore = normalizeScore(scores?.cost_score)
                  const trustScore = normalizeScore(scores?.trust_score)
                  const stars = skill?.skill_metrics?.github_stars

                  return (
                    <tr
                      key={skill?.slug || idx}
                      className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                        idx === 0 ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      <td className="px-4 py-3 font-bold text-gray-400">
                        {idx === 0 ? '\uD83E\uDD47' : idx === 1 ? '\uD83E\uDD48' : idx === 2 ? '\uD83E\uDD49' : `#${idx + 1}`}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/mcp-servers/${skill?.slug}`}
                          className="font-semibold text-gray-900 hover:text-teal transition-colors"
                        >
                          {skill?.canonical_name || 'Unknown'}
                        </Link>
                        {skill?.vendor_type === 'official' && (
                          <span className="ml-2 badge bg-teal-light text-teal text-[10px]">Official</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {overallScore != null ? (
                          <span className={`font-bold text-base ${getScoreTextColor(overallScore)}`}>
                            {formatScore(overallScore)}
                          </span>
                        ) : (
                          <span className="text-gray-300">--</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {outputScore != null ? (
                          <span className={`font-mono text-xs ${getScoreTextColor(outputScore)}`}>
                            {formatScore(outputScore)}
                          </span>
                        ) : (
                          <span className="text-gray-300">--</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {reliabilityScore != null ? (
                          <span className={`font-mono text-xs ${getScoreTextColor(reliabilityScore)}`}>
                            {formatScore(reliabilityScore)}
                          </span>
                        ) : (
                          <span className="text-gray-300">--</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {efficiencyScore != null ? (
                          <span className={`font-mono text-xs ${getScoreTextColor(efficiencyScore)}`}>
                            {formatScore(efficiencyScore)}
                          </span>
                        ) : (
                          <span className="text-gray-300">--</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {costScore != null ? (
                          <span className={`font-mono text-xs ${getScoreTextColor(costScore)}`}>
                            {formatScore(costScore)}
                          </span>
                        ) : (
                          <span className="text-gray-300">--</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {trustScore != null ? (
                          <span className={`font-mono text-xs ${getScoreTextColor(trustScore)}`}>
                            {formatScore(trustScore)}
                          </span>
                        ) : (
                          <span className="text-gray-300">--</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-gray-500">
                        {stars != null ? stars.toLocaleString() : '--'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-lg font-medium text-gray-600">No tools ranked in this category yet</p>
          <p className="text-sm text-gray-400 mt-1 max-w-md mx-auto">
            Submit telemetry data to start ranking tools in this category.
          </p>
          <Link href="/api-docs" className="btn-primary text-sm mt-4 inline-block">
            Get Started with the API
          </Link>
        </div>
      )}

      {/* Why #1 Wins */}
      {sortedTools.length >= 2 && (() => {
        const first = sortedTools[0].skills as any
        const second = sortedTools[1].skills as any
        const s1 = first?.skill_scores
        const s2 = second?.skill_scores

        if (!s1 || !s2) return null

        // Find which dimensions #1 leads in
        const dimensions = [
          { key: 'output_score', label: 'Output Quality', weight: '35%' },
          { key: 'reliability_score', label: 'Reliability', weight: '25%' },
          { key: 'efficiency_score', label: 'Efficiency', weight: '15%' },
          { key: 'cost_score', label: 'Cost', weight: '15%' },
          { key: 'trust_score', label: 'Trust', weight: '10%' },
        ]

        const advantages = dimensions
          .map(d => ({
            ...d,
            diff: (normalizeScore(s1[d.key]) ?? 0) - (normalizeScore(s2[d.key]) ?? 0),
            score1: normalizeScore(s1[d.key]),
            score2: normalizeScore(s2[d.key]),
          }))
          .filter(d => d.diff > 0)
          .sort((a, b) => b.diff - a.diff)

        const biggestAdvantage = advantages[0]

        return (
          <div className="mt-6 card border-teal/20 bg-gradient-to-r from-teal-50/50 to-white">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">💡</span>
              <h3 className="font-bold text-gray-900 text-sm">Why {first?.canonical_name} is #1</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              {first?.canonical_name} leads {second?.canonical_name} by{' '}
              <span className="font-bold text-teal">
                {biggestAdvantage ? `+${biggestAdvantage.diff.toFixed(1)}` : '—'}
              </span>{' '}
              in {biggestAdvantage?.label || 'overall score'}
              {advantages.length > 1 && `, and also wins in ${advantages.slice(1).map(a => a.label).join(', ')}`}.
            </p>
            <div className="grid grid-cols-5 gap-2">
              {dimensions.map(d => {
                const v1 = normalizeScore(s1[d.key])
                const v2 = normalizeScore(s2[d.key])
                const leads = (v1 ?? 0) > (v2 ?? 0)
                return (
                  <div key={d.key} className={`text-center p-2 rounded-lg ${leads ? 'bg-teal-50' : 'bg-gray-50'}`}>
                    <div className="text-[10px] text-gray-400 mb-1">{d.label}</div>
                    <div className={`text-sm font-bold ${leads ? 'text-teal-700' : 'text-gray-500'}`}>
                      {v1 != null ? formatScore(v1) : '—'}
                    </div>
                    <div className="text-[10px] text-gray-400">
                      vs {v2 != null ? formatScore(v2) : '—'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

        </div>
      </div>

      {/* Score Guide — compact inline */}
      <div className="mt-4 flex items-center gap-4 text-[10px] text-gray-400">
        <span className="font-semibold text-gray-500">Score Guide:</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>9+ Exceptional</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-400"></span>8+ Excellent</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400"></span>7+ Good</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400"></span>6+ Fair</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400"></span>&lt;6 Below Avg</span>
      </div>

      {/* CTA */}
      <div className="mt-10 text-center">
        <div className="card max-w-xl mx-auto text-center">
          <h3 className="font-bold text-gray-900 mb-2">Contribute Benchmark Data</h3>
          <p className="text-sm text-gray-500 mb-4">
            Help improve these rankings by submitting real-world telemetry.
            Contributors earn routing credits for every data point.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/api-docs" className="btn-primary text-sm">
              API Docs
            </Link>
            <Link href="/leaderboards" className="btn-secondary text-sm">
              All Leaderboards
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
