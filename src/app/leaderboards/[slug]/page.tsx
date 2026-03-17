import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatScore } from '@/lib/scoring'
import Link from 'next/link'
import { Suspense } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'

export const revalidate = 3600

function getScoreColor(score: number): string {
  if (score >= 9) return 'text-emerald-400'
  if (score >= 8) return 'text-green-400'
  if (score >= 7) return 'text-yellow-400'
  if (score >= 6) return 'text-orange-400'
  return 'text-red-400'
}

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
}: {
  params: { slug: string }
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
        skill_scores ( overall_score, output_score, reliability_score, efficiency_score, cost_score, trust_score ),
        skill_metrics ( github_stars )
      )
    `)
    .eq('tool_type_id', toolType.id)

  // Sort by overall_score DESC
  const sortedTools = (typeTools || [])
    .filter((t: any) => t.skills)
    .sort((a: any, b: any) => {
      const aScore = a.skills?.skill_scores?.overall_score || 0
      const bScore = b.skills?.skill_scores?.overall_score || 0
      return bScore - aScore
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
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">{toolType.name} Rankings</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Ranked by overall ToolRoute Score across all benchmark dimensions
            </p>
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
                  const overallScore = scores?.overall_score
                  const outputScore = scores?.output_score
                  const reliabilityScore = scores?.reliability_score
                  const efficiencyScore = scores?.efficiency_score
                  const costScore = scores?.cost_score
                  const trustScore = scores?.trust_score
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
                          <span className={`font-bold text-base ${getScoreColor(overallScore)}`}>
                            {formatScore(overallScore)}
                          </span>
                        ) : (
                          <span className="text-gray-300">--</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {outputScore != null ? (
                          <span className={`font-mono text-xs ${getScoreColor(outputScore)}`}>
                            {formatScore(outputScore)}
                          </span>
                        ) : (
                          <span className="text-gray-300">--</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {reliabilityScore != null ? (
                          <span className={`font-mono text-xs ${getScoreColor(reliabilityScore)}`}>
                            {formatScore(reliabilityScore)}
                          </span>
                        ) : (
                          <span className="text-gray-300">--</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {efficiencyScore != null ? (
                          <span className={`font-mono text-xs ${getScoreColor(efficiencyScore)}`}>
                            {formatScore(efficiencyScore)}
                          </span>
                        ) : (
                          <span className="text-gray-300">--</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {costScore != null ? (
                          <span className={`font-mono text-xs ${getScoreColor(costScore)}`}>
                            {formatScore(costScore)}
                          </span>
                        ) : (
                          <span className="text-gray-300">--</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {trustScore != null ? (
                          <span className={`font-mono text-xs ${getScoreColor(trustScore)}`}>
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

        </div>
      </div>

      {/* Score Legend */}
      <div className="mt-8 card">
        <h3 className="font-bold text-gray-900 text-sm mb-3">Score Guide</h3>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
            <span className="text-gray-600">9.0+ Exceptional</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-400"></span>
            <span className="text-gray-600">8.0+ Excellent</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-yellow-400"></span>
            <span className="text-gray-600">7.0+ Good</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-400"></span>
            <span className="text-gray-600">6.0+ Fair</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-400"></span>
            <span className="text-gray-600">&lt;6.0 Below Average</span>
          </div>
        </div>
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
