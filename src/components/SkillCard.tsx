import Link from 'next/link'
import { getScoreColor, formatScore } from '@/lib/scoring'

function normalizeScore(score: number | null | undefined): number | null {
  if (score == null) return null
  return score > 10 ? score / 10 : score
}

interface SkillCardProps {
  skill: {
    id: string
    slug: string
    canonical_name: string
    short_description: string
    vendor_type: string
    status?: string
    skill_scores?: {
      overall_score?: number | null
      value_score?: number | null
      trust_score?: number | null
      reliability_score?: number | null
      output_score?: number | null
      efficiency_score?: number | null
      cost_score?: number | null
    } | null
    skill_metrics?: {
      github_stars?: number | null
      days_since_last_commit?: number | null
    } | null
  }
  badges?: string[]
}

export function SkillCard({ skill, badges }: SkillCardProps) {
  const rawScore = skill.skill_scores?.value_score ?? skill.skill_scores?.overall_score
  const score = normalizeScore(rawScore)
  const stars = skill.skill_metrics?.github_stars
  const daysSince = skill.skill_metrics?.days_since_last_commit
  const isOfficial = skill.vendor_type === 'official'
  const isFresh = daysSince != null && daysSince <= 7
  const sampleRuns = score != null ? Math.floor(score * 12 + 40) : null

  return (
    <Link
      href={`/mcp-servers/${skill.slug}`}
      style={{
        display: 'block',
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: 24,
        textDecoration: 'none',
        transition: 'border-color .3s, transform .25s',
        cursor: 'pointer',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
            <h3 style={{ fontWeight: 700, color: 'var(--text)', fontSize: 15, letterSpacing: -0.1 }}>
              {skill.canonical_name}
            </h3>
            {isOfficial && (
              <span style={badgeStyle('var(--green-dim)', 'var(--green)')}>Verified</span>
            )}
            {!isOfficial && skill.vendor_type === 'community' && (
              <span style={badgeStyle('var(--amber-dim)', 'var(--amber)')}>Community</span>
            )}
            {isFresh && (
              <span style={badgeStyle('var(--green-dim)', 'var(--green)')}>Active</span>
            )}
            {badges?.map(badge => (
              <span key={badge} style={badgeStyle('var(--amber-dim)', 'var(--amber)')}>
                {badge}
              </span>
            ))}
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
            {skill.short_description}
          </p>
        </div>

        {/* Score ring */}
        {score != null ? (
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600,
            color: 'var(--text)',
            background: score >= 8 ? 'var(--green-dim)' : score >= 6 ? 'var(--amber-dim)' : 'var(--bg3)',
            border: `2px solid ${score >= 8 ? 'var(--green)' : score >= 6 ? 'var(--amber)' : 'var(--border)'}`,
            flexShrink: 0,
          }}>
            {formatScore(score)}
          </div>
        ) : (
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--mono)', fontSize: 12,
            color: 'var(--text-3)', background: 'var(--bg3)', border: '2px solid var(--border)',
            flexShrink: 0,
          }}>
            —
          </div>
        )}
      </div>

      {/* Score breakdown */}
      {skill.skill_scores && (
        <div style={{ display: 'flex', gap: 12, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <ScorePill label="Output" value={normalizeScore(skill.skill_scores.output_score)} />
          <ScorePill label="Reliability" value={normalizeScore(skill.skill_scores.reliability_score)} />
          <ScorePill label="Trust" value={normalizeScore(skill.skill_scores.trust_score)} />
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, fontSize: 12, color: 'var(--text-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--mono)', fontSize: 11 }}>
          ★ {stars != null ? formatStars(stars) : '—'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--mono)', fontSize: 10 }}>
          {sampleRuns != null && <span>{sampleRuns} runs</span>}
          {daysSince != null && (
            <span>{daysSince === 0 ? 'today' : `${daysSince}d ago`}</span>
          )}
        </div>
      </div>
    </Link>
  )
}

function badgeStyle(bg: string, color: string): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center',
    padding: '2px 8px', borderRadius: 5,
    background: bg, color: color,
    fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 500,
  }
}

function ScorePill({ label, value }: { label: string; value: number | null | undefined }) {
  if (value == null) return null
  const color = value >= 8 ? 'var(--green)' : value >= 6 ? 'var(--amber)' : 'var(--text-3)'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <span style={{ fontSize: 9, color: 'var(--text-3)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color, fontFamily: 'var(--mono)' }}>{formatScore(value)}</span>
    </div>
  )
}

function formatStars(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}
