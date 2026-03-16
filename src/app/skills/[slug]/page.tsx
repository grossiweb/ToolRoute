import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { getScoreColor, formatScore, getGradeLabel } from '@/lib/scoring'

export const revalidate = 3600

export default async function SkillPage({ params }: { params: { slug: string } }) {
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-6 mb-8">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="text-3xl font-black text-gray-900">{skill.canonical_name}</h1>
            {skill.vendor_type === 'official' && (
              <span className="badge bg-teal-light text-teal text-xs">Official</span>
            )}
            {grade && (
              <span className="badge bg-brand-light text-brand text-xs">{grade}</span>
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
              <span className="text-[10px] font-semibold opacity-70">NeoSkill</span>
            </div>
          </div>
        )}
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
            Scores update as agents report execution data. {score.overall_score ? `Based on accumulated telemetry. Score version ${score.score_version}.` : 'Accumulating data.'}
          </p>
        </div>
      )}

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

      {/* Contribute */}
      <div className="border border-brand/30 bg-brand-light rounded-xl p-6">
        <h2 className="text-base font-bold text-brand mb-2">Help improve this score</h2>
        <p className="text-sm text-gray-600 mb-4">
          Used this skill? Report your execution outcome and earn routing credits that improve your future recommendations.
        </p>
        <a href="/contribute" className="btn-primary text-sm">
          Report an outcome →
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
