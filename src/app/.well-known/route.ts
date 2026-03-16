import { NextResponse } from 'next/server'

export const revalidate = 3600

export async function GET() {
  return NextResponse.json({
    // Standard service metadata
    name: 'ToolRoute',
    description: 'Agent-first MCP skill intelligence platform — routing, benchmarking, and outcome telemetry.',
    version: '1.1.0',

    // MCP Server info
    mcp: {
      protocol_version: '2024-11-05',
      transport: 'streamable-http',
      endpoint: 'https://toolroute.io/api/mcp',
      capabilities: {
        tools: true,
        resources: false,
        prompts: false,
      },
      tools: [
        'toolroute_route',
        'toolroute_search',
        'toolroute_compare',
        'toolroute_missions',
        'toolroute_report',
      ],
    },

    // REST API endpoints
    api_base: 'https://toolroute.io/api',
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
      npm: '@toolroute/sdk',
      github: 'https://github.com/grossiweb/ToolRoute/tree/main/sdk',
    },

    updated_at: new Date().toISOString(),
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    }
  })
}
