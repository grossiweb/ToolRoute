import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatScore } from '@/lib/scoring'
import Link from 'next/link'
import { Metadata } from 'next'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'MCP Servers — ToolRoute',
  description: 'Browse 200+ MCP servers ranked by real execution benchmarks. Find the best tool for any agent task.',
}

export default async function ServersPage() {
  const supabase = createServerSupabaseClient()

  const { data: skills } = await supabase
    .from('skills')
    .select(`
      id, slug, canonical_name, short_description, vendor_type,
      skill_scores ( overall_score, value_score, output_score, reliability_score, efficiency_score, cost_score, trust_score ),
      skill_metrics ( github_stars, days_since_last_commit )
    `)
    .eq('status', 'active')
    .order('canonical_name')
    .limit(300)

  const servers = skills || []

  // Get unique workflows for filter
  const { data: workflows } = await supabase
    .from('workflows')
    .select('slug, name')
    .order('name')

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 mb-2">MCP Servers</h1>
        <p className="text-gray-500 max-w-2xl">
          {servers.length}+ servers ranked by real execution data. Every score is outcome-backed on a 0-10 scale across 5 dimensions.
        </p>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-6 mb-8 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-900">{servers.length}</span>
          <span className="text-gray-500">servers</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-900">{workflows?.length || 0}</span>
          <span className="text-gray-500">categories</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-900">5</span>
          <span className="text-gray-500">score dimensions</span>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {servers.map((skill: any) => {
          const scores = skill.skill_scores as any
          const metrics = skill.skill_metrics as any
          const valueScore = Array.isArray(scores) ? scores[0]?.value_score : scores?.value_score
          const overallScore = Array.isArray(scores) ? scores[0]?.overall_score : scores?.overall_score
          const stars = Array.isArray(metrics) ? metrics[0]?.github_stars : metrics?.github_stars
          const displayScore = valueScore ?? overallScore

          return (
            <Link
              key={skill.id}
              href={`/mcp-servers/${skill.slug}`}
              className="card group hover:border-brand/30 transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 group-hover:text-brand transition-colors truncate">
                    {skill.canonical_name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    {skill.vendor_type && (
                      <span className="badge text-[10px] bg-gray-100 text-gray-500">{skill.vendor_type}</span>
                    )}
                    {stars != null && stars > 0 && (
                      <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                        ★ {stars >= 1000 ? `${(stars / 1000).toFixed(1)}k` : stars}
                      </span>
                    )}
                  </div>
                </div>
                {displayScore != null && (
                  <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm ${
                    displayScore >= 8.5 ? 'bg-teal-50 text-teal-700' :
                    displayScore >= 7.0 ? 'bg-brand-light text-brand' :
                    displayScore >= 5.0 ? 'bg-amber-50 text-amber-700' :
                    'bg-red-50 text-red-700'
                  }`}>
                    {formatScore(displayScore)}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 line-clamp-2">
                {skill.short_description || 'No description available.'}
              </p>
            </Link>
          )
        })}
      </div>

      {servers.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-bold mb-2">No servers found</p>
          <p className="text-sm">Check back soon — servers are being added to the catalog.</p>
        </div>
      )}
    </div>
  )
}
