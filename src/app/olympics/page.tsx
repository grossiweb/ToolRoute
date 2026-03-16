import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatScore, getScoreColor } from '@/lib/scoring'
import Link from 'next/link'

export const revalidate = 300 // refresh every 5 minutes

export const metadata = {
  title: 'Skill Olympics — NeoSkill',
  description: 'Live head-to-head benchmarking competitions where MCP servers compete on real agent tasks.',
}

export default async function OlympicsPage() {
  const supabase = createServerSupabaseClient()

  const { data: events } = await supabase
    .from('olympic_events')
    .select(`
      id, slug, name, description, event_number, status, min_sample_size,
      benchmark_profiles ( slug, name )
    `)
    .order('event_number')

  const { data: competitors } = await supabase
    .from('olympic_event_competitors')
    .select(`
      event_id, skill_id, medal, rank, value_score, sample_size,
      skills ( slug, canonical_name, vendor_type )
    `)
    .order('rank', { ascending: true, nullsFirst: false })

  // Group competitors by event
  const competitorsByEvent = new Map<string, any[]>()
  if (competitors) {
    for (const c of competitors) {
      const eventId = c.event_id
      if (!competitorsByEvent.has(eventId)) competitorsByEvent.set(eventId, [])
      competitorsByEvent.get(eventId)!.push(c)
    }
  }

  // Count total missions and total outcomes
  const { count: missionCount } = await supabase
    .from('benchmark_missions')
    .select('*', { count: 'exact', head: true })

  const { count: outcomeCount } = await supabase
    .from('outcome_records')
    .select('*', { count: 'exact', head: true })

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold mb-4">
          LIVE COMPETITIONS
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-3">
          Skill Olympics
        </h1>
        <p className="text-gray-500 max-w-2xl mx-auto">
          Continuous benchmarking competitions where MCP servers compete head-to-head on real agent tasks.
          Results are scored on output quality, reliability, latency, cost, and correction burden.
        </p>
        <div className="flex items-center justify-center gap-8 mt-6 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-brand">{events?.length || 0}</div>
            <div className="text-gray-400">Events</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-teal">{missionCount || 0}</div>
            <div className="text-gray-400">Active Missions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600">{outcomeCount || 0}</div>
            <div className="text-gray-400">Outcome Records</div>
          </div>
        </div>
      </div>

      {/* Events Grid */}
      <div className="space-y-6">
        {events && events.length > 0 ? (
          events.map((event: any) => {
            const eventCompetitors = competitorsByEvent.get(event.id) || []
            const hasResults = eventCompetitors.some((c: any) => c.sample_size >= (event.min_sample_size || 5))

            return (
              <div key={event.id} className="card">
                {/* Event header */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-xs font-bold text-gray-400">
                        EVENT {event.event_number}
                      </span>
                      <StatusBadge status={event.status} />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">{event.name}</h2>
                    <p className="text-sm text-gray-500 mt-1">{event.description}</p>
                  </div>
                  <Link
                    href={`/reports/${event.slug}`}
                    className="btn-secondary text-xs flex-shrink-0"
                  >
                    Full Report
                  </Link>
                </div>

                {/* Leaderboard */}
                {eventCompetitors.length > 0 ? (
                  <div className="border-t border-gray-100 pt-4">
                    <div className="space-y-2">
                      {eventCompetitors.map((comp: any, idx: number) => {
                        const skill = comp.skills
                        const medal = getMedal(idx, comp.sample_size, event.min_sample_size)
                        const showScore = comp.sample_size >= (event.min_sample_size || 5)

                        return (
                          <div
                            key={comp.skill_id}
                            className={`flex items-center gap-4 px-4 py-3 rounded-lg ${
                              idx === 0 && showScore
                                ? 'bg-amber-50 border border-amber-200'
                                : 'bg-gray-50'
                            }`}
                          >
                            <div className="text-xl w-8 text-center flex-shrink-0">
                              {medal}
                            </div>
                            <div className="flex-1 min-w-0">
                              <Link
                                href={`/skills/${skill?.slug}`}
                                className="font-semibold text-sm text-gray-900 hover:text-brand transition-colors"
                              >
                                {skill?.canonical_name || 'Unknown'}
                              </Link>
                              {skill?.vendor_type === 'official' && (
                                <span className="ml-2 badge bg-teal-light text-teal text-[10px]">Official</span>
                              )}
                            </div>
                            <div className="text-right flex-shrink-0">
                              {showScore && comp.value_score != null ? (
                                <div className={`font-bold text-sm ${getScoreColor(comp.value_score)?.split(' ')[0] || ''}`}>
                                  {formatScore(comp.value_score)}
                                </div>
                              ) : (
                                <div className="text-xs text-gray-400">Accumulating data</div>
                              )}
                              <div className="text-[10px] text-gray-400">
                                {comp.sample_size} run{comp.sample_size !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-gray-100 pt-4 text-center text-sm text-gray-400 py-4">
                    No competitors yet — <Link href="/api-docs" className="text-brand hover:underline">submit telemetry</Link> to enter skills.
                  </div>
                )}
              </div>
            )
          })
        ) : (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium">Olympics loading...</p>
            <p className="text-sm mt-1">Events will appear once the database is seeded.</p>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="mt-12 text-center">
        <div className="card max-w-xl mx-auto text-center">
          <h3 className="font-bold text-gray-900 mb-2">Contribute Benchmark Data</h3>
          <p className="text-sm text-gray-500 mb-4">
            Run head-to-head comparisons and earn 2.5x routing credits.
            Benchmark packages earn 4.0x rewards.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/api-docs" className="btn-primary text-sm">
              API Docs
            </Link>
            <a
              href="https://github.com/grossiweb/NeoSkill"
              className="btn-secondary text-sm"
              target="_blank"
              rel="noopener noreferrer"
            >
              SDK on GitHub
            </a>
          </div>
        </div>
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
