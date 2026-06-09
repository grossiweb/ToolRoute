import { NextResponse } from 'next/server'

// TEMPORARY diagnostic — confirms OpenRouter's embeddings endpoint works with the
// server's OPENROUTER_API_KEY and reports the vector dimension (needed for the
// pgvector column size). No secrets returned. Remove after capture.
export async function GET() {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) return NextResponse.json({ key_present: false })
  try {
    const res = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://toolroute.io',
        'X-Title': 'ToolRoute Embed Diag',
      },
      body: JSON.stringify({ model: 'google/gemini-embedding-001', input: 'diagnostic ping' }),
    })
    const text = await res.text()
    let dims: number | null = null
    let sample: number[] | null = null
    try {
      const j = JSON.parse(text)
      const v = j?.data?.[0]?.embedding
      if (Array.isArray(v)) { dims = v.length; sample = v.slice(0, 3) }
    } catch { /* non-JSON error body */ }
    return NextResponse.json({
      key_present: true,
      model: 'google/gemini-embedding-001',
      status: res.status,
      ok: res.ok,
      dims,
      sample,
      body: dims ? null : text.slice(0, 500),
    })
  } catch (e: any) {
    return NextResponse.json({ key_present: true, error: String(e?.message ?? e) })
  }
}
