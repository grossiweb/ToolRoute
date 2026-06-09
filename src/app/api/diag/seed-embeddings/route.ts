import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// TEMPORARY one-shot seed. Embeds all 55 tasks (name + description + example_query)
// via OpenRouter gemini-embedding-001 @1536 dims and writes the vectors into
// tasks.embedding. Idempotent (re-running re-writes the same vectors). Remove after.

async function embedBatch(key: string, inputs: string[]): Promise<number[][] | null> {
  const res = await fetch('https://openrouter.ai/api/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://toolroute.io',
      'X-Title': 'ToolRoute Seed Embeddings',
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

export async function GET() {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) return NextResponse.json({ error: 'OPENROUTER_API_KEY not set' })
  const supabase = createServerSupabaseClient()
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, name, description, example_query')
    .order('display_order')
  if (!tasks || tasks.length === 0) return NextResponse.json({ error: 'no tasks' })

  const texts = tasks.map((t: any) => `${t.name}. ${t.description || ''} ${t.example_query || ''}`.trim())
  const vecs = await embedBatch(key, texts)
  if (!vecs) return NextResponse.json({ error: 'embedding failed' })

  let seeded = 0
  const errors: any[] = []
  for (let i = 0; i < tasks.length; i++) {
    const v = vecs[i]
    if (!Array.isArray(v) || v.length !== 1536) { errors.push({ id: (tasks[i] as any).id, error: `bad vector len ${v?.length}` }); continue }
    const vecStr = '[' + v.join(',') + ']'
    const { error } = await supabase.from('tasks').update({ embedding: vecStr }).eq('id', (tasks[i] as any).id)
    if (error) errors.push({ id: (tasks[i] as any).id, error: error.message })
    else seeded++
  }

  return NextResponse.json({ total: tasks.length, seeded, errors })
}
