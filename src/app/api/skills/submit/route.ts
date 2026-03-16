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

  const {
    repo_url,
    canonical_name,
    short_description,
    vendor_name,
    email,
    notes,
    workflow_slug,
    vertical_slug,
    capabilities,
    transport_type,
    install_method,
    license,
  } = body

  if (!repo_url || !canonical_name || !short_description) {
    return NextResponse.json(
      { error: 'repo_url, canonical_name, and short_description are required' },
      { status: 400 }
    )
  }

  if (!workflow_slug) {
    return NextResponse.json(
      { error: 'workflow_slug is required' },
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
      license: license || 'MIT',
    })
    .select('id, slug')
    .single()

  if (error || !skill) {
    return NextResponse.json({ error: 'Failed to create skill', detail: error?.message }, { status: 500 })
  }

  // Seed initial metrics
  if (githubStars > 0) {
    await supabase.from('skill_metrics').insert({
      skill_id: skill.id,
      github_stars: githubStars,
    })
  }

  // ── Create taxonomy join records ──

  // Workflow join
  if (workflow_slug) {
    const { data: workflow } = await supabase
      .from('workflows')
      .select('id')
      .eq('slug', workflow_slug)
      .single()

    if (workflow) {
      await supabase.from('skill_workflows').insert({
        skill_id: skill.id,
        workflow_id: workflow.id,
      })
    }
  }

  // Vertical join
  if (vertical_slug) {
    const { data: vertical } = await supabase
      .from('verticals')
      .select('id')
      .eq('slug', vertical_slug)
      .single()

    if (vertical) {
      await supabase.from('skill_verticals').insert({
        skill_id: skill.id,
        vertical_id: vertical.id,
      })
    }
  }

  // Capabilities join
  if (capabilities && Array.isArray(capabilities) && capabilities.length > 0) {
    const { data: capRows } = await supabase
      .from('capabilities')
      .select('id, slug')
      .in('slug', capabilities)

    if (capRows && capRows.length > 0) {
      await supabase.from('skill_capabilities').insert(
        capRows.map((c: any) => ({
          skill_id: skill.id,
          capability_id: c.id,
        }))
      )
    }
  }

  // Transport type join
  if (transport_type) {
    const { data: transport } = await supabase
      .from('transport_types')
      .select('id')
      .eq('slug', transport_type)
      .single()

    if (transport) {
      await supabase.from('skill_transport_types').insert({
        skill_id: skill.id,
        transport_type_id: transport.id,
      })
    }
  }

  // Install method join
  if (install_method) {
    const { data: method } = await supabase
      .from('install_methods')
      .select('id')
      .eq('slug', install_method)
      .single()

    if (method) {
      await supabase.from('skill_install_methods').insert({
        skill_id: skill.id,
        install_method_id: method.id,
      })
    }
  }

  // ── Initialize empty skill_scores record ──
  await supabase.from('skill_scores').insert({
    skill_id: skill.id,
    overall_score: 0,
    output_score: 0,
    reliability_score: 0,
    efficiency_score: 0,
    cost_score: 0,
    trust_score: 0,
    value_score: 0,
  })

  // ── Initialize empty skill_cost_models record ──
  await supabase.from('skill_cost_models').insert({
    skill_id: skill.id,
    pricing_model: 'free',
    monthly_base_cost_usd: 0,
  })

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
