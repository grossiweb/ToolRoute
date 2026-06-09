/**
 * Phase 2 semantic task matcher (TOOL PRECISION ONLY).
 *
 * The LLM classifier (task-classifier.ts) owns the do-vs-explain decision and is
 * left untouched — it scores 100% on that. This module's job is the downstream
 * problem: once a tool IS needed, pick the SPECIFIC right skill via per-task
 * priors instead of a coarse tool_category bucket.
 *
 * Flow: embed query (OpenRouter gemini-embedding-001 @1536) -> match_tasks RPC
 * (pgvector cosine top-3) -> confidence gate -> skill_tasks priors -> top skill.
 * Any uncertainty or failure degrades to the existing classifyTask -> workflow
 * path (status 'fallback'/'ambiguous'/'unresolved'), never an error.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

const EMBED_MODEL = 'google/gemini-embedding-001'
const EMBED_DIMS = 1536
const CONFIDENCE_THRESHOLD = 0.7  // top-1 below this -> unresolved (don't assert)
const AMBIGUITY_MARGIN = 0.05     // top-1 and top-2 within this -> defer to LLM

export interface TaskMatch { id: string; slug: string; name: string; score: number }
export interface SkillPrior { slug: string; relevance_score: number }
export interface MatcherResult {
  status: 'confident' | 'ambiguous' | 'unresolved' | 'fallback'
  top: TaskMatch | null
  candidates: TaskMatch[]
  recommended_skill: string | null
  skill_candidates: SkillPrior[]
  confidence: number
}

const FALLBACK: MatcherResult = {
  status: 'fallback', top: null, candidates: [], recommended_skill: null, skill_candidates: [], confidence: 0,
}

async function embedQuery(text: string): Promise<number[] | null> {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) {
    console.warn('[task-matcher] OPENROUTER_API_KEY not set — deferring to fallback')
    return null
  }
  try {
    const res = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://toolroute.io',
        'X-Title': 'ToolRoute Task Matcher',
      },
      body: JSON.stringify({ model: EMBED_MODEL, input: text, dimensions: EMBED_DIMS }),
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) {
      console.warn(`[task-matcher] embeddings HTTP ${res.status} — deferring to fallback`)
      return null
    }
    const j = await res.json()
    const v = j?.data?.[0]?.embedding
    return Array.isArray(v) && v.length === EMBED_DIMS ? v : null
  } catch (err) {
    console.warn('[task-matcher] embeddings error — deferring to fallback:', err)
    return null
  }
}

export async function matchTask(supabase: SupabaseClient, query: string): Promise<MatcherResult> {
  const embedding = await embedQuery(query)
  if (!embedding) return FALLBACK

  const { data: matches, error } = await supabase.rpc('match_tasks', {
    query_embedding: embedding,
    match_count: 3,
  })
  if (error || !matches || matches.length === 0) {
    if (error) console.warn('[task-matcher] match_tasks rpc error — deferring to fallback:', error.message)
    return FALLBACK
  }

  const top3 = matches as TaskMatch[]
  const top = top3[0]

  // Confidence gate: nothing close enough -> unresolved. Fixes the Section-7
  // gap-FAILs (a tool with no task, e.g. WhatsApp, scores low and won't assert).
  if (top.score < CONFIDENCE_THRESHOLD) {
    return { status: 'unresolved', top, candidates: top3, recommended_skill: null, skill_candidates: [], confidence: top.score }
  }

  // Two-level / ambiguity: top-2 nearly tied -> defer to the LLM workflow path
  // rather than force a leaf (protects against ambiguity as the taxonomy grows).
  if (top3.length >= 2 && (top.score - top3[1].score) < AMBIGUITY_MARGIN) {
    return { status: 'ambiguous', top, candidates: top3, recommended_skill: null, skill_candidates: [], confidence: top.score }
  }

  // Confident -> pull the matched task's skill priors, ranked by relevance_score.
  const { data: priors, error: priorErr } = await supabase
    .from('skill_tasks')
    .select('relevance_score, skills!inner(slug)')
    .eq('task_id', top.id)
    .order('relevance_score', { ascending: false })

  if (priorErr) {
    console.warn('[task-matcher] skill_tasks query error — deferring to fallback:', priorErr.message)
    return FALLBACK
  }

  const skill_candidates: SkillPrior[] = (priors ?? [])
    .map((p: any) => ({ slug: p.skills?.slug as string, relevance_score: Number(p.relevance_score) }))
    .filter((p: SkillPrior) => !!p.slug)

  // Sparse-priors edge case: a confident task match but no priors seeded yet.
  // Degrade to the existing workflow path — NOT an error or a null recommendation.
  if (skill_candidates.length === 0) return FALLBACK

  return {
    status: 'confident',
    top,
    candidates: top3,
    recommended_skill: skill_candidates[0].slug,
    skill_candidates,
    confidence: top.score,
  }
}
