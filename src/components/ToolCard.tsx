import Link from 'next/link'
import { getScoreColor, formatScore } from '@/lib/scoring'

export interface ToolData {
  slug: string
  canonical_name: string
  short_description: string
  vendor_name?: string
  vendor_type?: string
  scores?: {
    overall: number | null
    output: number | null
    reliability: number | null
    efficiency: number | null
    cost: number | null
    trust: number | null
  } | null
  metrics?: {
    github_stars: number | null
    days_since_last_commit: number | null
    benchmark_runs?: number | null
  } | null
}

interface ToolCardProps {
  tool: ToolData
}

export function ToolCard({ tool }: ToolCardProps) {
  const overall = tool.scores?.overall
  const stars = tool.metrics?.github_stars
  const daysSince = tool.metrics?.days_since_last_commit
  const benchmarkRuns = tool.metrics?.benchmark_runs
  const isOfficial = tool.vendor_type === 'official'
  const isFresh = daysSince != null && daysSince <= 7

  return (
    <div className="card group flex flex-col">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Link
              href={`/skills/${tool.slug}`}
              className="font-bold text-gray-900 text-sm truncate group-hover:text-brand transition-colors"
            >
              {tool.canonical_name}
            </Link>
            {isOfficial && (
              <span className="badge bg-teal-light text-teal text-[10px]">Official</span>
            )}
            {!isOfficial && tool.vendor_type && (
              <span className="badge bg-gray-100 text-gray-500 text-[10px]">Community</span>
            )}
            {isFresh && (
              <span className="badge bg-green-50 text-green-700 text-[10px]">Active</span>
            )}
          </div>
          {tool.vendor_name && (
            <p className="text-[11px] text-gray-400 mb-0.5">{tool.vendor_name}</p>
          )}
          <p className="text-xs text-gray-500 line-clamp-2">{tool.short_description}</p>
        </div>

        {/* Score ring */}
        {overall != null ? (
          <div className={`score-ring flex-shrink-0 ${getScoreColor(overall)}`}>
            {formatScore(overall)}
          </div>
        ) : (
          <div className="score-ring flex-shrink-0 text-gray-300 border-gray-200 bg-gray-50 text-xs">
            —
          </div>
        )}
      </div>

      {/* Score pills */}
      {tool.scores && (
        <div className="flex gap-3 mt-2 pt-2 border-t border-gray-100">
          <ScorePill label="Output" value={tool.scores.output} />
          <ScorePill label="Reliability" value={tool.scores.reliability} />
          <ScorePill label="Cost" value={tool.scores.cost} />
        </div>
      )}

      {/* Trust signal */}
      {benchmarkRuns != null && benchmarkRuns > 0 && (
        <p className="text-[10px] text-gray-400 mt-2">
          Based on {benchmarkRuns} benchmark run{benchmarkRuns !== 1 ? 's' : ''}
        </p>
      )}

      {/* Actions row */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <Link
            href={`/compare?tools=${tool.slug}`}
            className="text-xs font-medium text-brand hover:text-brand/80 transition-colors"
          >
            Compare
          </Link>
          <Link
            href={`/skills/${tool.slug}`}
            className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            View Details
          </Link>
        </div>

        {/* GitHub stats */}
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <StarIcon />
            {stars != null ? formatStars(stars) : '—'}
          </div>
          {daysSince != null && (
            <span>{daysSince === 0 ? 'Today' : `${daysSince}d ago`}</span>
          )}
        </div>
      </div>
    </div>
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
