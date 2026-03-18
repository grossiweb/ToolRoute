import { createServerSupabaseClient } from '@/lib/supabase/server'
import { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServerSupabaseClient()
  const baseUrl = 'https://toolroute.io'

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/api-docs`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/compare`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${baseUrl}/combinations`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/leaderboards`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${baseUrl}/olympics`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${baseUrl}/submit`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/challenges`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/agents`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${baseUrl}/models`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/servers`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
  ]

  // Dynamic MCP server pages
  const { data: skills } = await supabase
    .from('skills')
    .select('slug, updated_at')
    .eq('status', 'active')

  const skillPages: MetadataRoute.Sitemap = (skills || []).map((skill) => ({
    url: `${baseUrl}/mcp-servers/${skill.slug}`,
    lastModified: skill.updated_at ? new Date(skill.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  // Dynamic combination pages
  const { data: combos } = await supabase
    .from('combinations')
    .select('slug, updated_at')

  const comboPages: MetadataRoute.Sitemap = (combos || []).map((combo) => ({
    url: `${baseUrl}/combinations/${combo.slug}`,
    lastModified: combo.updated_at ? new Date(combo.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  // Dynamic leaderboard pages
  const { data: workflows } = await supabase
    .from('workflows')
    .select('slug')

  const leaderboardPages: MetadataRoute.Sitemap = (workflows || []).map((w) => ({
    url: `${baseUrl}/leaderboards/${w.slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.6,
  }))

  // Dynamic report pages
  const reportPages: MetadataRoute.Sitemap = (skills || []).map((skill) => ({
    url: `${baseUrl}/reports/${skill.slug}`,
    lastModified: skill.updated_at ? new Date(skill.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.5,
  }))

  // Agent profile pages
  const { data: agents } = await supabase
    .from('agent_identities')
    .select('id')
    .eq('is_active', true)

  const agentPages: MetadataRoute.Sitemap = (agents || []).map((a) => ({
    url: `${baseUrl}/agents/${a.id}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.5,
  }))

  // Challenge pages
  const { data: challenges } = await supabase
    .from('workflow_challenges')
    .select('slug')
    .eq('status', 'active')

  const challengePages: MetadataRoute.Sitemap = (challenges || []).map((c) => ({
    url: `${baseUrl}/challenges/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  return [...staticPages, ...skillPages, ...comboPages, ...leaderboardPages, ...reportPages, ...agentPages, ...challengePages]
}
