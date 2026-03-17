import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatScore } from '@/lib/scoring'
import Link from 'next/link'

type InsightType =
  | 'top_scorer'
  | 'best_output'
  | 'most_reliable'
  | 'best_budget'
  | 'trending'
  | 'community_pick'

interface FeedItem {
  type: InsightType
  label: string
  icon: string
  skillName: string
  skillSlug: string
  score: string
  suffix?: string
}

const INSIGHT_META: Record<InsightType, { label: string; icon: string }> = {
  top_scorer: { label: 'Top Value Score', icon: '🏆' },
  best_output: { label: 'Best Output Quality', icon: '✦' },
  most_reliable: { label: 'Most Reliable', icon: '🛡' },
  best_budget: { label: 'Best Budget Pick', icon: '💰' },
  trending: { label: 'Most Active', icon: '🔥' },
  community_pick: { label: 'Community Favorite', icon: '⭐' },
}

export async function DecisionFeed() {
  const supabase = createServerSupabaseClient()

  const { data: skills } = await supabase
    .from('skills')
    .select(`
      slug, canonical_name,
      skill_scores ( value_score, output_score, reliability_score, cost_score ),
      skill_metrics ( github_stars, days_since_last_commit )
    `)
    .eq('status', 'active')
    .order('canonical_name')
    .limit(100)

  if (!skills || skills.length === 0) return null

  // Normalize joined rows — Supabase returns 1:1 joins as objects or arrays
  const normalized = skills.map((s) => {
    const scores = Array.isArray(s.skill_scores) ? s.skill_scores[0] : s.skill_scores
    const metrics = Array.isArray(s.skill_metrics) ? s.skill_metrics[0] : s.skill_metrics
    return {
      slug: s.slug,
      name: s.canonical_name,
      valueScore: scores?.value_score ?? null,
      outputScore: scores?.output_score ?? null,
      reliabilityScore: scores?.reliability_score ?? null,
      costScore: scores?.cost_score ?? null,
      stars: metrics?.github_stars ?? null,
      daysSinceCommit: metrics?.days_since_last_commit ?? null,
    }
  })

  // Build feed items by finding the winner for each insight type
  const feedItems: FeedItem[] = []

  // Top Value Score
  const topValue = normalized
    .filter((s) => s.valueScore != null)
    .sort((a, b) => (b.valueScore ?? 0) - (a.valueScore ?? 0))[0]
  if (topValue) {
    feedItems.push({
      type: 'top_scorer',
      ...INSIGHT_META.top_scorer,
      skillName: topValue.name,
      skillSlug: topValue.slug,
      score: formatScore(topValue.valueScore),
    })
  }

  // Best Output Quality
  const bestOutput = normalized
    .filter((s) => s.outputScore != null)
    .sort((a, b) => (b.outputScore ?? 0) - (a.outputScore ?? 0))[0]
  if (bestOutput && bestOutput.slug !== topValue?.slug) {
    feedItems.push({
      type: 'best_output',
      ...INSIGHT_META.best_output,
      skillName: bestOutput.name,
      skillSlug: bestOutput.slug,
      score: formatScore(bestOutput.outputScore),
    })
  }

  // Most Reliable
  const mostReliable = normalized
    .filter((s) => s.reliabilityScore != null)
    .sort((a, b) => (b.reliabilityScore ?? 0) - (a.reliabilityScore ?? 0))[0]
  if (mostReliable && !feedItems.some((f) => f.skillSlug === mostReliable.slug)) {
    feedItems.push({
      type: 'most_reliable',
      ...INSIGHT_META.most_reliable,
      skillName: mostReliable.name,
      skillSlug: mostReliable.slug,
      score: formatScore(mostReliable.reliabilityScore),
    })
  }

  // Best Budget Pick
  const bestBudget = normalized
    .filter((s) => s.costScore != null)
    .sort((a, b) => (b.costScore ?? 0) - (a.costScore ?? 0))[0]
  if (bestBudget && !feedItems.some((f) => f.skillSlug === bestBudget.slug)) {
    feedItems.push({
      type: 'best_budget',
      ...INSIGHT_META.best_budget,
      skillName: bestBudget.name,
      skillSlug: bestBudget.slug,
      score: formatScore(bestBudget.costScore),
    })
  }

  // Most Active (lowest days_since_last_commit)
  const trending = normalized
    .filter((s) => s.daysSinceCommit != null && s.daysSinceCommit >= 0)
    .sort((a, b) => (a.daysSinceCommit ?? 999) - (b.daysSinceCommit ?? 999))[0]
  if (trending) {
    feedItems.push({
      type: 'trending',
      ...INSIGHT_META.trending,
      skillName: trending.name,
      skillSlug: trending.slug,
      score: `${trending.daysSinceCommit}d`,
      suffix: 'ago',
    })
  }

  // Community Favorite (most stars)
  const communityPick = normalized
    .filter((s) => s.stars != null && s.stars > 0)
    .sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0))[0]
  if (communityPick) {
    feedItems.push({
      type: 'community_pick',
      ...INSIGHT_META.community_pick,
      skillName: communityPick.name,
      skillSlug: communityPick.slug,
      score: (communityPick.stars ?? 0).toLocaleString(),
      suffix: 'stars',
    })
  }

  if (feedItems.length === 0) return null

  return (
    <section className="mb-10">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-teal" />
        </span>
        <h2 className="text-sm font-bold text-gray-900 tracking-wide uppercase">
          What&apos;s Winning Right Now
        </h2>
      </div>

      {/* Feed grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {feedItems.map((item) => (
          <Link
            key={item.type}
            href={`/mcp-servers/${item.skillSlug}`}
            className="group rounded-xl border border-gray-100 bg-white p-3 hover:border-brand/20 hover:shadow-sm transition-all"
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-sm" aria-hidden="true">
                {item.icon}
              </span>
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                {item.label}
              </span>
            </div>
            <div className="font-bold text-sm text-gray-900 group-hover:text-brand transition-colors truncate">
              {item.skillName}
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-lg font-black text-teal">{item.score}</span>
              {item.suffix && (
                <span className="text-[10px] text-gray-400 font-medium">{item.suffix}</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
