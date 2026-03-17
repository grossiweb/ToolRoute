import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

/**
 * GET /api/badge/[slug]
 * Returns an SVG badge showing the ToolRoute score for a given MCP server.
 * Use in README.md: ![ToolRoute Score](https://toolroute.io/api/badge/firecrawl-mcp)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const supabase = createServerSupabaseClient()

  const { data: skill } = await supabase
    .from('skills')
    .select('canonical_name, skill_scores ( overall_score )')
    .eq('slug', params.slug)
    .eq('status', 'active')
    .single()

  const score = skill?.skill_scores?.overall_score
  const label = 'ToolRoute'
  const scoreText = score != null ? `${score.toFixed(1)}/10` : 'unrated'

  // Color based on score
  let color = '#9ca3af' // gray for unrated
  if (score != null) {
    if (score >= 9) color = '#059669' // emerald
    else if (score >= 8) color = '#16a34a' // green
    else if (score >= 7) color = '#ca8a04' // yellow
    else if (score >= 6) color = '#ea580c' // orange
    else color = '#dc2626' // red
  }

  const labelWidth = 70
  const scoreWidth = score != null ? 55 : 60
  const totalWidth = labelWidth + scoreWidth

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${label}: ${scoreText}">
  <title>${label}: ${scoreText}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${scoreWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text aria-hidden="true" x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${labelWidth / 2}" y="14">${label}</text>
    <text aria-hidden="true" x="${labelWidth + scoreWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${scoreText}</text>
    <text x="${labelWidth + scoreWidth / 2}" y="14">${scoreText}</text>
  </g>
</svg>`

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
