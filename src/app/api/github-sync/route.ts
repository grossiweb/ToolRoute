import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  // Verify this is called by Vercel cron
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
  const errors: string[] = []

  for (const skill of skills) {
    try {
      const repoPath = extractRepoPath(skill.repo_url)
      if (!repoPath) continue

      const res = await fetch(`https://api.github.com/repos/${repoPath}`, {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
        },
      })

      if (!res.ok) {
        errors.push(`${skill.slug}: ${res.status}`)
        continue
      }

      const repo = await res.json()

      const daysSince = repo.pushed_at
        ? Math.floor((Date.now() - new Date(repo.pushed_at).getTime()) / 86400000)
        : null

      await supabase.from('skill_metrics').upsert({
        skill_id: skill.id,
        github_stars: repo.stargazers_count,
        github_forks: repo.forks_count,
        open_issues: repo.open_issues_count,
        days_since_last_commit: daysSince,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'skill_id' })

      updated++

      // Be kind to GitHub API rate limits
      await sleep(200)
    } catch (err: any) {
      errors.push(`${skill.slug}: ${err.message}`)
    }
  }

  return NextResponse.json({
    message: 'GitHub sync complete',
    updated,
    errors: errors.length > 0 ? errors : undefined,
  })
}

function extractRepoPath(url: string | null): string | null {
  if (!url) return null
  const match = url.match(/github\.com\/([^/]+\/[^/]+?)(?:\.git)?$/)
  return match ? match[1] : null
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
