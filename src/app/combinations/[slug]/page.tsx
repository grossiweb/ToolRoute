import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatScore, getScoreColor } from '@/lib/scoring'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'

export const revalidate = 3600

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const supabase = createServerSupabaseClient()
  const { data: combo } = await supabase
    .from('combinations')
    .select('name, description')
    .eq('slug', params.slug)
    .single()

  if (!combo) {
    return { title: 'Stack Not Found — ToolRoute' }
  }

  return {
    title: `${combo.name} — MCP Server Stack | ToolRoute`,
    description: combo.description || `${combo.name} server stack on ToolRoute — pre-built workflow combining MCP servers.`,
  }
}

function ComplexityBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    low: 'bg-green-50 text-green-700',
    medium: 'bg-amber-50 text-amber-700',
    high: 'bg-red-50 text-red-700',
  }
  return (
    <span className={`badge text-[10px] flex-shrink-0 ${styles[level] || 'bg-gray-100 text-gray-500'}`}>
      {level} setup
    </span>
  )
}

export default async function CombinationDetailPage({
  params,
}: {
  params: { slug: string }
}) {
  const supabase = createServerSupabaseClient()

  const { data: combo } = await supabase
    .from('combinations')
    .select(`
      id, slug, name, headline, description, setup_complexity, confidence_level, featured,
      workflows ( slug, name ),
      combination_skills (
        role_in_combo, sequence_order,
        skills (
          slug, canonical_name, short_description, vendor_type,
          skill_scores ( overall_score, value_score, output_score, reliability_score, efficiency_score, cost_score, trust_score ),
          skill_metrics ( github_stars )
        )
      )
    `)
    .eq('slug', params.slug)
    .single()

  if (!combo) notFound()

  const skills = (combo.combination_skills || [])
    .sort((a: any, b: any) => (a.sequence_order || 0) - (b.sequence_order || 0))

  // Calculate aggregate stats
  const skillScores = skills
    .map((cs: any) => cs.skills?.skill_scores)
    .filter(Boolean)

  const avgOverall = skillScores.length > 0
    ? skillScores.reduce((sum: number, s: any) => sum + (s.overall_score || 0), 0) / skillScores.length
    : null

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/combinations" className="hover:text-brand transition-colors">Stacks</Link>
        <span>/</span>
        <span className="text-gray-600">{combo.name}</span>
      </div>

      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-light text-brand text-xs font-semibold">
            SERVER STACK
          </div>
          <ComplexityBadge level={combo.setup_complexity} />
          {combo.featured && (
            <span className="badge bg-amber-50 text-amber-700 text-[10px]">Featured</span>
          )}
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-3">
          {combo.name}
        </h1>
        {combo.headline && (
          <p className="text-brand font-medium mb-2">{combo.headline}</p>
        )}
        {combo.description && (
          <p className="text-gray-500 max-w-3xl text-lg">
            {combo.description}
          </p>
        )}
        <div className="flex items-center gap-6 mt-6 text-sm">
          <div>
            <span className="text-2xl font-bold text-brand">{skills.length}</span>
            <span className="text-gray-400 ml-2">server{skills.length !== 1 ? 's' : ''}</span>
          </div>
          {avgOverall != null && (
            <div>
              <span className="text-2xl font-bold text-teal">{avgOverall.toFixed(1)}</span>
              <span className="text-gray-400 ml-2">avg score</span>
            </div>
          )}
          <div>
            <span className="text-gray-400">Confidence:</span>
            <span className="font-bold text-gray-700 ml-1">{combo.confidence_level}</span>
          </div>
          {(combo.workflows as any)?.name && (
            <div>
              <span className="text-gray-400">Workflow:</span>
              <span className="font-bold text-gray-700 ml-1">{(combo.workflows as any).name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Execution Pipeline */}
      <div className="card mb-8 p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Execution Pipeline</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Servers execute in this order to complete the workflow
          </p>
        </div>

        <div className="divide-y divide-gray-100">
          {skills.map((cs: any, idx: number) => {
            const skill = cs.skills
            const scores = skill?.skill_scores
            const overallScore = scores?.overall_score
            const stars = skill?.skill_metrics?.github_stars

            return (
              <div key={skill?.slug || idx} className="px-5 py-5 flex items-start gap-4">
                {/* Step number */}
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-brand text-white text-sm font-bold flex-shrink-0 mt-0.5">
                  {cs.sequence_order ?? idx + 1}
                </div>

                {/* Skill info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Link
                      href={`/mcp-servers/${skill?.slug}`}
                      className="font-bold text-gray-900 hover:text-brand transition-colors"
                    >
                      {skill?.canonical_name || 'Unknown'}
                    </Link>
                    {skill?.vendor_type === 'official' && (
                      <span className="badge bg-teal-light text-teal text-[10px]">Official</span>
                    )}
                    {cs.role_in_combo && (
                      <span className="badge bg-gray-100 text-gray-600 text-[10px]">
                        {cs.role_in_combo}
                      </span>
                    )}
                  </div>
                  {skill?.short_description && (
                    <p className="text-sm text-gray-500 mb-2">{skill.short_description}</p>
                  )}

                  {/* Score breakdown */}
                  {scores && (
                    <div className="flex items-center gap-4 text-xs">
                      {scores.output_score != null && (
                        <span className="text-gray-500">Output: <strong className={overallScore >= 8 ? 'text-teal' : 'text-gray-700'}>{formatScore(scores.output_score)}</strong></span>
                      )}
                      {scores.reliability_score != null && (
                        <span className="text-gray-500">Reliability: <strong className={scores.reliability_score >= 8 ? 'text-teal' : 'text-gray-700'}>{formatScore(scores.reliability_score)}</strong></span>
                      )}
                      {scores.cost_score != null && (
                        <span className="text-gray-500">Cost: <strong className={scores.cost_score >= 8 ? 'text-teal' : 'text-gray-700'}>{formatScore(scores.cost_score)}</strong></span>
                      )}
                      {stars != null && (
                        <span className="text-gray-400">⭐ {stars.toLocaleString()}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Overall score */}
                {overallScore != null && (
                  <div className={`score-ring flex-shrink-0 ${getScoreColor(overallScore)}`}>
                    {formatScore(overallScore)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Use this stack */}
      <div className="card mb-8">
        <h3 className="font-bold text-gray-900 mb-3">Use This Stack</h3>
        <p className="text-sm text-gray-500 mb-4">
          Request this combination through the routing API by specifying the workflow:
        </p>
        <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm overflow-x-auto">
          <span className="text-gray-400">POST /api/route</span>{'\n'}
          <span className="text-gray-300">{'{'}</span>{'\n'}
          <span className="text-gray-300">{'  '}&quot;task&quot;: </span>
          <span className="text-green-400">&quot;{combo.description?.slice(0, 50) || combo.name}&quot;</span>{'\n'}
          <span className="text-gray-300">{'  '}&quot;workflow_slug&quot;: </span>
          <span className="text-green-400">&quot;{(combo.workflows as any)?.slug || 'general'}&quot;</span>{'\n'}
          <span className="text-gray-300">{'}'}</span>
        </div>
      </div>

      {/* CTA */}
      <div className="card max-w-xl mx-auto text-center">
        <h3 className="font-bold text-gray-900 mb-2">Benchmark This Stack</h3>
        <p className="text-sm text-gray-500 mb-4">
          Run this server stack on real tasks and report outcomes. Earn routing credits for every data point.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/api-docs" className="btn-primary text-sm">
            API Docs
          </Link>
          <Link href="/combinations" className="btn-secondary text-sm">
            All Stacks
          </Link>
        </div>
      </div>
    </div>
  )
}
