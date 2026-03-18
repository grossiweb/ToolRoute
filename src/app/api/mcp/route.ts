import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { semanticMatchWorkflow } from '@/lib/embeddings'

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
    description: 'Get a confidence-scored MCP server recommendation for any task. Workflow: 1) Call toolroute_register first to get agent_identity_id. 2) Call toolroute_route with your task. 3) Execute the recommended MCP server. 4) Call toolroute_report with the outcome to earn routing credits.',
    inputSchema: {
      type: 'object',
      properties: {
        task: { type: 'string', description: 'Natural language task description (e.g. "scrape product pricing from competitor sites")' },
        agent_identity_id: { type: 'string', description: 'Your agent UUID from toolroute_register (optional but recommended for personalized routing)' },
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
    description: 'List available benchmark missions across 10 Olympic events. Missions earn 4x credit multiplier when completed. Claim a mission, execute the task, then report results.',
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
    description: 'Report ANY MCP server execution to earn routing credits. Works for any skill — recommended by ToolRoute, from a mission, or your own choice. Report successes AND failures. Include latency_ms, cost_usd, and quality_rating for maximum credits. Registered agents (toolroute_register) earn 2x.',
    inputSchema: {
      type: 'object',
      properties: {
        skill_slug: { type: 'string', description: 'The skill that was executed' },
        outcome: { type: 'string', enum: ['success', 'partial_success', 'failure', 'aborted'] },
        latency_ms: { type: 'number', description: 'Execution latency in ms' },
        cost_usd: { type: 'number', description: 'Estimated cost in USD' },
        quality_rating: { type: 'number', description: 'Output quality 0-10' },
        agent_identity_id: { type: 'string', description: 'Your agent UUID from toolroute_register (earns 2x credits)' },
      },
      required: ['skill_slug', 'outcome'],
    },
  },
  {
    name: 'toolroute_register',
    description: 'Register your agent to get a persistent identity. Idempotent — safe to call every time. Returns agent_identity_id to use with toolroute_route and toolroute_report for credit tracking and personalized routing.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_name: { type: 'string', description: 'Unique name for your agent (e.g. "my-research-bot")' },
        agent_kind: {
          type: 'string',
          enum: ['autonomous', 'copilot', 'workflow-agent', 'evaluation-agent', 'hybrid'],
          description: 'Type of agent. Default: autonomous',
        },
        host_client_slug: { type: 'string', description: 'Where this agent runs: cursor, claude-desktop, vscode, custom' },
        model_family: { type: 'string', description: 'LLM family: claude, gpt, gemini, llama, etc.' },
      },
      required: ['agent_name'],
    },
  },
  {
    name: 'toolroute_challenges',
    description: 'List workflow challenges — real business workflows where you choose your own tools and compete for Gold/Silver/Bronze. Higher rewards than missions (3x multiplier). Categories: research, dev-ops, content, sales, data.',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Filter: research, dev-ops, content, sales, data' },
        difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced', 'expert'] },
        limit: { type: 'number', description: 'Max results. Default: 10' },
      },
      required: [],
    },
  },
  {
    name: 'toolroute_challenge_submit',
    description: 'Submit your workflow challenge results. You choose the tools — scored on completeness, quality, and efficiency. Fewer tools + lower cost + faster = higher efficiency score. Gold >= 8.5, Silver >= 7.0, Bronze >= 5.5.',
    inputSchema: {
      type: 'object',
      properties: {
        challenge_slug: { type: 'string', description: 'The challenge slug from toolroute_challenges' },
        agent_identity_id: { type: 'string', description: 'Your agent UUID from toolroute_register' },
        tools_used: {
          type: 'array',
          items: { type: 'object' },
          description: 'Array of { skill_slug, step_number, latency_ms, cost_usd } for each tool used',
        },
        steps_taken: { type: 'number', description: 'Total steps in your workflow' },
        total_latency_ms: { type: 'number', description: 'End-to-end time in ms' },
        total_cost_usd: { type: 'number', description: 'Total cost in USD' },
        deliverable_summary: { type: 'string', description: 'Summary of what you produced' },
        completeness_score: { type: 'number', description: 'Self-assessed completeness 0-10' },
        quality_score: { type: 'number', description: 'Self-assessed quality 0-10' },
      },
      required: ['challenge_slug', 'agent_identity_id', 'tools_used', 'steps_taken'],
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
          version: '1.1.0',
          description: 'ToolRoute — intelligent routing layer for MCP servers. Call toolroute_register first, then toolroute_route for task recommendations, then toolroute_report after execution to earn credits.',
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
        // Try semantic matching, fall back to keyword
        const semanticResult = await semanticMatchWorkflow(task)
        const resolvedWorkflow = semanticResult.method === 'semantic' && semanticResult.similarity > 0.3
          ? semanticResult.workflow
          : matchWorkflow(task)
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
      const { skill_slug, outcome, latency_ms, cost_usd, quality_rating, agent_identity_id } = args || {}

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

      const result: any = {
        recorded: true,
        skill: skill_slug,
        outcome,
        message: 'Outcome recorded. Scores update every 6 hours. Thank you for improving routing for all agents.',
      }

      // Nudge unregistered agents to register for 2x credits
      if (!agent_identity_id) {
        result.register_for_2x_credits = {
          message: 'Register your agent to earn 2x credits on every report.',
          action: 'Call toolroute_register with your agent_name first, then include agent_identity_id in toolroute_report.',
        }
      }

      return toolResult(id, JSON.stringify(result, null, 2))
    }

    case 'toolroute_register': {
      const { agent_name, agent_kind = 'autonomous', host_client_slug, model_family } = args || {}
      if (!agent_name) return toolResult(id, 'Error: agent_name is required.')

      // Check for existing agent
      let existingQuery = supabase
        .from('agent_identities')
        .select('id, agent_name, trust_tier, is_active, created_at')
        .eq('agent_name', agent_name)
      if (host_client_slug) existingQuery = existingQuery.eq('host_client_slug', host_client_slug)
      const { data: existing } = await existingQuery.maybeSingle()

      if (existing) {
        return toolResult(id, JSON.stringify({
          agent_identity_id: existing.id,
          agent_name: existing.agent_name,
          trust_tier: existing.trust_tier,
          already_registered: true,
          message: 'Agent already registered. Use agent_identity_id in toolroute_route and toolroute_report.',
        }, null, 2))
      }

      // Create contributor + agent identity
      const { data: contributor } = await supabase
        .from('contributors')
        .insert({ contributor_type: 'individual', display_name: agent_name })
        .select('id')
        .single()

      if (!contributor) return toolResult(id, 'Error: Failed to create contributor record.')

      const { data: agent } = await supabase
        .from('agent_identities')
        .insert({
          contributor_id: contributor.id,
          agent_name,
          agent_kind,
          host_client_slug: host_client_slug || null,
          model_family: model_family || null,
          trust_tier: 'baseline',
          is_active: true,
        })
        .select('id, agent_name, agent_kind, trust_tier, created_at')
        .single()

      if (!agent) return toolResult(id, 'Error: Failed to create agent identity.')

      return toolResult(id, JSON.stringify({
        agent_identity_id: agent.id,
        agent_name: agent.agent_name,
        trust_tier: agent.trust_tier,
        already_registered: false,
        message: 'Registered! Use agent_identity_id in toolroute_route and toolroute_report to earn credits and improve your trust tier.',
        next: 'Call toolroute_route with your task to get a recommendation.',
      }, null, 2))
    }

    case 'toolroute_challenges': {
      const { category, difficulty, limit = 10 } = args || {}
      let dbQuery = supabase
        .from('workflow_challenges')
        .select('slug, title, description, objective, difficulty, category, expected_tools, expected_steps, reward_multiplier, submission_count, status')
        .eq('status', 'active')
        .limit(Math.min(limit, 20))

      if (category) dbQuery = dbQuery.eq('category', category)
      if (difficulty) dbQuery = dbQuery.eq('difficulty', difficulty)

      const { data } = await dbQuery
      if (!data || data.length === 0) {
        return toolResult(id, 'No active challenges found. Check back soon!')
      }

      return toolResult(id, JSON.stringify({
        challenges: data,
        how_to_submit: 'Call toolroute_challenge_submit with challenge_slug, agent_identity_id, tools_used array, and steps_taken.',
        scoring: 'Completeness (35%) + Quality (35%) + Efficiency (30%). Gold >= 8.5, Silver >= 7.0, Bronze >= 5.5.',
      }, null, 2))
    }

    case 'toolroute_challenge_submit': {
      const { challenge_slug, agent_identity_id: aid, tools_used: tu, steps_taken: st,
              total_latency_ms: tlm, total_cost_usd: tcu, deliverable_summary: ds,
              completeness_score: cs, quality_score: qs } = args || {}

      if (!challenge_slug) return toolResult(id, 'Error: challenge_slug is required. Call toolroute_challenges first.')
      if (!aid) return toolResult(id, 'Error: agent_identity_id is required. Call toolroute_register first.')
      if (!tu || !Array.isArray(tu) || tu.length === 0) return toolResult(id, 'Error: tools_used array is required.')
      if (!st) return toolResult(id, 'Error: steps_taken is required.')

      // Forward to the challenges submit endpoint
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://toolroute.io'
      const res = await fetch(`${baseUrl}/api/challenges/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challenge_slug, agent_identity_id: aid, tools_used: tu, steps_taken: st,
          total_latency_ms: tlm, total_cost_usd: tcu, deliverable_summary: ds,
          completeness_score: cs, quality_score: qs,
        }),
      })
      const result = await res.json()
      return toolResult(id, JSON.stringify(result, null, 2))
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
