import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// TEMPORARY. Re-embeds ALL tasks (picks up the cms-publishing 069 example) then
// runs Phase-1 self-match + dumps the content cluster. Remove after.

const CLUSTER = new Set([
  'cms-publishing', 'content-writing', 'note-management',
  'knowledge-base-search', 'documentation-lookup', 'caption-images',
])

async function embedBatch(key: string, inputs: string[]): Promise<number[][] | null> {
  const res = await fetch('https://openrouter.ai/api/v1/embeddings', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://toolroute.io', 'X-Title': 'ToolRoute Reseed' },
    body: JSON.stringify({ model: 'google/gemini-embedding-001', input: inputs, dimensions: 1536 }),
  })
  if (!res.ok) return null
  const j = await res.json()
  if (!Array.isArray(j?.data)) return null
  const out: number[][] = []
  for (const it of j.data) out[it.index] = it.embedding
  return out
}
function cos(a: number[], b: number[]) { let d = 0, na = 0, nb = 0; for (let i = 0; i < a.length; i++) { d += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i] } return d/(Math.sqrt(na)*Math.sqrt(nb)) }

export async function GET() {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) return NextResponse.json({ error: 'no key' })
  const supabase = createServerSupabaseClient()
  const { data: tasks } = await supabase.from('tasks').select('id, slug, name, description, example_query').order('display_order')
  if (!tasks?.length) return NextResponse.json({ error: 'no tasks' })

  const corpus = await embedBatch(key, tasks.map((t: any) => `${t.name}. ${t.description || ''} ${t.example_query || ''}`.trim()))
  const queries = await embedBatch(key, tasks.map((t: any) => t.example_query || ''))
  if (!corpus || !queries) return NextResponse.json({ error: 'embed failed' })

  let seeded = 0
  for (let i = 0; i < tasks.length; i++) {
    const { error } = await supabase.from('tasks').update({ embedding: '[' + corpus[i].join(',') + ']' }).eq('id', (tasks[i] as any).id)
    if (!error) seeded++
  }

  let correct = 0
  const clusterRows: any[] = []
  const failures: string[] = []
  for (let i = 0; i < tasks.length; i++) {
    const scored = tasks.map((t: any, j: number) => ({ slug: t.slug, score: cos(queries[i], corpus[j]) })).sort((a, b) => b.score - a.score)
    if (scored[0].slug === (tasks[i] as any).slug) correct++
    else failures.push(`${(tasks[i] as any).slug} -> ${scored[0].slug} (${scored[0].score.toFixed(3)})`)
    if (CLUSTER.has((tasks[i] as any).slug)) {
      clusterRows.push({ task: (tasks[i] as any).slug, top3: scored.slice(0, 3).map(s => `${s.slug}:${s.score.toFixed(3)}`) })
    }
  }

  return NextResponse.json({ seeded, self_match_accuracy_pct: +(correct / tasks.length * 100).toFixed(1), failures, content_cluster: clusterRows })
}
