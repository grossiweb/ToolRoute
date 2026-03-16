import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatScore } from '@/lib/scoring'
import Link from 'next/link'
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

function getScoreBg(score: number): string {
  if (score >= 9) return 'bg-emerald-50 text-emerald-700'
  if (score >= 8) return 'bg-green-50 text-green-700'
  if (score >= 7) return 'bg-yellow-50 text-yellow-700'
  if (score >= 6) return 'bg-orange-50 text-orange-700'
  return 'bg-red-50 text-red-700'
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const supabase = createServerSupabaseClient()
  const { data: task } = await supabase
    .from('tasks')
    .select('name, description')
    .eq('slug', params.slug)
    .single()

  if (!task) {
    return { title: 'Task Not Found — ToolRoute' }
  }

  return {
    title: `${task.name} — Best AI Tools | ToolRoute`,
    description: task.description || `Find the best AI tools for ${task.name}, ranked by real benchmark data on ToolRoute.`,
  }
}

export default async function TaskDetailPage({
  params,
}: {
  params: { slug: string }
}) {
  const supabase = createServerSupabaseClient()

  // Fetch the task
  const { data: task } = await supabase
    .from('tasks')
    .select('id, slug, name, description, example_query')
    .eq('slug', params.slug)
    .single()

  if (!task) notFound()

  // Fetch tools for this task with scores and metrics
  const { data: taskTools } = await supabase
    .from('skill_tasks')
    .select(`
      relevance_score,
      skills (
        slug, canonical_name, vendor_type, github_stars,
        skill_scores ( overall_score, value_score, output_score, reliability_score, efficiency_score, cost_score, trust_score ),
        skill_metrics ( p50_latency_ms, success_rate, avg_cost_usd )
      )
    `)
    .eq('task_id', task.id)
    .order('relevance_score', { ascending: false })

  // Sort by relevance_score DESC, then overall_score DESC
  const sortedTools = (taskTools || []).sort((a: any, b: any) => {
    const relDiff = (b.relevance_score || 0) - (a.relevance_score || 0)
    if (relDiff !== 0) return relDiff
    const aScore = a.skills?.skill_scores?.overall_score || 0
    const bScore = b.skills?.skill_scores?.overall_score || 0
    return bScore - aScore
  })

  // Fetch related workflows
  const { data: relatedWorkflows } = await supabase
    .from('task_workflows')
    .select(`
      workflows ( slug, name, description )
    `)
    .eq('task_id', task.id)

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/tasks" className="hover:text-brand transition-colors">Tasks</Link>
        <span>/</span>
        <span className="text-gray-600">{task.name}</span>
      </div>

      {/* Header */}
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-light text-brand text-xs font-semibold mb-4">
          TASK
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-3">
          {task.name}
        </h1>
        {task.description && (
          <p className="text-gray-500 max-w-3xl text-lg">
            {task.description}
          </p>
        )}
        {task.example_query && (
          <div className="bg-gray-900 rounded-lg px-5 py-4 mt-6 max-w-2xl">
            <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5 font-semibold">
              Example Query
            </div>
            <code className="text-sm text-emerald-400 font-mono leading-relaxed">
              {task.example_query}
            </code>
          </div>
        )}
        <div className="flex items-center gap-4 mt-6 text-sm">
          <div className="text-center">
            <span className="text-2xl font-bold text-brand">{sortedTools.length}</span>
            <span className="text-gray-400 ml-2">tool{sortedTools.length !== 1 ? 's' : ''} benchmarked</span>
          </div>
        </div>
      </div>

      {/* Leaderboard Table */}
      {sortedTools.length > 0 ? (
        <div className="card overflow-hidden p-0">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Tool Rankings</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Ranked by task relevance and overall ToolRoute Score
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs w-14">Rank</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Tool Name</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs">Relevance</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs">ToolRoute Score</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs">Output</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs">Reliability</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs">Cost</th>
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
                  const costScore = scores?.cost_score
                  const relevance = entry.relevance_score
                  const stars = skill?.github_stars

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
                          href={`/skills/${skill?.slug}`}
                          className="font-semibold text-gray-900 hover:text-brand transition-colors"
                        >
                          {skill?.canonical_name || 'Unknown'}
                        </Link>
                        {skill?.vendor_type === 'official' && (
                          <span className="ml-2 badge bg-teal-light text-teal text-[10px]">Official</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {relevance != null ? (
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${getScoreBg(relevance)}`}>
                            {formatScore(relevance)}
                          </span>
                        ) : (
                          <span className="text-gray-300">--</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {overallScore != null ? (
                          <span className={`font-bold ${getScoreColor(overallScore)}`}>
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
                        {costScore != null ? (
                          <span className={`font-mono text-xs ${getScoreColor(costScore)}`}>
                            {formatScore(costScore)}
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
          <p className="text-lg font-medium text-gray-600">No tools benchmarked for this task yet</p>
          <p className="text-sm text-gray-400 mt-1 max-w-md mx-auto">
            Submit telemetry data to start ranking tools for this task.
          </p>
          <Link href="/api-docs" className="btn-primary text-sm mt-4 inline-block">
            Get Started with the API
          </Link>
        </div>
      )}

      {/* Related Workflows */}
      {relatedWorkflows && relatedWorkflows.length > 0 && (
        <div className="mt-10">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Related Workflows</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {relatedWorkflows.map((rw: any, idx: number) => {
              const workflow = rw.workflows
              if (!workflow) return null
              return (
                <div key={workflow.slug || idx} className="card">
                  <h3 className="font-bold text-gray-900 text-sm mb-1">{workflow.name}</h3>
                  {workflow.description && (
                    <p className="text-xs text-gray-500 line-clamp-2">{workflow.description}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="mt-12 text-center">
        <div className="card max-w-xl mx-auto text-center">
          <h3 className="font-bold text-gray-900 mb-2">Have Benchmark Data?</h3>
          <p className="text-sm text-gray-500 mb-4">
            Submit telemetry for this task and help improve routing accuracy.
            Contributors earn routing credits for every data point.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/api-docs" className="btn-primary text-sm">
              API Docs
            </Link>
            <Link href="/tasks" className="btn-secondary text-sm">
              All Tasks
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
