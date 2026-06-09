import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// TEMPORARY Phase-1 eval harness. Embeds all 55 tasks (name + description +
// example_query) as the corpus, and each task's example_query as a query, then
// checks whether each query's nearest task is itself (self-match baseline).
// Reports accuracy + the tasks that fail self-match (weak priors). Remove after.

async function embedBatch(key: string, inputs: string[]): Promise<number[][] | null> {
  const res = await fetch('https://openrouter.ai/api/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://toolroute.io',
      'X-Title': 'ToolRoute TaskMatch Diag',
    },
    body: JSON.stringify({ model: 'google/gemini-embedding-001', input: inputs, dimensions: 1536 }),
  })
  if (!res.ok) return null
  const j = await res.json()
  const data = j?.data
  if (!Array.isArray(data)) return null
  const out: number[][] = []
  for (const item of data) out[item.index] = item.embedding
  return out
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i] }
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

export async function GET() {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) return NextResponse.json({ error: 'OPENROUTER_API_KEY not set' })
  const supabase = createServerSupabaseClient()
  const { data: tasks } = await supabase
    .from('tasks')
    .select('slug, name, description, example_query')
    .order('display_order')
  if (!tasks || tasks.length === 0) return NextResponse.json({ error: 'no tasks' })

  const corpusTexts = tasks.map((t: any) => `${t.name}. ${t.description || ''} ${t.example_query || ''}`.trim())
  const queryTexts = tasks.map((t: any) => t.example_query || '')

  const corpus = await embedBatch(key, corpusTexts)
  const queries = await embedBatch(key, queryTexts)
  if (!corpus || !queries) return NextResponse.json({ error: 'embedding failed' })

  let correct = 0
  const failures: any[] = []
  for (let i = 0; i < tasks.length; i++) {
    let best = -1, bestJ = -1
    for (let j = 0; j < tasks.length; j++) {
      const s = cosine(queries[i], corpus[j])
      if (s > best) { best = s; bestJ = j }
    }
    const selfScore = cosine(queries[i], corpus[i])
    if (bestJ === i) correct++
    else failures.push({
      task: (tasks[i] as any).slug,
      matched_instead: (tasks[bestJ] as any).slug,
      self_score: +selfScore.toFixed(3),
      match_score: +best.toFixed(3),
    })
  }

  return NextResponse.json({
    count: tasks.length,
    correct,
    accuracy_pct: +(correct / tasks.length * 100).toFixed(1),
    failures,
  })
}
