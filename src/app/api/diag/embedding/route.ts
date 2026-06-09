import { NextResponse } from 'next/server'
import { diagnoseEmbedding } from '@/lib/embeddings'
import { callLlmEvaluator } from '@/lib/quality-verifier'

// TEMPORARY diagnostic endpoint. Captures (B) why the OpenAI embeddings call
// silently disables semantic matching, and (D) that the OpenRouter-repointed
// quality verifier returns a score on the happy path. No secrets returned.
// Remove once both are captured.
export async function GET() {
  const embedding = await diagnoseEmbedding()
  const score = await callLlmEvaluator(
    'Write a haiku about the ocean',
    'Waves crash on grey stone / salt wind carries distant cries / the tide pulls me home',
  )
  return NextResponse.json({
    embedding,
    verifier: { score, ok: score !== null, note: 'score is a 0-10 int when the OpenRouter eval works' },
  })
}
