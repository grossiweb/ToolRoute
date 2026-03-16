import { NextResponse } from 'next/server'

export const revalidate = 3600

export async function GET() {
  return NextResponse.json({
    // Standard service metadata
    name: 'NeoSkill',
    description: 'Agent-first MCP skill intelligence platform — routing, benchmarking, and outcome telemetry.',
    version: '1.1.0',

    // MCP Server info
    mcp: {
      protocol_version: '2024-11-05',
      transport: 'streamable-http',
      endpoint: 'https://neo-skill.vercel.app/api/mcp',
      capabilities: {
        tools: true,
        resources: false,
        prompts: false,
      },
      tools: [
        'neoskill_route',
        'neoskill_search',
        'neoskill_compare',
        'neoskill_missions',
        'neoskill_report',
      ],
    },

    // REST API endpoints
    api_base: 'https://neo-skill.vercel.app/api',
    endpoints: {
      route: 'POST /api/route',
      skills: 'GET /api/skills',
      contributions: 'POST /api/contributions',
      missions_available: 'GET /api/missions/available',
      missions_claim: 'POST /api/missions/claim',
      missions_complete: 'POST /api/missions/complete',
      mcp_server: 'POST /api/mcp',
    },

    // SDK
    sdk: {
      npm: '@neoskills/sdk',
      github: 'https://github.com/grossiweb/NeoSkill/tree/main/sdk',
    },

    updated_at: new Date().toISOString(),
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    }
  })
}
