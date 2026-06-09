import { NextResponse } from 'next/server'
import { diagnoseEmbedding } from '@/lib/embeddings'

// TEMPORARY diagnostic endpoint. Exercises the OpenAI embeddings call once and
// returns its raw status/body (no secrets) so we can see why semantic matching
// silently disables in prod. Remove once the cause is captured.
export async function GET() {
  return NextResponse.json(await diagnoseEmbedding())
}
