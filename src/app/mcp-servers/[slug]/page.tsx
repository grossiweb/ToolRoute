import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { getScoreColor, formatScore, getGradeLabel } from '@/lib/scoring'
import { Metadata } from 'next'
import Link from 'next/link'

export const revalidate = 3600

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const supabase = createServerSupabaseClient()
  const { data: skill } = await supabase
    .from('skills')
    .select('canonical_name, short_description, skill_scores(value_score, overall_score)')
    .eq('slug', params.slug)
    .single()

  if (!skill) {
    return { title: 'Server Not Found — ToolRoute' }
  }

  const scores = (skill as any).skill_scores
  const scoreVal = Array.isArray(scores) ? scores[0]?.value_score ?? scores[0]?.overall_score : scores?.value_score ?? scores?.overall_score
  const scoreParam = scoreVal != null ? `&score=${scoreVal}` : ''
  const ogImage = `/api/og?title=${encodeURIComponent(skill.canonical_name)}${scoreParam}&type=server`

  return {
    title: `${skill.canonical_name} MCP Server — ToolRoute`,
    description: skill.short_description || `${skill.canonical_name} MCP server benchmarks, scores, and routing intelligence on ToolRoute.`,
    openGraph: {
      title: `${skill.canonical_name} MCP Server`,
      description: skill.short_description || `${skill.canonical_name} MCP server benchmarks and scores on ToolRoute.`,
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${skill.canonical_name} MCP Server`,
      description: skill.short_description || `${skill.canonical_name} MCP server benchmarks and scores on ToolRoute.`,
      images: [ogImage],
    },
  }
}

export default async function MCPServerPage({ params }: { params: { slug: string } }) {
  const supabase = createServerSupabaseClient()

  const { data: skill } = await supabase
    .from('skills')
    .select(`
      *,
      skill_scores (*),
      skill_metrics (*),
      skill_cost_models (*)
    `)
    .eq('slug', params.slug)
    .single()

  if (!skill) notFound()

  const score = skill.skill_scores
  const metrics = skill.skill_metrics
  const grade = score
    ? getGradeLabel(score.value_score, score.output_score, score.cost_score)
    : null

  // Fetch total sample size across all benchmark profiles for trust signals
  const { data: rollupStats } = await supabase
    .from('skill_benchmark_rollups')
    .select('sample_size, updated_at')
    .eq('skill_id', skill.id)

  const totalSampleSize = (rollupStats || []).reduce((sum: number, r: any) => sum + (r.sample_size ?? 0), 0)
  const lastUpdated = (rollupStats || []).reduce((latest: string | null, r: any) => {
    if (!r.updated_at) return latest
    if (!latest) return r.updated_at
    return r.updated_at > latest ? r.updated_at : latest
  }, null as string | null)
  const daysSinceUpdate = lastUpdated
    ? Math.floor((Date.now() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60 * 24))
    : null

  const confidence = getConfidenceLabel(totalSampleSize)

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/servers" className="hover:text-brand transition-colors">Servers</Link>
        <span>/</span>
        <span className="text-gray-600">{skill.canonical_name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-6 mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h1 className="text-3xl font-black text-gray-900">{skill.canonical_name} MCP Server</h1>
            {skill.vendor_type === 'official' && (
              <span className="badge bg-teal-light text-teal text-xs">Official</span>
            )}
            {grade && (
              <span className="badge bg-brand-light text-brand text-xs">Grade: {grade}</span>
            )}
          </div>
          <p className="text-lg text-gray-600">{skill.short_description}</p>

          <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
            {skill.repo_url && (
              <a href={skill.repo_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-brand transition-colors">
                <GitHubIcon />
                GitHub
              </a>
            )}
            {metrics?.github_stars && (
              <span>⭐ {formatStars(metrics.github_stars)} stars</span>
            )}
            {metrics?.days_since_last_commit != null && (
              <span>{metrics.days_since_last_commit === 0 ? 'Updated today' : `Updated ${metrics.days_since_last_commit}d ago`}</span>
            )}
            <span className="capitalize">{skill.license || 'License unknown'}</span>
          </div>
        </div>

        {score?.overall_score && (
          <div className="text-center flex-shrink-0">
            <div className={`w-20 h-20 rounded-2xl border-2 flex flex-col items-center justify-center ${getScoreColor(score.overall_score)}`}>
              <span className="text-2xl font-black">{formatScore(score.overall_score)}</span>
              <span className="text-[10px] font-semibold opacity-70">ToolRoute</span>
            </div>
          </div>
        )}
      </div>

      {/* Trust signals bar */}
      <div className="flex items-center gap-4 flex-wrap bg-gray-50 border border-gray-200 rounded-xl px-5 py-3 mb-8">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400 font-medium">Value Score:</span>
          <span className="font-bold text-gray-900">
            {score?.value_score != null ? formatScore(score.value_score) : '--'}
          </span>
        </div>
        <div className="w-px h-5 bg-gray-200" />
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400 font-medium">Sample size:</span>
          <span className="font-bold text-gray-900">{totalSampleSize} runs</span>
        </div>
        <div className="w-px h-5 bg-gray-200" />
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400 font-medium">Confidence:</span>
          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${confidence.color}`}>
            {confidence.label}
          </span>
        </div>
        <div className="w-px h-5 bg-gray-200" />
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400 font-medium">Last updated:</span>
          <span className="font-bold text-gray-900">
            {daysSinceUpdate != null
              ? daysSinceUpdate === 0 ? 'Today' : `${daysSinceUpdate}d ago`
              : 'No data yet'}
          </span>
        </div>
      </div>

      {/* Score breakdown */}
      {score && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-8">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Score Breakdown</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <ScoreBlock label="Output Quality" value={score.output_score} description="How good are the results?" />
            <ScoreBlock label="Reliability" value={score.reliability_score} description="Does it work consistently?" />
            <ScoreBlock label="Efficiency" value={score.efficiency_score} description="How heavy is it to use?" />
            <ScoreBlock label="Cost" value={score.cost_score} description="Is it worth the price?" />
            <ScoreBlock label="Trust" value={score.trust_score} description="Is it safe to use?" />
          </div>
          <p className="text-xs text-gray-400 mt-4">
            All scores are out of 10. {score.overall_score ? `Based on accumulated telemetry.` : 'Accumulating data.'}
          </p>
        </div>
      )}

      {/* Benchmark Performance */}
      <BenchmarkSection skillId={skill.id} />

      {/* Description */}
      {skill.long_description && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3">About</h2>
          <p className="text-gray-600 leading-relaxed">{skill.long_description}</p>
        </div>
      )}

      {/* Install */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Quick Install</h2>
        <div className="bg-gray-900 text-green-400 rounded-xl p-4 font-mono text-sm">
          {skill.slug === 'context7' && <span>npx ctx7 setup</span>}
          {skill.slug === 'playwright-mcp' && <span>npm install @playwright/mcp</span>}
          {skill.slug === 'firecrawl-mcp' && <span>npx firecrawl-mcp</span>}
          {!['context7', 'playwright-mcp', 'firecrawl-mcp'].includes(skill.slug) && (
            <span>See <a href={skill.repo_url || '#'} target="_blank" rel="noopener noreferrer" className="underline text-green-300">GitHub repo</a> for install instructions</span>
          )}
        </div>
      </div>

      {/* Fallback Intelligence */}
      <FallbackSection skillId={skill.id} skillSlug={skill.slug} skillName={skill.canonical_name} />

      {/* Badge for maintainers */}
      <div className="mb-8 bg-gray-50 border border-gray-200 rounded-xl p-6">
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Add Badge to Your README</h2>
        <div className="bg-gray-900 rounded-lg p-3 font-mono text-xs text-gray-300 overflow-x-auto mb-3">
          {`[![ToolRoute Score](https://toolroute.io/api/badge/${skill.slug})](https://toolroute.io/mcp-servers/${skill.slug})`}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-200 rounded-full px-3 py-1.5">
            <span className="text-xs font-bold text-teal">ToolRoute</span>
            <span className="text-xs text-gray-400">|</span>
            <span className="text-xs font-bold text-gray-800">{score?.overall_score != null ? `${formatScore(score.overall_score)}/10` : 'unrated'}</span>
          </div>
          <span className="text-xs text-gray-500">Badge updates automatically as your score changes</span>
        </div>
      </div>

      {/* Contribute */}
      <div className="border border-brand/30 bg-brand-light rounded-xl p-6">
        <h2 className="text-base font-bold text-brand mb-2">Help improve this score</h2>
        <p className="text-sm text-gray-600 mb-4">
          Used this MCP server? Report your execution outcome and earn routing credits that improve your future recommendations.
        </p>
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-700">Report an outcome</span>
            <span className="font-semibold text-teal-700">+3 to +10 routing credits</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-700">Compare two servers</span>
            <span className="font-semibold text-teal-700">+8 to +25 routing credits</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-700">Submit a benchmark package</span>
            <span className="font-semibold text-teal-700">+15 to +40 routing credits</span>
          </div>
        </div>
        <div className="bg-gray-900 text-green-400 rounded-lg p-3 font-mono text-xs mb-4">
          POST /api/report {`{ "skill_slug": "${skill.slug}", "outcome": "success" }`}
        </div>
        <a href="/api-docs" className="btn-primary text-sm">
          See full API docs →
        </a>
      </div>
    </div>
  )
}

function ScoreBlock({ label, value, description }: { label: string; value: number | null; description: string }) {
  if (value == null) return (
    <div className="text-center">
      <div className="text-2xl font-black text-gray-300 mb-1">—</div>
      <div className="text-xs font-semibold text-gray-500">{label}</div>
      <div className="text-xs text-gray-400 mt-0.5">{description}</div>
    </div>
  )
  const color = value >= 8.5 ? 'text-teal' : value >= 7 ? 'text-brand' : value >= 5 ? 'text-amber-600' : 'text-red-600'
  return (
    <div className="text-center">
      <div className={`text-2xl font-black mb-1 ${color}`}>{formatScore(value)}</div>
      <div className="text-xs font-semibold text-gray-700">{label}</div>
      <div className="text-xs text-gray-400 mt-0.5">{description}</div>
    </div>
  )
}

function GitHubIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
    </svg>
  )
}

function formatStars(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

function getConfidenceLabel(sampleSize: number): { label: string; color: string } {
  if (sampleSize >= 50) return { label: 'High', color: 'text-teal-700 bg-teal-50' }
  if (sampleSize >= 20) return { label: 'Medium', color: 'text-amber-700 bg-amber-50' }
  if (sampleSize >= 5) return { label: 'Low', color: 'text-orange-700 bg-orange-50' }
  return { label: 'Accumulating', color: 'text-gray-500 bg-gray-100' }
}

async function FallbackSection({ skillId, skillSlug, skillName }: { skillId: string; skillSlug: string; skillName: string }) {
  const supabase = createServerSupabaseClient()

  const { data: edges } = await supabase
    .from('skill_edges')
    .select(`
      edge_type,
      skill_b:skills!skill_edges_skill_b_id_fkey ( slug, canonical_name )
    `)
    .eq('skill_a_id', skillId)
    .eq('edge_type', 'alternative_to')
    .limit(3)

  const alternatives = (edges || []).filter((e: any) => e.skill_b?.slug)

  return (
    <div className="mb-8 bg-gray-50 border border-gray-200 rounded-xl p-6">
      <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Fallback Intelligence</h2>
      {alternatives.length > 0 ? (
        <div className="space-y-2">
          {alternatives.map((edge: any) => (
            <div key={edge.skill_b.slug} className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">If {skillName} fails</span>
              <span className="text-gray-400">&rarr;</span>
              <a href={`/mcp-servers/${edge.skill_b.slug}`} className="font-medium text-brand hover:underline">
                {edge.skill_b.canonical_name}
              </a>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          Fallback routing available via <code className="bg-gray-200 px-1.5 py-0.5 rounded text-xs font-mono">POST /api/route</code> — the routing engine automatically selects the best alternative when this server is unavailable or underperforming.
        </p>
      )}
    </div>
  )
}

async function BenchmarkSection({ skillId }: { skillId: string }) {
  const supabase = createServerSupabaseClient()

  const { data: rollups } = await supabase
    .from('skill_benchmark_rollups')
    .select(`
      *,
      benchmark_profiles ( name )
    `)
    .eq('skill_id', skillId)
    .order('sample_size', { ascending: false })

  if (!rollups || rollups.length === 0) return null

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-8">
      <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Benchmark Performance</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <th className="pb-3 pr-4">Profile</th>
              <th className="pb-3 pr-4 text-right">Samples</th>
              <th className="pb-3 pr-4 text-right">Success Rate</th>
              <th className="pb-3 pr-4 text-right">Avg Value</th>
              <th className="pb-3 pr-4 text-right">Cost/Useful</th>
              <th className="pb-3 text-right">Confidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rollups.map((r: any) => {
              const conf = getConfidenceLabel(r.sample_size ?? 0)
              return (
                <tr key={r.id}>
                  <td className="py-2.5 pr-4 font-medium text-gray-900">
                    {r.benchmark_profiles?.name ?? 'Unknown'}
                  </td>
                  <td className="py-2.5 pr-4 text-right text-gray-600">{r.sample_size ?? 0}</td>
                  <td className="py-2.5 pr-4 text-right text-gray-600">
                    {r.success_rate != null ? `${(r.success_rate * 100).toFixed(0)}%` : '--'}
                  </td>
                  <td className="py-2.5 pr-4 text-right text-gray-600">
                    {r.avg_value_score != null ? r.avg_value_score.toFixed(1) : '--'}
                  </td>
                  <td className="py-2.5 pr-4 text-right text-gray-600">
                    {r.cost_per_useful_outcome_usd != null ? `$${r.cost_per_useful_outcome_usd.toFixed(3)}` : '--'}
                  </td>
                  <td className="py-2.5 text-right">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${conf.color}`}>
                      {conf.label}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
