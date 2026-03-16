import { NextResponse } from 'next/server'

export const revalidate = 3600

export async function GET() {
  return NextResponse.json({
    name: 'NeoSkill',
    description: 'Agent-first MCP skill intelligence platform',
    version: '1.0',
    api_base: 'https://neoskill.ai/api',
    endpoints: {
      recommend: 'POST /api/route/recommend',
      compare: 'POST /api/compare',
      skills: 'GET /api/skills',
      contributions: 'POST /api/contributions',
    },
    updated_at: new Date().toISOString(),
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    }
  })
}
