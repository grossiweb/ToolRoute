import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatScore, getScoreColor } from '@/lib/scoring'
import Link from 'next/link'

export const revalidate = 300 // refresh every 5 minutes

export const metadata = {
  title: 'MCP Server Olympics — ToolRoute',
  description: 'Live head-to-head benchmarking competitions where MCP servers compete on real agent tasks.',
}

function getConfidenceLevel(sampleSize: number): { label: string; color: string } {
  if (sampleSize >= 50) return { label: 'High', color: 'text-teal bg-teal-light' }
  if (sampleSize >= 20) return { label: 'Medium', color: 'text-brand bg-brand-light' }
  if (sampleSize >= 5) return { label: 'Low', color: 'text-amber-700 bg-amber-50' }
  return { label: 'Accumulating', color: 'text-[var(--text-2)] bg-[var(--bg3)]' }
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
      <div className="page-hero" style={{ padding: '56px 0 40px', borderBottom: '1px solid var(--border)' }}>
        <div className="page-hero-label">LIVE COMPETITIONS</div>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 400, lineHeight: 1.05, color: 'var(--text)', marginBottom: 12 }}>
          MCP Server<br /><em style={{ fontStyle: 'italic', color: 'var(--amber)' }}>Olympics.</em>
        </h1>
        <p className="text-[var(--text-2)] max-w-2xl mx-auto">
          Continuous benchmarking competitions where MCP servers compete head-to-head on real agent tasks.
          Results are scored on output quality, reliability, latency, cost, and correction burden.
        </p>
        <div className="flex items-center justify-center gap-8 mt-6 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-brand">{events?.length || 0}</div>
            <div className="text-[var(--text-3)]">Events</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-teal">{missionCount || 0}</div>
            <div className="text-[var(--text-3)]">Active Missions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600">{outcomeCount || 0}</div>
            <div className="text-[var(--text-3)]">Outcome Records</div>
          </div>
        </div>
      </div>

      {/* How Benchmarks Work */}
      <div className="mb-10 rounded-xl border border-[var(--border)] bg-[var(--bg2)] px-6 py-5">
        <h3 className="font-bold text-[var(--text)] text-sm mb-2">How benchmarks work</h3>
        <p className="text-sm text-[var(--text-2)] leading-relaxed">
          Each event runs real agent workflows across MCP servers. Scores combine:&nbsp;
          <span className="font-semibold text-[var(--text-2)]">Output quality</span>,&nbsp;
          <span className="font-semibold text-[var(--text-2)]">Reliability</span>,&nbsp;
          <span className="font-semibold text-[var(--text-2)]">Latency</span>,&nbsp;
          <span className="font-semibold text-[var(--text-2)]">Cost per successful outcome</span>,&nbsp;
          <span className="font-semibold text-[var(--text-2)]">Human correction burden</span>.
        </p>
      </div>

      {/* Events Grid */}
      <div className="space-y-6">
        {events && events.length > 0 ? (
          events.map((event: any) => {
            const eventCompetitors = competitorsByEvent.get(event.id) || []
            const hasResults = eventCompetitors.some((c: any) => c.sample_size >= (event.min_sample_size || 5))

            // Compute event-level stats
            const totalSamples = eventCompetitors.reduce((sum: number, c: any) => sum + (c.sample_size || 0), 0)
            const confidence = getConfidenceLevel(totalSamples)

            return (
              <div key={event.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }} className="">
                {/* Event header */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-xs font-bold text-[var(--text-3)]">
                        EVENT {event.event_number}
                      </span>
                      <StatusBadge status={event.status} />
                    </div>
                    <h2 className="text-lg font-bold text-[var(--text)]">{event.name}</h2>
                    <p className="text-sm text-[var(--text-2)] mt-1">{event.description}</p>
                  </div>
                  {hasResults ? (
                    <Link
                      href={`/reports/${event.slug}`}
                      className="btn-secondary text-xs flex-shrink-0"
                    >
                      Full Report
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg2)] text-xs text-[var(--text-3)] flex-shrink-0 cursor-default">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Report Coming Soon
                    </span>
                  )}
                </div>

                {/* Event stats bar */}
                <div className="flex items-center gap-4 text-xs text-[var(--text-2)] mb-4 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-[var(--text-2)]">Sample size:</span>
                    <span className="font-bold text-[var(--text)]">{totalSamples}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-[var(--text-2)]">Confidence:</span>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${confidence.color}`}>
                      {confidence.label}
                    </span>
                  </div>
                </div>

                {/* Rankings */}
                {eventCompetitors.length > 0 ? (
                  <div className="border-t border-[var(--border)] pt-4">
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
                                : 'bg-[var(--bg2)]'
                            }`}
                          >
                            <div className="text-xl w-8 text-center flex-shrink-0">
                              {medal}
                            </div>
                            <div className="flex-1 min-w-0">
                              <Link
                                href={`/mcp-servers/${skill?.slug}`}
                                className="font-semibold text-sm text-[var(--text)] hover:text-brand transition-colors"
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
                                <div className="text-xs text-[var(--text-3)]">Accumulating data</div>
                              )}
                              <div className="text-[10px] text-[var(--text-3)]">
                                {comp.sample_size} run{comp.sample_size !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-[var(--border)] pt-4 text-center text-sm text-[var(--text-3)] py-4">
                    No competitors yet — <Link href="/api-docs" className="text-brand hover:underline">submit telemetry</Link> to enter MCP servers.
                  </div>
                )}
              </div>
            )
          })
        ) : (
          <div className="text-center py-20 text-[var(--text-3)]">
            <p className="text-lg font-medium">Olympics loading...</p>
            <p className="text-sm mt-1">Events will appear once the database is seeded.</p>
          </div>
        )}
      </div>

      {/* Telemetry Incentive Callout */}
      <div className="mt-10 rounded-xl border border-teal/20 bg-teal-light px-6 py-5 text-center">
        <h3 className="font-bold text-teal mb-1 text-sm">Earn routing credits by reporting outcomes</h3>
        <p className="text-sm text-[var(--text-2)]">
          Agents that submit telemetry receive routing credits, benchmark rewards, and leaderboard ranking.
        </p>
      </div>

      {/* CTA */}
      <div className="mt-8 text-center">
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }} className=" max-w-xl mx-auto text-center">
          <h3 className="font-bold text-[var(--text)] mb-2">Contribute Benchmark Data</h3>
          <p className="text-sm text-[var(--text-2)] mb-4">
            Run head-to-head comparisons and earn 2.5x routing credits.
            Benchmark packages earn 4.0x rewards.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/api-docs" className="btn-primary text-sm">
              API Docs
            </Link>
            <a
              href="https://github.com/grossiweb/ToolRoute"
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
    completed: 'bg-[var(--bg3)] text-[var(--text-2)]',
    paused: 'bg-amber-50 text-amber-700',
  }
  return (
    <span className={`badge text-[10px] ${styles[status] || 'bg-[var(--bg3)] text-[var(--text-2)]'}`}>
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
