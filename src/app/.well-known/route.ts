import { NextResponse } from 'next/server'

export const revalidate = 3600

export async function GET() {
  return NextResponse.json({
    // Standard service metadata
    name: 'ToolRoute',
    description: 'Intelligent routing for AI tools. Agents query ToolRoute to find which MCP server works best for any task.',
    version: '1.2.0',

    // MCP Server info — agents can add this as a tool source
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
        'toolroute_register',
        'toolroute_challenges',
        'toolroute_challenge_submit',
      ],
      config_snippet: {
        mcpServers: {
          toolroute: {
            url: 'https://toolroute.io/api/mcp',
          },
        },
      },
    },

    // REST API endpoints
    api_base: 'https://toolroute.io/api',
    endpoints: {
      register: 'POST /api/agents/register — Register or look up agent identity',
      route: 'POST /api/route — Get a confidence-scored MCP server recommendation',
      search: 'GET /api/skills — Search and filter the MCP server catalog',
      report: 'POST /api/report — Submit outcome telemetry (earn routing credits)',
      contributions: 'POST /api/contributions — Detailed telemetry submission',
      badge: 'GET /api/badge/{slug} — SVG score badge for READMEs',
      missions_available: 'GET /api/missions/available',
      missions_claim: 'POST /api/missions/claim',
      missions_complete: 'POST /api/missions/complete',
      challenges: 'GET /api/challenges — Workflow Challenges (3x credits)',
      challenges_submit: 'POST /api/challenges/submit — Submit challenge results',
      mcp_server: 'POST /api/mcp — JSON-RPC MCP server (8 tools)',
    },

    // Quickstart for agents
    quickstart: {
      step_1: 'Add ToolRoute to your MCP config: { "mcpServers": { "toolroute": { "url": "https://toolroute.io/api/mcp" } } }',
      step_2: 'Use toolroute_route to get recommendations for any task',
      step_3: 'Use toolroute_report to submit outcomes and earn routing credits',
    },

    // SDK
    sdk: {
      npm: '@neoskill/sdk',
      github: 'https://github.com/grossiweb/ToolRoute/tree/main/sdk',
    },

    // For server maintainers
    badge_url: 'https://toolroute.io/api/badge/{slug}',
    submit_url: 'https://toolroute.io/submit',

    updated_at: new Date().toISOString(),
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    }
  })
}
