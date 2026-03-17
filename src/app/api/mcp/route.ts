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
      let routeQuery = supabase
        .from('skills')
        .select(`
          id, slug, canonical_name, short_description,
          skill_scores ( overall_score, trust_score, reliability_score, output_score, efficiency_score, cost_score, value_score )
        `)
        .eq('status', 'active')
        .not('skill_scores', 'is', null)
        .limit(50)

      const { data: skills } = await routeQuery

      if (!skills || skills.length === 0) {
        return toolResult(id, 'No scored skills found yet. Data accumulating.')
      }

      let candidates = skills.filter((s: any) => (s.skill_scores?.trust_score ?? 0) >= trust_floor)

      // Filter by workflow junction tables if task provided
      if (task) {
        const resolvedWorkflow = matchWorkflow(task)
        if (resolvedWorkflow) {
          const { data: wfSkills } = await supabase
            .from('skill_workflows')
            .select('skill_id, workflows!inner(slug)')
            .eq('workflows.slug', resolvedWorkflow)
          if (wfSkills && wfSkills.length > 0) {
            const matchedIds = new Set(wfSkills.map((ws: any) => ws.skill_id))
            const wfFiltered = candidates.filter((s: any) => matchedIds.has(s.id))
            if (wfFiltered.length > 0) candidates = wfFiltered
          }
        }
      }

      const sorted = [...candidates].sort((a: any, b: any) => {
        const key = priority === 'best_quality' ? 'output_score' : 'value_score'
        return ((b.skill_scores as any)?.[key] || 0) - ((a.skill_scores as any)?.[key] || 0)
      })

      const top = sorted[0] as any
      if (!top) return toolResult(id, 'No skills match your constraints.')

      const { count: outcomeCount } = await supabase
        .from('outcome_records')
        .select('id', { count: 'exact', head: true })
        .eq('skill_id', top.id)

      return toolResult(id, JSON.stringify({
        recommended_skill: top.slug,
        name: top.canonical_name,
        confidence: Math.min(0.95, 0.75 + Math.min(0.15, Math.log10((outcomeCount || 0) + 1) * 0.05)),
        value_score: top.skill_scores?.value_score,
        outcome_count: outcomeCount || 0,
        alternatives: sorted.slice(1, 4).map((s: any) => s.slug),
        fallback: sorted.length > 1 ? sorted[1].slug : null,
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

      const { data: skill } = await supabase
        .from('skills')
        .select('id')
        .eq('slug', skill_slug)
        .single()

      if (!skill) return toolResult(id, `Error: Server "${skill_slug}" not found.`)

      // Insert into outcome_records (feeds score recalculation pipeline)
      await supabase.from('outcome_records').insert({
        skill_id: skill.id,
        outcome_status: outcome,
        latency_ms: latency_ms ?? null,
        estimated_cost_usd: cost_usd ?? null,
        output_quality_rating: quality_rating ?? null,
        proof_type: 'self_reported',
      })

      return toolResult(id, JSON.stringify({
        recorded: true,
        skill: skill_slug,
        outcome,
        message: 'Outcome recorded. Scores update every 6 hours. Thank you for improving routing for all agents.',
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

// Lightweight keyword → workflow matcher for MCP routing
const TASK_KEYWORDS: Record<string, string[]> = {
  'research-competitive-intelligence': ['research', 'scrape', 'crawl', 'extract', 'competitor', 'pricing', 'web search'],
  'developer-workflow-code-management': ['code', 'repository', 'pull request', 'github', 'refactor', 'debug'],
  'qa-testing-automation': ['browser', 'navigate', 'click', 'test', 'automate', 'playwright', 'e2e'],
  'data-analysis-reporting': ['database', 'sql', 'query', 'analytics', 'report', 'data analysis'],
  'sales-research-outreach': ['prospect', 'lead', 'crm', 'salesforce', 'outreach', 'sales'],
  'content-creation-publishing': ['content', 'blog', 'article', 'publish', 'seo', 'write'],
  'customer-support-automation': ['support', 'ticket', 'triage', 'jira', 'helpdesk'],
  'knowledge-management': ['notion', 'confluence', 'wiki', 'knowledge base', 'documentation'],
  'design-to-code-workflow': ['figma', 'design', 'ui', 'component', 'layout'],
  'it-devops-platform-operations': ['aws', 'cloud', 'infrastructure', 'devops', 'kubernetes', 'docker'],
}

function matchWorkflow(task: string): string | null {
  const lower = task.toLowerCase()
  let best: string | null = null
  let bestScore = 0
  for (const [wf, kws] of Object.entries(TASK_KEYWORDS)) {
    let score = 0
    for (const kw of kws) {
      if (lower.includes(kw)) score += kw.length
    }
    if (score > bestScore) { bestScore = score; best = wf }
  }
  return best
}
