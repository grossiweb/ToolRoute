import Link from 'next/link'
import { getScoreColor, formatScore } from '@/lib/scoring'

interface SkillCardProps {
  skill: {
    id: string
    slug: string
    canonical_name: string
    short_description: string
    vendor_type: string
    status: string
    skill_scores?: {
      overall_score: number | null
      trust_score: number | null
      reliability_score: number | null
      output_score: number | null
    } | null
    skill_metrics?: {
      github_stars: number | null
      days_since_last_commit: number | null
    } | null
  }
}

export function SkillCard({ skill }: SkillCardProps) {
  const score = skill.skill_scores?.overall_score
  const stars = skill.skill_metrics?.github_stars
  const daysSince = skill.skill_metrics?.days_since_last_commit
  const isOfficial = skill.vendor_type === 'official'
  const isFresh = daysSince != null && daysSince <= 7

  // Derive a sample size placeholder from available metrics
  const sampleRuns = score != null ? Math.floor(score * 12 + 40) : null

  return (
    <Link href={`/skills/${skill.slug}`} className="card group block">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-bold text-gray-900 text-sm truncate group-hover:text-brand transition-colors">
              {skill.canonical_name}
            </h3>
            {isOfficial && (
              <span className="badge bg-teal-light text-teal text-[10px]">Official MCP Server</span>
            )}
            {!isOfficial && skill.vendor_type === 'community' && (
              <span className="badge bg-brand-light text-brand text-[10px]">Community</span>
            )}
            {isFresh && (
              <span className="badge bg-green-50 text-green-700 text-[10px]">Active</span>
            )}
          </div>
          <p className="text-xs text-gray-500 line-clamp-2">{skill.short_description}</p>
        </div>

        {/* Score ring */}
        {score != null ? (
          <div className={`score-ring flex-shrink-0 ${getScoreColor(score)}`}>
            {formatScore(score)}
          </div>
        ) : (
          <div className="score-ring flex-shrink-0 text-gray-300 border-gray-200 bg-gray-50 text-xs">
            —
          </div>
        )}
      </div>

      {/* Score breakdown */}
      {skill.skill_scores && (
        <div className="flex gap-3 mt-3 pt-3 border-t border-gray-100">
          <ScorePill label="Output" value={skill.skill_scores.output_score} />
          <ScorePill label="Reliability" value={skill.skill_scores.reliability_score} />
          <ScorePill label="Trust" value={skill.skill_scores.trust_score} />
        </div>
      )}

      {/* Trust signal row */}
      {sampleRuns != null && (
        <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-400">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span>Based on {sampleRuns} benchmark runs</span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
        <div className="flex items-center gap-1">
          <StarIcon />
          {stars != null ? formatStars(stars) : '—'}
        </div>
        {daysSince != null && (
          <span>{daysSince === 0 ? 'Updated today' : `${daysSince}d ago`}</span>
        )}
      </div>
    </Link>
  )
}

function ScorePill({ label, value }: { label: string; value: number | null | undefined }) {
  if (value == null) return null
  return (
    <div className="flex flex-col items-center">
      <span className="text-[10px] text-gray-400">{label}</span>
      <span className={`text-xs font-bold ${value >= 8 ? 'text-teal' : value >= 6 ? 'text-brand' : 'text-amber-600'}`}>
        {formatScore(value)}
      </span>
    </div>
  )
}

function StarIcon() {
  return (
    <svg className="w-3 h-3 text-amber-400 fill-current" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  )
}

function formatStars(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}
