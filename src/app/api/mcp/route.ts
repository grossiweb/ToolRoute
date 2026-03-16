import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

/**
 * ToolRoute MCP Server — JSON-RPC over HTTP
 *
 * This endpoint makes ToolRoute itself queryable as an MCP server.
 * Agents can call ToolRoute tools using the standard MCP protocol.
 *
 * Tools exposed:
 *   - toolroute_route: Get a skill recommendation for a task
 *   - toolroute_search: Search the skill catalog
 *   - toolroute_compare: Compare skills side by side
 *   - toolroute_missions: List available benchmark missions
 *   - toolroute_report: Submit execution telemetry
 */

const TOOLS = [
  {
    name: 'toolroute_route',
    description: 'Get a confidence-scored skill recommendation for any agent task. Accepts natural language task descriptions.',
    inputSchema: {
      type: 'object',
      properties: {
        task: { type: 'string', description: 'Natural language task description' },
        workflow_slug: { type: 'string', description: 'Explicit workflow slug (optional if task provided)' },
        priority: {
          type: 'string',
          enum: ['best_value', 'best_quality', 'best_efficiency', 'lowest_cost', 'highest_trust', 'most_reliable'],
          description: 'Routing priority mode. Default: best_value',
        },
        trust_floor: { type: 'number', description: 'Minimum trust score (0-10). Default: 0' },
      },
      required: [],
    },
  },
  {
    name: 'toolroute_search',
    description: 'Search the ToolRoute skill catalog by name, workflow, or vertical.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query for skill name' },
        workflow: { type: 'string', description: 'Filter by workflow slug' },
        vertical: { type: 'string', description: 'Filter by vertical slug' },
        limit: { type: 'number', description: 'Max results. Default: 10' },
      },
      required: [],
    },
  },
  {
    name: 'toolroute_compare',
    description: 'Compare two or more skills side by side on all scoring dimensions.',
    inputSchema: {
      type: 'object',
      properties: {
        skill_slugs: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of skill slugs to compare (2-4)',
        },
      },
      required: ['skill_slugs'],
    },
  },
  {
    name: 'toolroute_missions',
    description: 'List available benchmark missions that earn routing credits.',
    inputSchema: {
      type: 'object',
      properties: {
        event: { type: 'string', description: 'Filter by olympic event slug' },
      },
      required: [],
    },
  },
  {
    name: 'toolroute_report',
    description: 'Report skill execution outcome. Earns routing credits and improves recommendations.',
    inputSchema: {
      type: 'object',
      properties: {
        skill_slug: { type: 'string', description: 'The skill that was executed' },
        outcome: { type: 'string', enum: ['success', 'partial_success', 'failure', 'aborted'] },
        latency_ms: { type: 'number', description: 'Execution latency in ms' },
        cost_usd: { type: 'number', description: 'Estimated cost in USD' },
        quality_rating: { type: 'number', description: 'Output quality 0-10' },
      },
      required: ['skill_slug', 'outcome'],
    },
  },
]

export async function POST(request: NextRequest) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return jsonRpcError(null, -32700, 'Parse error')
  }

  const { jsonrpc, id, method, params } = body

  if (jsonrpc !== '2.0') {
    return jsonRpcError(id, -32600, 'Invalid Request: jsonrpc must be "2.0"')
  }

  switch (method) {
    case 'initialize':
      return jsonRpcResult(id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: {
          name: 'toolroute',
          version: '1.0.0',
        },
      })

    case 'tools/list':
      return jsonRpcResult(id, { tools: TOOLS })

    case 'tools/call':
      return handleToolCall(id, params)

    case 'ping':
      return jsonRpcResult(id, {})

    default:
      return jsonRpcError(id, -32601, `Method not found: ${method}`)
  }
}

async function handleToolCall(id: any, params: any) {
  const { name, arguments: args } = params || {}

  if (!name) {
    return jsonRpcError(id, -32602, 'Missing tool name')
  }

  const supabase = createServerSupabaseClient()

  switch (name) {
    case 'toolroute_route': {
      const { task, workflow_slug, priority = 'best_value', trust_floor = 0 } = args || {}
      // Delegate to the route API logic inline
      let query = supabase
        .from('skills')
        .select(`
          id, slug, canonical_name, short_description,
          skill_scores ( overall_score, trust_score, reliability_score, output_score, efficiency_score, cost_score, value_score )
        `)
        .eq('status', 'active')
        .not('skill_scores', 'is', null)
        .limit(20)

      const { data: skills } = await query

      if (!skills || skills.length === 0) {
        return toolResult(id, 'No scored skills found yet. Data accumulating.')
      }

      const filtered = skills.filter((s: any) => (s.skill_scores?.trust_score ?? 0) >= trust_floor)
      const sorted = [...filtered].sort((a: any, b: any) => {
        const key = priority === 'best_quality' ? 'output_score' : 'value_score'
        return ((b.skill_scores as any)?.[key] || 0) - ((a.skill_scores as any)?.[key] || 0)
      })

      const top = sorted[0] as any
      if (!top) return toolResult(id, 'No skills match your constraints.')

      return toolResult(id, JSON.stringify({
        recommended_skill: top.slug,
        name: top.canonical_name,
        confidence: 0.85,
        value_score: top.skill_scores?.value_score,
        alternatives: sorted.slice(1, 4).map((s: any) => s.slug),
      }, null, 2))
    }

    case 'toolroute_search': {
      const { query: q, workflow, vertical, limit = 10 } = args || {}
      let dbQuery = supabase
        .from('skills')
        .select('slug, canonical_name, short_description, vendor_type, skill_scores ( overall_score, value_score )')
        .eq('status', 'active')
        .limit(Math.min(limit, 20))

      if (q) dbQuery = dbQuery.ilike('canonical_name', `%${q}%`)

      const { data } = await dbQuery
      return toolResult(id, JSON.stringify(data || [], null, 2))
    }

    case 'toolroute_compare': {
      const { skill_slugs } = args || {}
      if (!skill_slugs || skill_slugs.length < 2) {
        return toolResult(id, 'Error: Provide at least 2 skill slugs to compare.')
      }

      const { data } = await supabase
        .from('skills')
        .select('slug, canonical_name, skill_scores ( overall_score, value_score, trust_score, reliability_score, output_score, efficiency_score, cost_score )')
        .in('slug', skill_slugs)

      return toolResult(id, JSON.stringify(data || [], null, 2))
    }

    case 'toolroute_missions': {
      const { event } = args || {}
      let dbQuery = supabase
        .from('benchmark_missions')
        .select('id, title, description, task_prompt, reward_multiplier, max_claims, claimed_count, status')
        .eq('status', 'available')
        .limit(10)

      const { data } = await dbQuery
      return toolResult(id, JSON.stringify(data || [], null, 2))
    }

    case 'toolroute_report': {
      const { skill_slug, outcome, latency_ms, cost_usd, quality_rating } = args || {}

      // Find the skill
      const { data: skill } = await supabase
        .from('skills')
        .select('id')
        .eq('slug', skill_slug)
        .single()

      if (!skill) return toolResult(id, `Error: Skill "${skill_slug}" not found.`)

      // Insert telemetry event
      await supabase.from('telemetry_events').insert({
        skill_id: skill.id,
        success: outcome === 'success',
        response_ms: latency_ms || null,
        anonymous_agent_id: 'mcp-server-client',
      })

      return toolResult(id, JSON.stringify({
        recorded: true,
        skill: skill_slug,
        outcome,
        message: 'Telemetry recorded. Thank you for contributing to the intelligence graph.',
      }, null, 2))
    }

    default:
      return jsonRpcError(id, -32602, `Unknown tool: ${name}`)
  }
}

function jsonRpcResult(id: any, result: any) {
  return NextResponse.json({ jsonrpc: '2.0', id, result })
}

function jsonRpcError(id: any, code: number, message: string) {
  return NextResponse.json({ jsonrpc: '2.0', id, error: { code, message } })
}

function toolResult(id: any, text: string) {
  return jsonRpcResult(id, {
    content: [{ type: 'text', text }],
  })
}
