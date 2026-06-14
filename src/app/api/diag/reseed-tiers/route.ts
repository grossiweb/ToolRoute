import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// TEMPORARY. Embeds all tier_examples rows (google/gemini-embedding-001 @1536),
// writes the vectors, then reports self-consistency: for each example, the nearest
// OTHER example should share its tier. Remove after one run.

async function embedBatch(key: string, inputs: string[]): Promise<{ vecs: number[][] | null; err: string }> {
  const res = await fetch('https://openrouter.ai/api/v1/embeddings', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://toolroute.io', 'X-Title': 'ToolRoute Tier Reseed' },
    body: JSON.stringify({ model: 'google/gemini-embedding-001', input: inputs, dimensions: 1536 }),
  })
  if (!res.ok) return { vecs: null, err: `HTTP ${res.status}: ${(await res.text()).slice(0, 300)}` }
  const j = await res.json()
  if (!Array.isArray(j?.data)) return { vecs: null, err: `non-array data: ${JSON.stringify(j).slice(0, 300)}` }
  const out: number[][] = []
  for (const it of j.data) out[it.index] = it.embedding
  return { vecs: out, err: '' }
}
function cos(a: number[], b: number[]) { let d = 0, na = 0, nb = 0; for (let i = 0; i < a.length; i++) { d += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i] } return d/(Math.sqrt(na)*Math.sqrt(nb)) }

export async function GET() {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) return NextResponse.json({ error: 'no key' })
  const supabase = createServerSupabaseClient()
  const { data: rows } = await supabase.from('tier_examples').select('id, tier, example_query').order('tier')
  if (!rows?.length) return NextResponse.json({ error: 'no rows' })

  const { vecs, err } = await embedBatch(key, rows.map((r: any) => r.example_query))
  if (!vecs) return NextResponse.json({ error: 'embed failed', detail: err })

  let seeded = 0
  for (let i = 0; i < rows.length; i++) {
    const { error } = await supabase.from('tier_examples').update({ embedding: '[' + vecs[i].join(',') + ']' }).eq('id', (rows[i] as any).id)
    if (!error) seeded++
  }

  // Self-consistency: nearest OTHER example should share tier.
  let neighborMatch = 0
  const misses: string[] = []
  for (let i = 0; i < rows.length; i++) {
    let bestJ = -1, bestScore = -1
    for (let j = 0; j < rows.length; j++) {
      if (i === j) continue
      const s = cos(vecs[i], vecs[j])
      if (s > bestScore) { bestScore = s; bestJ = j }
    }
    const same = (rows[i] as any).tier === (rows[bestJ] as any).tier
    if (same) neighborMatch++
    else misses.push(`"${(rows[i] as any).example_query}" (${(rows[i] as any).tier}) -> ${(rows[bestJ] as any).tier} @${bestScore.toFixed(3)}`)
  }

  return NextResponse.json({
    seeded,
    total: rows.length,
    neighbor_tier_match_pct: +(neighborMatch / rows.length * 100).toFixed(1),
    misses,
  })
}
