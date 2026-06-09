/**
 * Named-tool → catalog-skill resolution.
 *
 * When classifyTask extracts a specific named product (e.g. "Jira", "WhatsApp"),
 * this answers "do we have a skill for it?" against the LIVE catalog (so it
 * auto-resolves the day a skill is added) plus a small vendor-alias map for
 * multi-product vendors whose product name isn't in the skill slug/name.
 *
 * Returns the matching skill slug, or null when the named product is genuinely
 * unsupported (caller should then return unresolved instead of asserting a
 * different-brand substitute).
 */
import type { SupabaseClient } from '@supabase/supabase-js'

// Multi-product vendors: product name -> the skill slug that covers it.
// Curated (not a blocklist); extend as the catalog grows. The jira -> atlassian-mcp
// entry is load-bearing: atlassian-mcp's canonical_name is "Atlassian MCP" and does
// NOT contain "jira", so the catalog lookup below would miss it.
const VENDOR_ALIASES: Record<string, string> = {
  jira: 'atlassian-mcp',
  confluence: 'confluence-mcp',
  trello: 'atlassian-mcp',
  bitbucket: 'atlassian-mcp',
}

export async function resolveNamedTool(
  supabase: SupabaseClient,
  namedTool: string,
): Promise<string | null> {
  // Sanitize before using in an ilike pattern (named_tool is LLM output).
  const t = namedTool.toLowerCase().replace(/[^a-z0-9 .+-]/g, '').trim()
  if (!t) return null

  if (VENDOR_ALIASES[t]) return VENDOR_ALIASES[t]

  // Catalog membership: a featured/official skill whose name contains the token
  // wins over a random match (ORDER BY featured DESC NULLS LAST, slug).
  const { data } = await supabase
    .from('skills')
    .select('slug')
    .eq('status', 'active')
    .ilike('canonical_name', `%${t}%`)
    .order('featured', { ascending: false, nullsFirst: false })
    .order('slug', { ascending: true })
    .limit(1)

  return data?.[0]?.slug ?? null
}
