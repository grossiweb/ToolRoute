import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  // Verify this is called by Vercel cron or manual trigger with secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerSupabaseClient()

  // Fetch all active skills with GitHub URLs
  const { data: skills } = await supabase
    .from('skills')
    .select('id, slug, repo_url')
    .eq('status', 'active')
    .not('repo_url', 'is', null)

  if (!skills || skills.length === 0) {
    return NextResponse.json({ message: 'No skills to sync', updated: 0 })
  }

  let updated = 0
  let scoresUpdated = 0
  const errors: string[] = []

  for (const skill of skills) {
    try {
      const repoPath = extractRepoPath(skill.repo_url)
      if (!repoPath) continue

      const res = await fetch(`https://api.github.com/repos/${repoPath}`, {
        headers: {
          ...(process.env.GITHUB_TOKEN
            ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
            : {}),
          Accept: 'application/vnd.github.v3+json',
        },
      })

      if (!res.ok) {
        errors.push(`${skill.slug}: GitHub API ${res.status}`)
        continue
      }

      const repo = await res.json()

      const daysSinceCommit = repo.pushed_at
        ? Math.floor((Date.now() - new Date(repo.pushed_at).getTime()) / 86400000)
        : null

      const daysSinceCreated = repo.created_at
        ? Math.floor((Date.now() - new Date(repo.created_at).getTime()) / 86400000)
        : null

      // Upsert metrics
      await supabase.from('skill_metrics').upsert({
        skill_id: skill.id,
        github_stars: repo.stargazers_count,
        github_forks: repo.forks_count,
        open_issues: repo.open_issues_count,
        days_since_last_commit: daysSinceCommit,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'skill_id' })

      updated++

      // ── Recalculate derived scores ──
      const freshness = calcFreshnessScore(daysSinceCommit)
      const adoption = calcAdoptionScore(repo.stargazers_count, repo.forks_count)
      const trustDelta = calcTrustSignals(
        daysSinceCommit,
        daysSinceCreated,
        repo.open_issues_count,
        repo.stargazers_count,
        repo.license?.spdx_id,
        repo.archived,
      )

      // Update scores — merge with existing (don't overwrite outcome-based scores)
      const { data: existingScores } = await supabase
        .from('skill_scores')
        .select('*')
        .eq('skill_id', skill.id)
        .single()

      if (existingScores) {
        // Blend trust: 70% existing (outcome-derived) + 30% GitHub signals
        const blendedTrust = Math.min(10,
          (existingScores.trust_score || 5) * 0.7 + trustDelta * 0.3
        )

        // Recalculate value score with updated components
        const outputScore = existingScores.output_score || 0
        const reliabilityScore = existingScores.reliability_score || 0
        const efficiencyScore = existingScores.efficiency_score || 0
        const costScore = existingScores.cost_score || 0
        const valueScore =
          0.35 * outputScore +
          0.25 * reliabilityScore +
          0.15 * efficiencyScore +
          0.15 * costScore +
          0.10 * blendedTrust

        await supabase.from('skill_scores').update({
          adoption_score: adoption,
          freshness_score: freshness,
          trust_score: parseFloat(blendedTrust.toFixed(2)),
          value_score: parseFloat(valueScore.toFixed(2)),
          overall_score: parseFloat(
            ((valueScore * 0.6 + adoption * 0.2 + freshness * 0.2)).toFixed(2)
          ),
          updated_at: new Date().toISOString(),
        }).eq('skill_id', skill.id)

        scoresUpdated++
      } else {
        // No scores record yet — create one with GitHub-only signals
        await supabase.from('skill_scores').insert({
          skill_id: skill.id,
          adoption_score: adoption,
          freshness_score: freshness,
          trust_score: trustDelta,
          overall_score: parseFloat(((adoption * 0.5 + freshness * 0.3 + trustDelta * 0.2)).toFixed(2)),
        })
        scoresUpdated++
      }

      // Auto-detect license and update skills table
      if (repo.license?.spdx_id && repo.license.spdx_id !== 'NOASSERTION') {
        await supabase.from('skills').update({
          license: repo.license.spdx_id,
          updated_at: new Date().toISOString(),
        }).eq('id', skill.id)
      }

      // Auto-detect description if missing
      if (repo.description) {
        const { data: skillData } = await supabase
          .from('skills')
          .select('long_description')
          .eq('id', skill.id)
          .single()

        if (!skillData?.long_description) {
          await supabase.from('skills').update({
            long_description: repo.description,
          }).eq('id', skill.id)
        }
      }

      // Be kind to GitHub API rate limits
      await sleep(250)
    } catch (err: any) {
      errors.push(`${skill.slug}: ${err.message}`)
    }
  }

  return NextResponse.json({
    message: 'GitHub sync complete',
    skills_synced: updated,
    scores_recalculated: scoresUpdated,
    total_skills: skills.length,
    errors: errors.length > 0 ? errors : undefined,
    next_run: 'Tomorrow at 00:00 UTC',
  })
}

// ── Score Calculators ──

function calcFreshnessScore(daysSinceCommit: number | null): number {
  if (daysSinceCommit == null) return 5.0
  if (daysSinceCommit <= 1) return 10.0
  if (daysSinceCommit <= 7) return 9.5
  if (daysSinceCommit <= 14) return 9.0
  if (daysSinceCommit <= 30) return 8.0
  if (daysSinceCommit <= 60) return 7.0
  if (daysSinceCommit <= 90) return 6.0
  if (daysSinceCommit <= 180) return 4.5
  if (daysSinceCommit <= 365) return 3.0
  return 1.5
}

function calcAdoptionScore(stars: number, forks: number): number {
  // Log scale — 1000 stars = ~8.0, 10000 = ~9.0, 50000 = ~10.0
  const starScore = Math.min(10, Math.log10(Math.max(stars, 1)) * 2.5)
  const forkScore = Math.min(10, Math.log10(Math.max(forks, 1)) * 3.0)
  return parseFloat(Math.min(10, starScore * 0.7 + forkScore * 0.3).toFixed(1))
}

function calcTrustSignals(
  daysSinceCommit: number | null,
  daysSinceCreated: number | null,
  openIssues: number,
  stars: number,
  licenseId: string | null | undefined,
  archived: boolean,
): number {
  let score = 7.0 // base trust

  // Active maintenance = trust
  if (daysSinceCommit != null) {
    if (daysSinceCommit <= 7) score += 1.0
    else if (daysSinceCommit <= 30) score += 0.5
    else if (daysSinceCommit > 180) score -= 1.5
    else if (daysSinceCommit > 90) score -= 0.5
  }

  // Maturity = trust (older repos with activity are more reliable)
  if (daysSinceCreated != null && daysSinceCreated > 365) score += 0.5

  // Issue responsiveness signal (low ratio = responsive maintainer)
  if (stars > 100) {
    const issueRatio = openIssues / stars
    if (issueRatio < 0.01) score += 0.5
    else if (issueRatio > 0.1) score -= 0.5
  }

  // License boosts trust
  if (licenseId && licenseId !== 'NOASSERTION') score += 0.5

  // Archived = major trust penalty
  if (archived) score -= 3.0

  return parseFloat(Math.max(0, Math.min(10, score)).toFixed(1))
}

function extractRepoPath(url: string | null): string | null {
  if (!url) return null
  const match = url.match(/github\.com\/([^/]+\/[^/]+?)(?:\.git)?$/)
  return match ? match[1] : null
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
