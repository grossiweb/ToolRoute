import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatScore, getScoreColor } from '@/lib/scoring'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const revalidate = 60

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const supabase = createServerSupabaseClient()
  const { data: event } = await supabase
    .from('olympic_events')
    .select('name, description')
    .eq('slug', params.slug)
    .single()

  if (!event) {
    return { title: 'Report Not Found — ToolRoute' }
  }

  return {
    title: `${event.name} Report — ToolRoute`,
    description: event.description,
  }
}

export default async function ReportPage({ params }: { params: { slug: string } }) {
  const supabase = createServerSupabaseClient()

  // Fetch the event
  const { data: event } = await supabase
    .from('olympic_events')
    .select(`
      id, slug, name, description, event_number, status, min_sample_size,
      benchmark_profiles ( id, slug, name, description, scoring_formula_version )
    `)
    .eq('slug', params.slug)
    .single()

  if (!event) {
    // Try finding a benchmark report instead
    const { data: report } = await supabase
      .from('benchmark_reports')
      .select('*')
      .eq('slug', params.slug)
      .eq('published', true)
      .single()

    if (!report) return notFound()

    return <PublishedReport report={report} />
  }

  // Fetch competitors for this event
  const { data: competitors } = await supabase
    .from('olympic_event_competitors')
    .select(`
      event_id, skill_id, medal, rank, value_score, sample_size, last_updated_at,
      skills (
        slug, canonical_name, vendor_type, short_description,
        skill_scores ( overall_score, trust_score, reliability_score, output_score, efficiency_score, cost_score, value_score ),
        skill_metrics ( github_stars, days_since_last_commit )
      )
    `)
    .eq('event_id', event.id)
    .order('rank', { ascending: true, nullsFirst: false })

  // Fetch benchmark rollups if available
  const benchmarkProfile = (event as any).benchmark_profiles
  let rollups: any[] = []
  if (benchmarkProfile) {
    const { data } = await supabase
      .from('skill_benchmark_rollups')
      .select('*')
      .eq('benchmark_profile_id', benchmarkProfile.id)
      .order('avg_value_score', { ascending: false })

    rollups = data || []
  }

  // Fetch recent outcome records for this event's benchmark
  const { data: recentOutcomes, count: totalOutcomes } = await supabase
    .from('outcome_records')
    .select('outcome_status, latency_ms, estimated_cost_usd, output_quality_rating', { count: 'exact' })
    .eq('benchmark_profile_id', benchmarkProfile?.id)
    .order('created_at', { ascending: false })
    .limit(100)

  // Calculate aggregate stats from outcomes
  const aggStats = calculateAggregateStats(recentOutcomes || [])

  const minSamples = event.min_sample_size || 5
  const hasEnoughData = competitors?.some((c: any) => c.sample_size >= minSamples) || false

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/olympics" className="hover:text-brand transition-colors">Olympics</Link>
        <span>/</span>
        <span className="text-gray-600">Event {event.event_number}</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <StatusBadge status={event.status} />
          <span className="text-xs font-bold text-gray-400">EVENT {event.event_number}</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-2">{event.name}</h1>
        <p className="text-gray-500">{event.description}</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Competitors" value={competitors?.length || 0} />
        <StatCard label="Total Outcomes" value={totalOutcomes || 0} />
        <StatCard label="Avg Latency" value={aggStats.avgLatency ? `${aggStats.avgLatency}ms` : '—'} />
        <StatCard label="Success Rate" value={aggStats.successRate ? `${aggStats.successRate}%` : '—'} />
      </div>

      {/* Methodology */}
      <div className="card mb-8">
        <h2 className="font-bold text-gray-900 mb-3">Methodology</h2>
        <div className="text-sm text-gray-600 space-y-2">
          <p>
            Skills are benchmarked using the <strong>{benchmarkProfile?.name || 'standard'}</strong> profile.
            Scoring formula version: {benchmarkProfile?.scoring_formula_version || '1.0'}.
          </p>
          <p>
            <strong>Value Score</strong> = 35% Output Quality + 25% Reliability + 15% Efficiency + 15% Cost + 10% Trust
          </p>
          <p>
            Scores require a minimum of <strong>{minSamples} validated contributions</strong> before display.
            Below that threshold, "Accumulating data" is shown instead.
          </p>
          <p>
            All telemetry is anonymized. Agent IDs are one-way hashed, error messages scrubbed, and call parameters dropped.
          </p>
        </div>
      </div>

      {/* Rankings */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Rankings</h2>

        {competitors && competitors.length > 0 ? (
          <div className="space-y-3">
            {competitors.map((comp: any, idx: number) => {
              const skill = comp.skills
              const scores = skill?.skill_scores
              const showScore = comp.sample_size >= minSamples
              const medal = getMedal(idx, comp.sample_size, minSamples)

              return (
                <div key={comp.skill_id} className={`card ${idx === 0 && showScore ? 'ring-2 ring-amber-300' : ''}`}>
                  <div className="flex items-start gap-4">
                    <div className="text-2xl w-10 text-center flex-shrink-0 pt-1">
                      {medal}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Link
                          href={`/mcp-servers/${skill?.slug}`}
                          className="font-bold text-gray-900 hover:text-brand transition-colors"
                        >
                          {skill?.canonical_name}
                        </Link>
                        {skill?.vendor_type === 'official' && (
                          <span className="badge bg-teal-light text-teal text-[10px]">Official</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mb-3">{skill?.short_description}</p>

                      {/* Score breakdown */}
                      {showScore && scores ? (
                        <div className="grid grid-cols-5 gap-3">
                          <ScoreDimension label="Output" value={scores.output_score} />
                          <ScoreDimension label="Reliability" value={scores.reliability_score} />
                          <ScoreDimension label="Efficiency" value={scores.efficiency_score} />
                          <ScoreDimension label="Cost" value={scores.cost_score} />
                          <ScoreDimension label="Trust" value={scores.trust_score} />
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 italic">
                          Accumulating data — {comp.sample_size}/{minSamples} runs recorded
                        </p>
                      )}
                    </div>

                    {/* Value Score */}
                    <div className="text-right flex-shrink-0">
                      {showScore && comp.value_score != null ? (
                        <>
                          <div className={`text-2xl font-black ${getValueColor(comp.value_score)}`}>
                            {formatScore(comp.value_score)}
                          </div>
                          <div className="text-[10px] text-gray-400">Value Score</div>
                        </>
                      ) : (
                        <div className="text-sm text-gray-300">—</div>
                      )}
                      <div className="text-[10px] text-gray-400 mt-1">
                        {comp.sample_size} run{comp.sample_size !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <p>No competitors registered for this event yet.</p>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="card text-center">
        <h3 className="font-bold text-gray-900 mb-2">Help Build This Benchmark</h3>
        <p className="text-sm text-gray-500 mb-4">
          Run the skills in this event against real tasks and submit your results.
          Comparative evaluations earn 2.5x routing credits.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/api-docs" className="btn-primary text-sm">Submit Telemetry</Link>
          <Link href="/olympics" className="btn-secondary text-sm">All Events</Link>
        </div>
      </div>
    </div>
  )
}

function PublishedReport({ report }: { report: any }) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/olympics" className="hover:text-brand transition-colors">Olympics</Link>
        <span>/</span>
        <span className="text-gray-600">Report</span>
      </div>

      <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-2">{report.title}</h1>
      <p className="text-gray-500 mb-6">{report.summary}</p>

      <div className="card mb-6">
        <h2 className="font-bold text-gray-900 mb-3">Methodology</h2>
        <p className="text-sm text-gray-600">{report.methodology}</p>
      </div>

      {report.findings_json && Object.keys(report.findings_json).length > 0 && (
        <div className="card">
          <h2 className="font-bold text-gray-900 mb-3">Findings</h2>
          <pre className="text-xs text-gray-600 overflow-x-auto">
            {JSON.stringify(report.findings_json, null, 2)}
          </pre>
        </div>
      )}

      <div className="text-sm text-gray-400 mt-6">
        Sample size: {report.sample_size} outcomes
        {report.published_at && ` · Published ${new Date(report.published_at).toLocaleDateString()}`}
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card text-center">
      <div className="text-xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  )
}

function ScoreDimension({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="text-center">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className={`text-sm font-bold ${value != null ? getValueColor(value) : 'text-gray-300'}`}>
        {value != null ? formatScore(value) : '—'}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: 'bg-green-50 text-green-700',
    running: 'bg-blue-50 text-blue-700',
    completed: 'bg-gray-100 text-gray-600',
    paused: 'bg-amber-50 text-amber-700',
  }
  return (
    <span className={`badge text-[10px] ${styles[status] || 'bg-gray-100 text-gray-500'}`}>
      {status.toUpperCase()}
    </span>
  )
}

function getMedal(index: number, sampleSize: number, minSampleSize: number): string {
  if (sampleSize < minSampleSize) return `#${index + 1}`
  if (index === 0) return '\uD83E\uDD47'
  if (index === 1) return '\uD83E\uDD48'
  if (index === 2) return '\uD83E\uDD49'
  return `#${index + 1}`
}

function getValueColor(score: number): string {
  if (score >= 8.5) return 'text-teal'
  if (score >= 7.0) return 'text-brand'
  if (score >= 5.0) return 'text-amber-600'
  return 'text-red-600'
}

function calculateAggregateStats(outcomes: any[]) {
  if (outcomes.length === 0) return { avgLatency: null, successRate: null }

  const latencies = outcomes.filter(o => o.latency_ms != null).map(o => o.latency_ms)
  const avgLatency = latencies.length > 0
    ? Math.round(latencies.reduce((a: number, b: number) => a + b, 0) / latencies.length)
    : null

  const successes = outcomes.filter(o => o.outcome_status === 'success').length
  const successRate = outcomes.length > 0
    ? Math.round((successes / outcomes.length) * 100)
    : null

  return { avgLatency, successRate }
}
