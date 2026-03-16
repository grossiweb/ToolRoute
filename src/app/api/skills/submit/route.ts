import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { repo_url, canonical_name, short_description, vendor_name, email, notes } = body

  if (!repo_url || !canonical_name || !short_description) {
    return NextResponse.json(
      { error: 'repo_url, canonical_name, and short_description are required' },
      { status: 400 }
    )
  }

  // Generate a slug from canonical_name
  const slug = canonical_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  // Check if already exists
  const { data: existing } = await supabase
    .from('skills')
    .select('id')
    .eq('slug', slug)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'A skill with this name already exists' }, { status: 409 })
  }

  // Try to get GitHub star count to determine auto-approval
  let githubStars = 0
  try {
    const repoMatch = repo_url.match(/github\.com\/([^/]+\/[^/]+?)(?:\.git)?$/)
    if (repoMatch) {
      const res = await fetch(`https://api.github.com/repos/${repoMatch[1]}`, {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
        },
      })
      if (res.ok) {
        const data = await res.json()
        githubStars = data.stargazers_count || 0
      }
    }
  } catch {
    // Proceed without star count
  }

  // Auto-approve if 10+ stars
  const status = githubStars >= 10 ? 'active' : 'beta'

  // Insert skill
  const { data: skill, error } = await supabase
    .from('skills')
    .insert({
      canonical_name,
      slug,
      repo_url,
      vendor_name: vendor_name || 'Community',
      vendor_type: 'community',
      short_description,
      status,
      open_source: true,
    })
    .select('id, slug')
    .single()

  if (error || !skill) {
    return NextResponse.json({ error: 'Failed to create skill' }, { status: 500 })
  }

  // Seed initial metrics
  if (githubStars > 0) {
    await supabase.from('skill_metrics').insert({
      skill_id: skill.id,
      github_stars: githubStars,
    })
  }

  return NextResponse.json({
    success: true,
    slug: skill.slug,
    status,
    auto_approved: status === 'active',
    message: status === 'active'
      ? 'Skill auto-approved based on GitHub star count.'
      : 'Skill submitted for review. Will be approved within 48 hours.',
  }, { status: 201 })
}
