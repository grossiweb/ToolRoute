import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// TEMPORARY calibration diagnostic. Embeds the Sections 1-4 (LEGIT) + Section 7
// (GAP) battery queries, runs match_tasks for each, and returns query -> top-3
// tasks + scores sorted by top-1 score so the LEGIT/GAP separator is visible.
// Remove immediately after.

const QUERIES: { id: string; label: 'LEGIT' | 'GAP'; q: string }[] = [
  { id: 'W1', label: 'LEGIT', q: 'scrape all product listings from this e-commerce page' },
  { id: 'W2', label: 'LEGIT', q: 'find recent news articles about AI regulation in Europe' },
  { id: 'W3', label: 'LEGIT', q: 'automate filling out a login form on this JavaScript-heavy site' },
  { id: 'W4', label: 'LEGIT', q: 'research our top 5 competitors with cited sources and summaries' },
  { id: 'W5', label: 'LEGIT', q: 'check if my competitor added new pages to their sitemap' },
  { id: 'W6', label: 'LEGIT', q: 'take a screenshot of this dashboard and describe it' },
  { id: 'W7', label: 'LEGIT', q: 'find the current exchange rate between USD and EUR' },
  { id: 'W8', label: 'LEGIT', q: 'navigate to this checkout flow and test all form validations' },
  { id: 'B1', label: 'LEGIT', q: 'add a new lead to Salesforce' },
  { id: 'B2', label: 'LEGIT', q: "look up a contact's deal history in HubSpot" },
  { id: 'B3', label: 'LEGIT', q: 'create a new support ticket in Zendesk' },
  { id: 'B4', label: 'LEGIT', q: 'update product inventory for 3 SKUs in Shopify' },
  { id: 'B5', label: 'LEGIT', q: "refund a customer's payment in Stripe" },
  { id: 'B6', label: 'LEGIT', q: 'create a new Stripe subscription for this customer' },
  { id: 'B7', label: 'LEGIT', q: 'list all open Zendesk tickets assigned to the team' },
  { id: 'B8', label: 'LEGIT', q: 'run a Salesforce SOQL report on Q2 pipeline' },
  { id: 'C1', label: 'LEGIT', q: 'publish a new blog post with an image' },
  { id: 'C2', label: 'LEGIT', q: 'update a page on our Sanity CMS' },
  { id: 'C3', label: 'LEGIT', q: 'create a Notion page for the project brief' },
  { id: 'C4', label: 'LEGIT', q: 'search my Obsidian vault for notes on the Q3 launch' },
  { id: 'C5', label: 'LEGIT', q: 'get the latest docs for Next.js version 15' },
  { id: 'D1', label: 'LEGIT', q: 'deploy a new Lambda function to AWS' },
  { id: 'D2', label: 'LEGIT', q: 'update a Cloudflare DNS record for my domain' },
  { id: 'D3', label: 'LEGIT', q: 'apply a Terraform plan to provision new infrastructure' },
  { id: 'D4', label: 'LEGIT', q: 'check Sentry for critical errors from the last hour' },
  { id: 'D5', label: 'LEGIT', q: 'create a Neon Postgres branch for staging' },
  { id: 'G1', label: 'GAP', q: 'post a tweet about our product launch' },
  { id: 'G2', label: 'GAP', q: 'update our LinkedIn company page with the press release' },
  { id: 'G3', label: 'GAP', q: 'send a WhatsApp message to the client' },
  { id: 'G4', label: 'GAP', q: 'create a Jira ticket for this bug' },
  { id: 'G5', label: 'GAP', q: 'generate a Figma mockup for the new onboarding flow' },
  { id: 'G6', label: 'GAP', q: 'record a walkthrough video of the new feature' },
]

async function embedBatch(key: string, inputs: string[]): Promise<number[][] | null> {
  const res = await fetch('https://openrouter.ai/api/v1/embeddings', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://toolroute.io', 'X-Title': 'ToolRoute Calib' },
    body: JSON.stringify({ model: 'google/gemini-embedding-001', input: inputs, dimensions: 1536 }),
  })
  if (!res.ok) return null
  const j = await res.json()
  if (!Array.isArray(j?.data)) return null
  const out: number[][] = []
  for (const it of j.data) out[it.index] = it.embedding
  return out
}

export async function GET() {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) return NextResponse.json({ error: 'no key' })
  const supabase = createServerSupabaseClient()
  const vecs = await embedBatch(key, QUERIES.map(x => x.q))
  if (!vecs) return NextResponse.json({ error: 'embed failed' })

  const rows: any[] = []
  for (let i = 0; i < QUERIES.length; i++) {
    const { data } = await supabase.rpc('match_tasks', { query_embedding: vecs[i], match_count: 3 })
    const top3 = (data ?? []) as { slug: string; score: number }[]
    rows.push({
      id: QUERIES[i].id,
      label: QUERIES[i].label,
      top1_task: top3[0]?.slug ?? null,
      top1: top3[0] ? +top3[0].score.toFixed(3) : null,
      top3: top3.map(t => `${t.slug}:${t.score.toFixed(3)}`),
    })
  }
  rows.sort((a, b) => (b.top1 ?? 0) - (a.top1 ?? 0))
  return NextResponse.json({ count: rows.length, rows })
}
