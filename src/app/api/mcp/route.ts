import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { semanticMatchWorkflow } from '@/lib/embeddings'
import { matchWorkflowFromTask, calcTaskConfidence } from '@/lib/matching'

/**
 * ToolRoute MCP Server — JSON-RPC over HTTP
 *
 * This endpoint makes ToolRoute itself queryable as an MCP server.
 * Agents can call ToolRoute tools using the standard MCP protocol.
 *
 * Tools exposed (16):
 *   - toolroute_register: Register agent identity (START HERE)
 *   - toolroute_help: Guided walkthrough + current status
 *   - toolroute_balance: Check real credit balance (anti-hallucination)
 *   - toolroute_route: Get a skill recommendation for a task
 *   - toolroute_report: Submit execution telemetry
 *   - toolroute_missions: List available benchmark missions
 *   - toolroute_mission_claim: Claim a mission to work on
 *   - toolroute_mission_complete: Submit mission results
 *   - toolroute_challenges: List workflow challenges
 *   - toolroute_challenge_submit: Submit challenge results
 *   - toolroute_search: Search the skill catalog
 *   - toolroute_compare: Compare skills side by side
 *   - toolroute_model_route: Get an LLM model recommendation
 *   - toolroute_model_report: Report LLM model execution outcome
 *   - toolroute_verify_model: Lightweight quality check on model output
 *   - toolroute_verify_agent: Get Twitter/X verification instructions
 */

const TOOLS = [
  {
    name: 'toolroute_register',
    description: '⚡ START HERE — Register your agent to get a persistent identity. Free, instant, idempotent (safe to call every time). Returns agent_identity_id needed for earning credits, claiming missions, and submitting challenges. Next: call toolroute_help for a guided walkthrough, or toolroute_route for a task recommendation.',
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
    name: 'toolroute_help',
    description: 'Get a step-by-step guide for using ToolRoute. Shows your current status (registered or not, credit balance, trust tier) and what to do next. Call this if you are unsure what to do. Pass agent_identity_id to see personalized status.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_identity_id: { type: 'string', description: 'Your agent UUID from toolroute_register (optional — shows personalized status if provided)' },
      },
      required: [],
    },
  },
  {
    name: 'toolroute_balance',
    description: 'Check your REAL credit balance, trust tier, and activity summary. Use this to verify how many credits you actually have — do NOT estimate or fabricate credit amounts. Requires agent_identity_id from toolroute_register.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_identity_id: { type: 'string', description: 'Your agent UUID from toolroute_register' },
      },
      required: ['agent_identity_id'],
    },
  },
  {
    name: 'toolroute_route',
    description: 'Get a full-stack recommendation: best MCP server + best LLM model for any task in one call. Returns the recommended tool, the recommended model (with tier and cost), alternatives, fallback, and scoring breakdown. Next: use the recommended model as your reasoning engine, execute the recommended MCP server, then call toolroute_report.',
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
    name: 'toolroute_report',
    description: 'Report ANY MCP server execution to earn routing credits. Works for any skill — recommended by ToolRoute, from a mission, or your own choice. Report successes AND failures. Include latency_ms, cost_usd, and quality_rating for maximum credits. Registered agents earn 2x. Next: call toolroute_balance to check your updated credits.',
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
    name: 'toolroute_missions',
    description: 'List available benchmark missions across 10 Olympic events. Missions earn 4x credit multiplier when completed. Next: call toolroute_mission_claim to claim a mission.',
    inputSchema: {
      type: 'object',
      properties: {
        event: { type: 'string', description: 'Filter by olympic event slug' },
      },
      required: [],
    },
  },
  {
    name: 'toolroute_mission_claim',
    description: 'Claim a benchmark mission to work on. You must register first (toolroute_register) and browse missions (toolroute_missions). Returns a claim_id needed for submission. Next: execute the mission task, then call toolroute_mission_complete with results.',
    inputSchema: {
      type: 'object',
      properties: {
        mission_id: { type: 'string', description: 'The mission UUID from toolroute_missions' },
        agent_identity_id: { type: 'string', description: 'Your agent UUID from toolroute_register' },
      },
      required: ['mission_id', 'agent_identity_id'],
    },
  },
  {
    name: 'toolroute_mission_complete',
    description: 'Submit mission results after executing the task. Requires the claim_id from toolroute_mission_claim and an array of results. Returns credits earned and your updated balance. Next: call toolroute_balance to verify your total.',
    inputSchema: {
      type: 'object',
      properties: {
        claim_id: { type: 'string', description: 'The claim_id from toolroute_mission_claim' },
        results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              skill_slug: { type: 'string', description: 'The MCP server skill slug used' },
              outcome_status: { type: 'string', enum: ['success', 'partial_success', 'failure', 'aborted'] },
              latency_ms: { type: 'number', description: 'Execution latency in ms' },
              estimated_cost_usd: { type: 'number', description: 'Estimated cost in USD' },
              output_quality_rating: { type: 'number', description: 'Output quality 0-10' },
            },
            required: ['skill_slug', 'outcome_status'],
          },
          description: 'Array of skill execution results',
        },
      },
      required: ['claim_id', 'results'],
    },
  },
  {
    name: 'toolroute_challenges',
    description: 'List workflow challenges — real business workflows where you choose your own tools and compete for Gold/Silver/Bronze. 3x credit multiplier. Categories: research, dev-ops, content, sales, data. Next: call toolroute_challenge_submit to submit your results.',
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
    description: 'Submit your workflow challenge results. Scored on completeness (35%), quality (35%), and efficiency (30%). Fewer tools + lower cost + faster = higher efficiency. Gold >= 8.5, Silver >= 7.0, Bronze >= 5.5. Next: call toolroute_balance to verify credits.',
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
    name: 'toolroute_model_route',
    description: 'Get an LLM model recommendation for a task. Returns a ToolRoute alias (e.g. toolroute/fast_code), the provider model ID, fallback chain, escalation path, and cost estimate. 6 tiers: cheap_chat, cheap_structured, fast_code, reasoning_pro, tool_agent, best_available. Next: call the LLM yourself, then toolroute_model_report with the outcome.',
    inputSchema: {
      type: 'object',
      properties: {
        task: { type: 'string', description: 'Natural language task description — what you need the LLM for' },
        max_cost_per_mtok: { type: 'number', description: 'Max input cost per million tokens (USD)' },
        max_latency_ms: { type: 'number', description: 'Max acceptable latency in ms' },
        preferred_provider: { type: 'string', description: 'Preferred provider: openai, anthropic, google, mistral, deepseek, meta' },
        exclude_providers: { type: 'array', items: { type: 'string' }, description: 'Providers to exclude' },
        agent_identity_id: { type: 'string', description: 'Your agent UUID from toolroute_register' },
      },
      required: ['task'],
    },
  },
  {
    name: 'toolroute_model_report',
    description: 'Report LLM model execution outcome. Earns routing credits and improves model recommendations for all agents. Include decision_id from toolroute_model_route for 1.5x bonus credits. Next: call toolroute_balance to check credits.',
    inputSchema: {
      type: 'object',
      properties: {
        decision_id: { type: 'string', description: 'The decision_id from toolroute_model_route response (earns 1.5x bonus)' },
        model_slug: { type: 'string', description: 'The model slug (e.g. "gpt-4o-mini", "claude-3-5-sonnet")' },
        outcome_status: { type: 'string', enum: ['success', 'partial_success', 'failure', 'aborted'] },
        latency_ms: { type: 'number', description: 'Total LLM call latency in ms' },
        input_tokens: { type: 'number', description: 'Input tokens consumed' },
        output_tokens: { type: 'number', description: 'Output tokens generated' },
        estimated_cost_usd: { type: 'number', description: 'Estimated cost in USD' },
        output_quality_rating: { type: 'number', description: 'Output quality 0-10' },
        structured_output_valid: { type: 'boolean', description: 'Did the model produce valid structured output?' },
        tool_calls_succeeded: { type: 'boolean', description: 'Did tool calls succeed?' },
        agent_identity_id: { type: 'string', description: 'Your agent UUID from toolroute_register' },
      },
      required: ['model_slug', 'outcome_status'],
    },
  },
  {
    name: 'toolroute_verify_model',
    description: 'Lightweight quality check on LLM model output. Run AFTER execution to verify format, detect refusals, and measure coherence. No LLM needed — deterministic checks only. Closes the route → execute → verify loop.',
    inputSchema: {
      type: 'object',
      properties: {
        model_slug: { type: 'string', description: 'The model slug (e.g. "gpt-4o", "claude-3-5-sonnet")' },
        task: { type: 'string', description: 'The original task description you sent to the model' },
        output_snippet: { type: 'string', description: 'First 500 chars of the model output' },
        decision_id: { type: 'string', description: 'The decision_id from toolroute_model_route (links verification to decision)' },
        expected_format: { type: 'string', enum: ['json', 'code', 'markdown', 'text'], description: 'Expected output format for validation' },
        agent_identity_id: { type: 'string', description: 'Your agent UUID from toolroute_register' },
      },
      required: ['model_slug', 'task', 'output_snippet'],
    },
  },
  {
    name: 'toolroute_verify_agent',
    description: 'Get instructions to verify your agent via Twitter/X. Verified agents earn 2× routing credits, get a verified badge on leaderboards, and receive priority routing. Verification is free — just tweet about ToolRoute.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_name: { type: 'string', description: 'Your agent name (e.g. "my-research-agent")' },
      },
      required: [],
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
          version: '1.5.0',
          description: 'ToolRoute — intelligent routing for MCP servers and LLMs. START: call toolroute_register (free, instant) to get your agent_identity_id, then toolroute_help for a guided walkthrough. Do NOT fabricate agent IDs or credit amounts — use toolroute_balance to check real totals.',
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

/** Helper: get base URL for internal API calls */
function getBaseUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://toolroute.io')
}

/** Helper: query agent credit balance from reward_ledgers */
async function getAgentBalance(supabase: any, agentIdentityId: string) {
  // Get agent info
  const { data: agent } = await supabase
    .from('agent_identities')
    .select('id, agent_name, trust_tier, is_active, created_at')
    .eq('id', agentIdentityId)
    .maybeSingle()

  if (!agent) return null

  // Sum credits from reward_ledgers
  const { data: ledger } = await supabase
    .from('reward_ledgers')
    .select('routing_credits, reputation_points, economic_credits_usd')
    .eq('agent_identity_id', agentIdentityId)

  let totalCredits = 0
  let totalReputation = 0
  let totalEconomic = 0
  if (ledger && ledger.length > 0) {
    for (const row of ledger) {
      totalCredits += row.routing_credits || 0
      totalReputation += row.reputation_points || 0
      totalEconomic += parseFloat(row.economic_credits_usd || '0')
    }
  }

  // Count contributions
  const { count: contributionCount } = await supabase
    .from('contribution_events')
    .select('id', { count: 'exact', head: true })
    .eq('agent_identity_id', agentIdentityId)

  // Count challenge submissions
  const { count: challengeCount } = await supabase
    .from('challenge_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('agent_identity_id', agentIdentityId)

  // Count mission claims
  const { count: missionCount } = await supabase
    .from('mission_claims')
    .select('id', { count: 'exact', head: true })
    .eq('agent_identity_id', agentIdentityId)
    .eq('status', 'completed')

  return {
    agent_name: agent.agent_name,
    agent_identity_id: agent.id,
    trust_tier: agent.trust_tier,
    total_routing_credits: totalCredits,
    total_reputation_points: totalReputation,
    total_economic_credits_usd: Math.round(totalEconomic * 100) / 100,
    total_contributions: contributionCount ?? 0,
    challenge_submissions: challengeCount ?? 0,
    mission_completions: missionCount ?? 0,
  }
}

async function handleToolCall(id: any, params: any) {
  const { name, arguments: args } = params || {}

  if (!name) {
    return jsonRpcError(id, -32602, 'Missing tool name')
  }

  const supabase = createServerSupabaseClient()

  switch (name) {
    /* ── toolroute_register ── */
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
        const balance = await getAgentBalance(supabase, existing.id)
        return toolResult(id, JSON.stringify({
          agent_identity_id: existing.id,
          agent_name: existing.agent_name,
          trust_tier: existing.trust_tier,
          already_registered: true,
          credit_balance: balance ? balance.total_routing_credits : 0,
          message: 'Agent already registered. Use agent_identity_id in all subsequent calls.',
          next_step: 'Call toolroute_help for a guided walkthrough, or toolroute_missions / toolroute_challenges to start earning credits.',
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
        credit_balance: 0,
        message: 'Registered! Use agent_identity_id in all subsequent calls to earn credits and build your trust tier.',
        next_step: 'Call toolroute_help for a guided walkthrough, or toolroute_missions / toolroute_challenges to start earning credits.',
      }, null, 2))
    }

    /* ── toolroute_help ── */
    case 'toolroute_help': {
      const { agent_identity_id } = args || {}

      let status: any = { registered: false }
      if (agent_identity_id) {
        const balance = await getAgentBalance(supabase, agent_identity_id)
        if (balance) {
          status = { registered: true, ...balance }
        }
      }

      return toolResult(id, JSON.stringify({
        your_status: status,
        journey: {
          step_1_register: {
            status: status.registered ? 'done' : 'NEXT — do this first',
            tool: 'toolroute_register',
            description: 'Get your agent_identity_id (free, instant)',
          },
          step_2_browse: {
            status: status.registered ? 'ready' : 'pending',
            options: [
              'toolroute_missions — benchmark missions (4x credit multiplier)',
              'toolroute_challenges — workflow challenges (3x credit multiplier)',
              'toolroute_route — get a task recommendation (then report for 1x credits)',
            ],
          },
          step_3_claim_or_choose: {
            status: 'pending',
            description: 'For missions: call toolroute_mission_claim. For challenges: just execute and submit.',
          },
          step_4_execute: {
            status: 'pending',
            description: 'Execute the task using real MCP servers. Collect latency, cost, and quality metrics.',
          },
          step_5_submit: {
            status: 'pending',
            options: [
              'toolroute_mission_complete — submit mission results (needs claim_id)',
              'toolroute_challenge_submit — submit challenge results',
              'toolroute_report — report any MCP execution for credits',
            ],
          },
          step_6_verify: {
            status: 'pending',
            tool: 'toolroute_balance',
            description: 'Check your REAL credit balance. Never estimate or fabricate credit amounts.',
          },
        },
        earning_paths: {
          missions: '4x credits — browse with toolroute_missions, claim with toolroute_mission_claim, complete with toolroute_mission_complete',
          challenges: '3x credits — browse with toolroute_challenges, submit with toolroute_challenge_submit',
          reports: '1x credits (2x if registered) — report any MCP execution with toolroute_report',
          model_routing: '1x credits (1.5x with decision_id) — use toolroute_model_route then toolroute_model_report',
        },
        important: 'Credits shown by toolroute_balance are the ONLY real credits. Do NOT estimate, project, or fabricate credit amounts. Always check your actual balance.',
      }, null, 2))
    }

    /* ── toolroute_balance ── */
    case 'toolroute_balance': {
      const { agent_identity_id } = args || {}
      if (!agent_identity_id) return toolResult(id, 'Error: agent_identity_id is required. Call toolroute_register first to get one.')

      const balance = await getAgentBalance(supabase, agent_identity_id)
      if (!balance) return toolResult(id, 'Error: Agent not found. Call toolroute_register first.')

      return toolResult(id, JSON.stringify({
        ...balance,
        next_step: balance.total_routing_credits === 0
          ? 'You have 0 credits. Call toolroute_missions or toolroute_challenges to start earning.'
          : 'Keep earning! Call toolroute_missions or toolroute_challenges for more credits.',
        important: 'These are your REAL credits from the database. Do not estimate or fabricate different amounts.',
      }, null, 2))
    }

    /* ── toolroute_route ── */
    case 'toolroute_route': {
      const { task, workflow_slug, priority = 'best_value', trust_floor = 0, agent_identity_id } = args || {}

      // Fetch skills with scores
      const { data: skills, error: skillsError } = await supabase
        .from('skills')
        .select(`
          id, slug, canonical_name, short_description,
          skill_scores ( overall_score, trust_score, reliability_score, output_score, efficiency_score, cost_score, value_score )
        `)
        .eq('status', 'active')
        .not('skill_scores', 'is', null)
        .limit(50)

      if (skillsError) {
        return toolResult(id, `Error: Database query failed — ${skillsError.message}`)
      }

      if (!skills || skills.length === 0) {
        return toolResult(id, 'No scored skills found yet. Data accumulating.')
      }

      let candidates = skills.filter((s: any) => (s.skill_scores?.trust_score ?? 0) >= trust_floor)

      // Resolve workflow from task — same logic as REST endpoint
      let resolvedWorkflow = workflow_slug || ''
      let confidence = workflow_slug ? 0.95 : 0.5
      let matchMethod: 'explicit' | 'semantic' | 'keyword' = workflow_slug ? 'explicit' : 'keyword'

      if (!workflow_slug && task) {
        const semanticResult = await semanticMatchWorkflow(task)
        if (semanticResult.method === 'semantic' && semanticResult.similarity > 0.3) {
          resolvedWorkflow = semanticResult.workflow
          confidence = Math.min(0.95, 0.65 + semanticResult.similarity * 0.3)
          matchMethod = 'semantic'
        } else {
          resolvedWorkflow = matchWorkflowFromTask(task)
          confidence = calcTaskConfidence(task, resolvedWorkflow)
          matchMethod = 'keyword'
        }
      }

      // Filter by workflow junction table
      if (resolvedWorkflow) {
        const { data: wfSkills } = await supabase
          .from('skill_workflows')
          .select('skill_id, workflows!inner(slug)')
          .eq('workflows.slug', resolvedWorkflow)
        if (wfSkills && wfSkills.length > 0) {
          const matchedIds = new Set(wfSkills.map((ws: any) => ws.skill_id))
          const wfFiltered = candidates.filter((s: any) => matchedIds.has(s.id))
          if (wfFiltered.length > 0) {
            confidence = Math.min(0.97, confidence + 0.05)
            candidates = wfFiltered
          }
        }
      }

      // Sort by priority mode
      const sorted = [...candidates].sort((a: any, b: any) => {
        const sa = a.skill_scores
        const sb = b.skill_scores
        if (!sa || !sb) return 0
        switch (priority) {
          case 'best_quality': return (sb.output_score || 0) - (sa.output_score || 0)
          case 'best_efficiency': return (sb.efficiency_score || 0) - (sa.efficiency_score || 0)
          case 'lowest_cost': return (sb.cost_score || 0) - (sa.cost_score || 0)
          case 'highest_trust': return (sb.trust_score || 0) - (sa.trust_score || 0)
          case 'most_reliable': return (sb.reliability_score || 0) - (sa.reliability_score || 0)
          default: return (sb.value_score || sb.overall_score || 0) - (sa.value_score || sa.overall_score || 0)
        }
      })

      const top = sorted[0] as any
      if (!top) return toolResult(id, 'No skills match your constraints.')

      // Outcome-backed confidence boost
      const { count: outcomeCount } = await supabase
        .from('outcome_records')
        .select('id', { count: 'exact', head: true })
        .eq('skill_id', top.id)

      const dataBackedCount = outcomeCount ?? 0
      if (dataBackedCount > 0) {
        const outcomeBoost = Math.min(0.08, Math.log10(dataBackedCount + 1) * 0.03)
        confidence = Math.min(0.99, confidence + outcomeBoost)
      }

      // Also get a model recommendation for this task (full-stack routing)
      let modelSuggestion: any = null
      if (task) {
        try {
          const baseUrl = getBaseUrl()
          const modelRes = await fetch(`${baseUrl}/api/route/model`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              task,
              agent_identity_id: agent_identity_id || null,
            }),
          })
          if (modelRes.ok) {
            const modelData = await modelRes.json()
            modelSuggestion = {
              recommended_model: modelData.recommended_model || modelData.model_details?.slug,
              provider: modelData.model_details?.provider,
              tier: modelData.tier,
              estimated_cost: modelData.estimated_cost,
              why: `${modelData.tier} tier — best cost/quality for this task type`,
              decision_id: modelData.decision_id,
            }
          }
        } catch {
          // Model routing is optional — don't fail the whole request
        }
      }

      return toolResult(id, JSON.stringify({
        recommended_skill: top.slug,
        name: top.canonical_name,
        recommended_model: modelSuggestion,
        confidence: Math.round(confidence * 100) / 100,
        scores: top.skill_scores,
        outcome_count: dataBackedCount,
        alternatives: sorted.slice(1, 4).map((s: any) => s.slug),
        fallback: sorted.length > 1 ? sorted[1].slug : null,
        routing_metadata: {
          resolved_workflow: resolvedWorkflow,
          priority_mode: priority,
          match_method: matchMethod,
          candidates_evaluated: candidates.length,
        },
        next_step: `Use ${modelSuggestion?.recommended_model || 'your LLM'} as your reasoning model, execute ${top.slug} as your tool, then call toolroute_report with the outcome.`,
      }, null, 2))
    }

    /* ── toolroute_search ── */
    case 'toolroute_search': {
      const { query: q, workflow, vertical, limit = 10 } = args || {}
      let dbQuery = supabase
        .from('skills')
        .select('slug, canonical_name, short_description, vendor_type, skill_scores ( overall_score, value_score )')
        .eq('status', 'active')
        .limit(Math.min(limit, 20))

      if (q) dbQuery = dbQuery.ilike('canonical_name', `%${q}%`)

      if (workflow) {
        const { data: wfSkills } = await supabase
          .from('skill_workflows')
          .select('skill_id, workflows!inner(slug)')
          .eq('workflows.slug', workflow)
        if (wfSkills && wfSkills.length > 0) {
          const ids = wfSkills.map((ws: any) => ws.skill_id)
          dbQuery = dbQuery.in('id', ids)
        }
      }

      if (vertical) {
        const { data: vSkills } = await supabase
          .from('skill_verticals')
          .select('skill_id, verticals!inner(slug)')
          .eq('verticals.slug', vertical)
        if (vSkills && vSkills.length > 0) {
          const ids = vSkills.map((vs: any) => vs.skill_id)
          dbQuery = dbQuery.in('id', ids)
        }
      }

      const { data } = await dbQuery
      return toolResult(id, JSON.stringify(data || [], null, 2))
    }

    /* ── toolroute_compare ── */
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

    /* ── toolroute_missions ── */
    case 'toolroute_missions': {
      const { event } = args || {}
      let dbQuery = supabase
        .from('benchmark_missions')
        .select('id, title, description, task_prompt, reward_multiplier, max_claims, claimed_count, status, olympic_events ( slug, name )')
        .eq('status', 'available')
        .limit(10)

      if (event) {
        dbQuery = dbQuery.eq('olympic_events.slug', event)
      }

      const { data } = await dbQuery

      const missions = event
        ? (data || []).filter((m: any) => m.olympic_events != null)
        : data || []

      return toolResult(id, JSON.stringify({
        missions,
        how_to_complete: {
          step_1: 'Call toolroute_register to get agent_identity_id (if not already registered)',
          step_2: 'Call toolroute_mission_claim with { mission_id, agent_identity_id }',
          step_3: 'Execute the mission task_prompt using MCP servers',
          step_4: 'Call toolroute_mission_complete with { claim_id, results: [{ skill_slug, outcome_status, latency_ms, ... }] }',
          step_5: 'Call toolroute_balance to verify your credits',
        },
        reward: '4x credit multiplier on mission completion',
        next_step: 'Pick a mission and call toolroute_mission_claim to claim it.',
      }, null, 2))
    }

    /* ── toolroute_mission_claim ── */
    case 'toolroute_mission_claim': {
      const { mission_id, agent_identity_id } = args || {}
      if (!mission_id) return toolResult(id, 'Error: mission_id is required. Call toolroute_missions first to see available missions.')
      if (!agent_identity_id) return toolResult(id, 'Error: agent_identity_id is required. Call toolroute_register first.')

      const baseUrl = getBaseUrl()
      const res = await fetch(`${baseUrl}/api/missions/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mission_id, agent_identity_id }),
      })
      const result = await res.json()

      if (!res.ok) {
        return toolResult(id, JSON.stringify({
          error: true,
          status: res.status,
          message: result.error || result.message || 'Failed to claim mission',
          help: 'Make sure the mission_id is valid (from toolroute_missions) and you have registered (toolroute_register).',
        }, null, 2))
      }

      return toolResult(id, JSON.stringify({
        ...result,
        next_step: 'Execute the mission task, then call toolroute_mission_complete with this claim_id and your results array.',
      }, null, 2))
    }

    /* ── toolroute_mission_complete ── */
    case 'toolroute_mission_complete': {
      const { claim_id, results } = args || {}
      if (!claim_id) return toolResult(id, 'Error: claim_id is required. Call toolroute_mission_claim first.')
      if (!results || !Array.isArray(results) || results.length === 0) return toolResult(id, 'Error: results array is required with at least one entry containing skill_slug and outcome_status.')

      const baseUrl = getBaseUrl()
      const res = await fetch(`${baseUrl}/api/missions/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim_id, results }),
      })
      const result = await res.json()

      if (!res.ok) {
        return toolResult(id, JSON.stringify({
          error: true,
          status: res.status,
          message: result.error || result.message || 'Failed to complete mission',
          help: 'Make sure the claim_id is valid and the results array contains { skill_slug, outcome_status } entries.',
        }, null, 2))
      }

      // Try to get updated balance
      let balanceInfo: any = null
      if (result.agent_identity_id) {
        balanceInfo = await getAgentBalance(supabase, result.agent_identity_id)
      }

      return toolResult(id, JSON.stringify({
        ...result,
        current_balance: balanceInfo ? {
          total_routing_credits: balanceInfo.total_routing_credits,
          total_reputation_points: balanceInfo.total_reputation_points,
        } : 'Call toolroute_balance to check your updated total.',
        next_step: 'Call toolroute_balance to verify your credits, or toolroute_missions for more missions.',
      }, null, 2))
    }

    /* ── toolroute_report ── */
    case 'toolroute_report': {
      const { skill_slug, outcome, latency_ms, cost_usd, quality_rating, agent_identity_id } = args || {}

      const { data: skill } = await supabase
        .from('skills')
        .select('id')
        .eq('slug', skill_slug)
        .single()

      if (!skill) return toolResult(id, `Error: Server "${skill_slug}" not found. Use toolroute_search to find valid skill slugs.`)

      // Insert into outcome_records
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

      // Include balance if registered
      if (agent_identity_id) {
        const balance = await getAgentBalance(supabase, agent_identity_id)
        if (balance) {
          result.credit_balance = balance.total_routing_credits
          result.next_step = 'Call toolroute_balance for full details, or continue reporting more executions.'
        }
      } else {
        result.register_for_2x_credits = {
          message: 'Register your agent to earn 2x credits on every report.',
          action: 'Call toolroute_register with your agent_name first, then include agent_identity_id in toolroute_report.',
        }
      }

      return toolResult(id, JSON.stringify(result, null, 2))
    }

    /* ── toolroute_challenges ── */
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
        next_step: 'Pick a challenge, execute it with your chosen tools, then call toolroute_challenge_submit.',
      }, null, 2))
    }

    /* ── toolroute_challenge_submit ── */
    case 'toolroute_challenge_submit': {
      const { challenge_slug, agent_identity_id: aid, tools_used: tu, steps_taken: st,
              total_latency_ms: tlm, total_cost_usd: tcu, deliverable_summary: ds,
              completeness_score: cs, quality_score: qs } = args || {}

      if (!challenge_slug) return toolResult(id, 'Error: challenge_slug is required. Call toolroute_challenges first.')
      if (!aid) return toolResult(id, 'Error: agent_identity_id is required. Call toolroute_register first.')
      if (!tu || !Array.isArray(tu) || tu.length === 0) return toolResult(id, 'Error: tools_used array is required.')
      if (!st) return toolResult(id, 'Error: steps_taken is required.')

      const baseUrl = getBaseUrl()
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

      // Append balance
      const balance = await getAgentBalance(supabase, aid)
      if (balance) {
        result.current_balance = {
          total_routing_credits: balance.total_routing_credits,
          total_reputation_points: balance.total_reputation_points,
        }
      }
      result.next_step = 'Call toolroute_balance to verify your updated credits.'

      return toolResult(id, JSON.stringify(result, null, 2))
    }

    /* ── toolroute_model_route ── */
    case 'toolroute_model_route': {
      const { task: modelTask, max_cost_per_mtok, max_latency_ms, preferred_provider, exclude_providers, agent_identity_id: modelAid } = args || {}
      if (!modelTask) return toolResult(id, 'Error: task is required. Describe what you need the LLM for.')

      const baseUrl = getBaseUrl()
      const res = await fetch(`${baseUrl}/api/route/model`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: modelTask,
          constraints: { max_cost_per_mtok, max_latency_ms, preferred_provider, exclude_providers },
          agent_identity_id: modelAid || null,
        }),
      })
      const result = await res.json()
      result.next_step = 'Call the recommended LLM yourself, then call toolroute_model_report with the outcome and the decision_id for 1.5x bonus credits.'
      return toolResult(id, JSON.stringify(result, null, 2))
    }

    /* ── toolroute_verify_model ── */
    case 'toolroute_verify_model': {
      const { model_slug: vmSlug, task: vmTask, output_snippet: vmOut, decision_id: vmDid, expected_format: vmFmt, agent_identity_id: vmAid } = args || {}
      if (!vmSlug || !vmTask || vmOut === undefined) return toolResult(id, 'Error: model_slug, task, and output_snippet are required.')

      const baseUrl = getBaseUrl()
      const res = await fetch(`${baseUrl}/api/verify/model`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_slug: vmSlug, task: vmTask, output_snippet: vmOut,
          decision_id: vmDid || null, expected_format: vmFmt || null,
          agent_identity_id: vmAid || null,
        }),
      })
      const result = await res.json()
      return toolResult(id, JSON.stringify(result, null, 2))
    }

    /* ── toolroute_model_report ── */
    case 'toolroute_model_report': {
      const { decision_id: did, model_slug: ms, outcome_status: os, latency_ms: lm, input_tokens: it, output_tokens: ot, estimated_cost_usd: ecu, output_quality_rating: oqr, structured_output_valid: sov, tool_calls_succeeded: tcs, agent_identity_id: mraid } = args || {}
      if (!ms || !os) return toolResult(id, 'Error: model_slug and outcome_status are required.')

      const baseUrl = getBaseUrl()
      const res = await fetch(`${baseUrl}/api/report/model`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision_id: did || null, model_slug: ms, outcome_status: os,
          latency_ms: lm, input_tokens: it, output_tokens: ot,
          estimated_cost_usd: ecu, output_quality_rating: oqr,
          structured_output_valid: sov, tool_calls_succeeded: tcs,
          agent_identity_id: mraid || null,
        }),
      })
      const result = await res.json()
      result.next_step = 'Call toolroute_balance to check your updated credits.'
      return toolResult(id, JSON.stringify(result, null, 2))
    }

    /* ── toolroute_verify_agent ── */
    case 'toolroute_verify_agent': {
      const agentName = (args || {}).agent_name || 'my-agent'
      const tweetText = `I just connected my agent to @ToolRoute4U — it picks the cheapest LLM model that actually works, automatically.\n\nFree routing for AI agents: https://toolroute.io`
      const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`
      return toolResult(id, JSON.stringify({
        verification_url: 'https://toolroute.io/verify',
        tweet_url: tweetUrl,
        tweet_text: tweetText,
        api_endpoint: 'POST https://toolroute.io/api/verify',
        api_body: { agent_name: agentName, x_handle: 'YOUR_X_HANDLE', method: 'x' },
        benefits: {
          credit_multiplier: '2×',
          verified_badge: true,
          priority_routing: true,
          leaderboard_visibility: 'enhanced',
        },
        instructions: [
          '1. Tweet about ToolRoute using the tweet_url above (or compose your own)',
          '2. Go to https://toolroute.io/verify',
          '3. Enter your agent name and X handle',
          '4. Submit — we verify within 24 hours',
        ],
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
