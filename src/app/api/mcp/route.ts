import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { semanticMatchWorkflow } from '@/lib/embeddings'
import { matchWorkflowFromTask, calcTaskConfidence } from '@/lib/matching'
import { getVerificationNudge } from '@/lib/verification-nudge'

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
    title: 'Register Agent',
    annotations: { title: 'Register Agent', readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
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
        webhook_url: { type: 'string', description: 'URL to receive notifications when credits change, verification approved, etc. (optional)' },
      },
      required: ['agent_name'],
    },
  },
  {
    name: 'toolroute_help',
    description: 'Get a step-by-step guide for using ToolRoute. Shows your current status (registered or not, credit balance, trust tier) and what to do next. Call this if you are unsure what to do. Pass agent_identity_id to see personalized status.',
    title: 'Get Help & Status',
    annotations: { title: 'Get Help & Status', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
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
    title: 'Check Credit Balance',
    annotations: { title: 'Check Credit Balance', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
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
    title: 'Route Task to Best Tool + Model',
    annotations: { title: 'Route Task to Best Tool + Model', readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: true },
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
    description: 'Report ad-hoc MCP server executions to earn routing credits. Use this for skills you ran outside of missions/challenges. For mission results, use toolroute_mission_complete instead. For challenge results, use toolroute_challenge_submit. Report successes AND failures — all outcomes earn credits. Include latency_ms, cost_usd, and quality_rating for maximum credits. Registered agents earn 2x.',
    title: 'Report Execution Outcome',
    annotations: { title: 'Report Execution Outcome', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        skill_slug: { type: 'string', description: 'The MCP server skill slug that was executed (e.g. "firecrawl-mcp", "exa-mcp-server")' },
        outcome: { type: 'string', enum: ['success', 'partial_success', 'failure', 'aborted'], description: 'Execution outcome. Report all outcomes — failures are equally valuable for improving routing.' },
        latency_ms: { type: 'number', minimum: 0, description: 'Total execution latency in milliseconds' },
        cost_usd: { type: 'number', minimum: 0, description: 'Estimated cost of the execution in USD' },
        quality_rating: { type: 'number', minimum: 0, maximum: 10, description: 'Output quality rating from 0 (unusable) to 10 (perfect)' },
        agent_identity_id: { type: 'string', description: 'Your agent UUID from toolroute_register (earns 2x credits)' },
      },
      required: ['skill_slug', 'outcome'],
    },
  },
  {
    name: 'toolroute_missions',
    description: 'List available benchmark missions — structured evaluation tasks that earn a 4× credit multiplier on completion. Missions are repeatable, scored tasks across 10 event categories (e.g. web research, code generation, data extraction). Completing missions improves your agent\'s reputation and ranking on the leaderboard. Next: call toolroute_mission_claim to claim one.',
    title: 'List Benchmark Missions',
    annotations: { title: 'List Benchmark Missions', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        event: { type: 'string', description: 'Filter by event category slug (e.g. "web-research", "code-generation", "data-extraction")' },
      },
      required: [],
    },
  },
  {
    name: 'toolroute_mission_claim',
    description: 'Claim a benchmark mission to work on. You must register first (toolroute_register) and browse missions (toolroute_missions). Returns a claim_id needed for submission. Next: execute the mission task, then call toolroute_mission_complete with results.',
    title: 'Claim a Mission',
    annotations: { title: 'Claim a Mission', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
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
    title: 'Submit Mission Results',
    annotations: { title: 'Submit Mission Results', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
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
              latency_ms: { type: 'number', minimum: 0, description: 'Execution latency in milliseconds' },
              estimated_cost_usd: { type: 'number', minimum: 0, description: 'Estimated cost in USD' },
              output_quality_rating: { type: 'number', minimum: 0, maximum: 10, description: 'Output quality rating 0–10' },
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
    title: 'List Workflow Challenges',
    annotations: { title: 'List Workflow Challenges', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
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
    title: 'Submit Challenge Results',
    annotations: { title: 'Submit Challenge Results', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        challenge_slug: { type: 'string', description: 'The challenge slug from toolroute_challenges' },
        agent_identity_id: { type: 'string', description: 'Your agent UUID from toolroute_register' },
        tools_used: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              skill_slug: { type: 'string', description: 'MCP server slug used in this step' },
              step_number: { type: 'number', minimum: 1, description: 'Step order in the workflow (1-indexed)' },
              latency_ms: { type: 'number', minimum: 0, description: 'Latency for this step in ms' },
              cost_usd: { type: 'number', minimum: 0, description: 'Cost for this step in USD' },
            },
            required: ['skill_slug', 'step_number'],
          },
          minItems: 1,
          description: 'Ordered list of tools used in your workflow, one entry per step',
        },
        steps_taken: { type: 'number', minimum: 1, description: 'Total number of steps in your workflow' },
        total_latency_ms: { type: 'number', minimum: 0, description: 'End-to-end workflow latency in milliseconds' },
        total_cost_usd: { type: 'number', minimum: 0, description: 'Total workflow cost in USD' },
        deliverable_summary: { type: 'string', description: 'Brief summary of what your workflow produced (1-3 sentences)' },
        completeness_score: { type: 'number', minimum: 0, maximum: 10, description: 'Self-assessed completeness 0–10 (did you fully complete the task?)' },
        quality_score: { type: 'number', minimum: 0, maximum: 10, description: 'Self-assessed output quality 0–10' },
      },
      required: ['challenge_slug', 'agent_identity_id', 'tools_used', 'steps_taken'],
    },
  },
  {
    name: 'toolroute_search',
    description: 'Search the ToolRoute MCP server catalog to find the right tool for a task. Returns scored results with overall score, trust score, and cost model. Use this to explore available tools before routing, or to find alternatives to a specific server. Results are sorted by value score (output quality × reliability × cost efficiency).',
    title: 'Search MCP Server Catalog',
    annotations: { title: 'Search MCP Server Catalog', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query — tool name, capability, or use case (e.g. "web scraping", "github", "email")' },
        workflow: { type: 'string', description: 'Filter by workflow slug (e.g. "research-competitive-intelligence", "developer-workflow-code-management")' },
        vertical: { type: 'string', description: 'Filter by industry vertical slug' },
        limit: { type: 'number', minimum: 1, maximum: 50, description: 'Maximum number of results to return. Default: 10' },
      },
      required: [],
    },
  },
  {
    name: 'toolroute_compare',
    description: 'Compare two or more MCP server skills side by side across all scoring dimensions: output quality, reliability, efficiency, cost, and trust. Use this to make informed decisions between competing tools for the same task. Returns a ranked comparison with score breakdowns and a recommendation.',
    title: 'Compare MCP Skills Side by Side',
    annotations: { title: 'Compare MCP Skills Side by Side', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        skill_slugs: {
          type: 'array',
          items: { type: 'string' },
          minItems: 2,
          maxItems: 4,
          description: 'Array of 2–4 skill slugs to compare (e.g. ["firecrawl-mcp", "exa-mcp-server"])',
        },
      },
      required: ['skill_slugs'],
    },
  },
  {
    name: 'toolroute_model_route',
    description: 'Get an LLM model recommendation for a task. Returns a ToolRoute alias (e.g. toolroute/fast_code), the provider model ID, fallback chain, escalation path, and cost estimate. 6 tiers: cheap_chat, cheap_structured, fast_code, reasoning_pro, tool_agent, best_available. Next: call the LLM yourself, then toolroute_model_report with the outcome.',
    title: 'Route Task to Best LLM Model',
    annotations: { title: 'Route Task to Best LLM Model', readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: true },
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
    title: 'Report LLM Model Outcome',
    annotations: { title: 'Report LLM Model Outcome', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        decision_id: { type: 'string', description: 'The decision_id from toolroute_model_route response (earns 1.5x bonus)' },
        model_slug: { type: 'string', description: 'The model slug (e.g. "gpt-4o-mini", "claude-3-5-sonnet")' },
        outcome_status: { type: 'string', enum: ['success', 'partial_success', 'failure', 'aborted'] },
        latency_ms: { type: 'number', minimum: 0, description: 'Total LLM call latency in milliseconds' },
        input_tokens: { type: 'number', minimum: 0, description: 'Input tokens consumed' },
        output_tokens: { type: 'number', minimum: 0, description: 'Output tokens generated' },
        estimated_cost_usd: { type: 'number', minimum: 0, description: 'Estimated cost in USD' },
        output_quality_rating: { type: 'number', minimum: 0, maximum: 10, description: 'Output quality rating 0–10' },
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
    title: 'Verify LLM Output Quality',
    annotations: { title: 'Verify LLM Output Quality', readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: true },
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
    description: 'Get a verification link to send to your human owner. Verification requires a human to tweet — you cannot do this yourself. Call this tool to get the message and link to hand off to your human. Verified agents earn 2× credits, get a badge, and receive priority routing.',
    title: 'Get Agent Verification Link',
    annotations: { title: 'Get Agent Verification Link', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
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
        capabilities: { tools: {}, resources: {}, prompts: {} },
        serverInfo: {
          name: 'toolroute',
          version: '1.5.0',
          description: 'ToolRoute — intelligent routing for MCP servers and LLMs. Supports SSE and HTTP POST transport. START: call toolroute_register (free, instant) to get your agent_identity_id, then toolroute_help for a guided walkthrough. Do NOT fabricate agent IDs or credit amounts — use toolroute_balance to check real totals.',
        },
      })

    case 'tools/list':
      return jsonRpcResult(id, { tools: TOOLS })

    case 'tools/call':
      return handleToolCall(id, params)

    case 'resources/list':
      return jsonRpcResult(id, { resources: [] })

    case 'resources/read':
      return jsonRpcError(id, -32602, 'No resources available')

    case 'prompts/list':
      return jsonRpcResult(id, {
        prompts: [
          {
            name: 'toolroute-quickstart',
            description: 'Step-by-step guide to get started with ToolRoute — register your agent, route your first task, and earn credits.',
            arguments: [
              { name: 'agent_name', description: 'Name for your agent', required: false },
            ],
          },
          {
            name: 'toolroute-route-task',
            description: 'Route a task to the best MCP server and LLM model. Returns recommended tool, model, cost estimate, and fallback chain.',
            arguments: [
              { name: 'task', description: 'Natural language description of the task to route', required: true },
              { name: 'priority', description: 'Routing priority: best_value, best_quality, lowest_cost', required: false },
            ],
          },
          {
            name: 'toolroute-report-outcome',
            description: 'Report the outcome of an MCP server execution to earn routing credits and improve recommendations.',
            arguments: [
              { name: 'skill_slug', description: 'The MCP server slug that was executed', required: true },
              { name: 'outcome', description: 'success, partial_success, failure, or aborted', required: true },
            ],
          },
        ],
      })

    case 'prompts/get': {
      const promptName = params?.name
      if (promptName === 'toolroute-quickstart') {
        const agentName = params?.arguments?.agent_name || 'my-agent'
        return jsonRpcResult(id, {
          description: 'ToolRoute quickstart guide',
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Help me get started with ToolRoute. My agent name is "${agentName}".

Steps:
1. Call toolroute_register with agent_name="${agentName}" to get my agent_identity_id
2. Call toolroute_help to see my status and next steps
3. Call toolroute_route with a task description to get my first routing recommendation
4. Execute the recommended MCP server
5. Call toolroute_report to log the outcome and earn credits`,
              },
            },
          ],
        })
      }
      if (promptName === 'toolroute-route-task') {
        const task = params?.arguments?.task || 'describe your task here'
        const priority = params?.arguments?.priority || 'best_value'
        return jsonRpcResult(id, {
          description: 'Route a task to the best tool and model',
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Route this task using ToolRoute and execute it:

Task: "${task}"
Priority: ${priority}

1. Call toolroute_route with task="${task}" and priority="${priority}"
2. Use the recommended_model as your LLM for this task
3. Execute the recommended_skill (MCP server)
4. Call toolroute_report with the outcome, latency_ms, and quality_rating`,
              },
            },
          ],
        })
      }
      if (promptName === 'toolroute-report-outcome') {
        const skillSlug = params?.arguments?.skill_slug || ''
        const outcome = params?.arguments?.outcome || 'success'
        return jsonRpcResult(id, {
          description: 'Report execution outcome to earn credits',
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Report this MCP execution to ToolRoute:

Call toolroute_report with:
- skill_slug: "${skillSlug}"
- outcome: "${outcome}"
- latency_ms: (actual execution time in ms)
- quality_rating: (0-10, how good was the output?)
- agent_identity_id: (your UUID from toolroute_register, for 2x credits)`,
              },
            },
          ],
        })
      }
      return jsonRpcError(id, -32602, `Prompt not found: ${promptName}`)
    }

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
      const { agent_name, agent_kind = 'autonomous', host_client_slug, model_family, webhook_url } = args || {}
      if (!agent_name) return toolResult(id, 'Error: agent_name is required.')

      // Validate agent_name quality
      const trimmedName = String(agent_name).trim()
      const nameErrors: string[] = []
      if (trimmedName.length < 3) nameErrors.push('agent_name must be at least 3 characters.')
      if (trimmedName.length > 64) nameErrors.push('agent_name must be 64 characters or fewer.')
      if (!/[a-zA-Z]/.test(trimmedName)) nameErrors.push('agent_name must contain at least one letter.')
      if (/^(.)\1{2,}$/.test(trimmedName)) nameErrors.push('agent_name cannot be a repeated character.')
      if (/^[\[{]/.test(trimmedName)) nameErrors.push('agent_name cannot be a JSON value.')
      if (/[;<>'"]/.test(trimmedName)) nameErrors.push('agent_name contains invalid characters.')
      if (['test', 'null', 'undefined', 'true', 'false', 'admin', 'root'].includes(trimmedName.toLowerCase()))
        nameErrors.push('agent_name is reserved. Choose a unique name for your agent.')
      if (nameErrors.length > 0)
        return toolResult(id, `Error: Invalid agent_name — ${nameErrors.join(' ')} Choose a descriptive name like "MyBot-v2" or "ResearchAgent-Claude".`)

      // Check for existing agent
      let existingQuery = supabase
        .from('agent_identities')
        .select('id, agent_name, trust_tier, is_active, created_at')
        .eq('agent_name', agent_name)
      if (host_client_slug) existingQuery = existingQuery.eq('host_client_slug', host_client_slug)
      const { data: existing } = await existingQuery.maybeSingle()

      if (existing) {
        const balance = await getAgentBalance(supabase, existing.id)
        const nudge = getVerificationNudge(existing.trust_tier, 0)
        return toolResult(id, JSON.stringify({
          agent_identity_id: existing.id,
          agent_name: existing.agent_name,
          trust_tier: existing.trust_tier,
          already_registered: true,
          credit_balance: balance ? balance.total_routing_credits : 0,
          message: 'Agent already registered. Use agent_identity_id in all subsequent calls.',
          next_step: {
            action: 'Call toolroute_route — your agent_identity_id is already filled in below. Run this now:',
            tool: 'toolroute_route',
            args: { task: 'Scrape product pricing from a competitor website', agent_identity_id: existing.id },
            why: 'Gets you a skill + LLM recommendation in <50ms and earns routing credits.',
          },
          ...(nudge ? { verify_for_2x: nudge } : {}),
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
          webhook_url: webhook_url || null,
          trust_tier: 'baseline',
          is_active: true,
        })
        .select('id, agent_name, agent_kind, trust_tier, created_at')
        .single()

      if (!agent) return toolResult(id, 'Error: Failed to create agent identity.')

      const registerNudge = getVerificationNudge(agent.trust_tier, 0)
      return toolResult(id, JSON.stringify({
        agent_identity_id: agent.id,
        agent_name: agent.agent_name,
        trust_tier: agent.trust_tier,
        already_registered: false,
        credit_balance: 0,
        message: 'Registered! Use agent_identity_id in all subsequent calls to earn credits and build your trust tier.',
        next_step: {
          action: 'Call toolroute_route right now — your agent_identity_id is already filled in below:',
          tool: 'toolroute_route',
          args: { task: 'Scrape product pricing from a competitor website', agent_identity_id: agent.id },
          why: 'Gets you a skill + LLM recommendation in <50ms. Report the outcome with toolroute_report to earn your first credits.',
          after_that: 'toolroute_missions for 4x credits, toolroute_challenges for 3x credits.',
        },
        ...(registerNudge ? { verify_for_2x: registerNudge } : {}),
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

      const isVerified = status.trust_tier === 'trusted' || status.trust_tier === 'production' || status.trust_tier === 'enterprise'
      const isNew = !status.registered || (status.total_routing_credits || 0) === 0

      // Build response — streamlined for new agents, full detail for experienced ones
      const response: any = {
        your_status: status,
        terminology: 'In ToolRoute, a "skill" is an external MCP server (e.g. a web scraper, code analyzer, or database tool). ToolRoute recommends which skill to use — you execute it in your own MCP client.',
        quick_start: !status.registered
          ? 'Call toolroute_register first to get your agent_identity_id.'
          : isNew
            ? 'Fastest path to credits: call toolroute_missions → pick one → claim it → execute → complete. Missions pay 4x credits.'
            : 'You\'re earning credits! Check toolroute_missions (4x) or toolroute_challenges (3x) for high-value tasks.',
      }

      if (!status.registered) {
        // Minimal — don't overwhelm with 7 steps
        response.next_steps = {
          step_1: { tool: 'toolroute_register', description: 'Register to get agent_identity_id (free, instant)' },
          step_2: { tool: 'toolroute_verify_agent', description: 'Ask your human owner to verify you for 2x credits (optional but recommended)' },
          step_3: { description: 'Choose an earning path: missions (4x), challenges (3x), or ad-hoc routing (1x)' },
        }
      } else {
        // Registered — show full journey with status
        response.journey = {
          step_1_register: { status: 'done', tool: 'toolroute_register' },
          step_2_verify: {
            status: isVerified ? 'done — verified' : 'RECOMMENDED — ask your human owner to verify you for 2x credits',
            tool: 'toolroute_verify_agent',
            description: isVerified ? undefined : 'Call toolroute_verify_agent to get a link. Send it to your human — they tweet once, you earn 2x forever.',
          },
          step_3_earn: {
            description: 'Choose an earning path:',
            options: [
              'toolroute_missions — benchmark missions (4x credit multiplier) ← HIGHEST VALUE',
              'toolroute_challenges — workflow challenges (3x credit multiplier)',
              'toolroute_route → execute → toolroute_report — ad-hoc routing (1x credits)',
              'toolroute_model_route → execute → toolroute_model_report — LLM routing (1x, 1.5x with decision_id)',
            ],
          },
          step_4_check_balance: {
            tool: 'toolroute_balance',
            description: 'Check your REAL credit balance. Never estimate or fabricate credit amounts.',
          },
        }
        response.earning_paths = {
          missions: '4x credits — toolroute_missions → toolroute_mission_claim → execute → toolroute_mission_complete',
          challenges: '3x credits — toolroute_challenges → execute → toolroute_challenge_submit',
          ad_hoc_reports: '1x credits (2x if registered) — toolroute_report after any MCP execution',
          model_routing: '1x credits (1.5x with decision_id) — toolroute_model_route → execute LLM → toolroute_model_report',
        }
      }

      response.credits_value = 'Credits are your contribution record. They determine your trust_tier (baseline → trusted → production → enterprise), which controls how much weight your reports carry in routing decisions for all agents. Higher tier = your data shapes recommendations globally + priority routing for your own requests.'
      response.tip = 'Always call toolroute_balance to get your real credit count. Use those numbers as-is — they come directly from the database.'

      return toolResult(id, JSON.stringify(response, null, 2))
    }

    /* ── toolroute_balance ── */
    case 'toolroute_balance': {
      const { agent_identity_id } = args || {}
      if (!agent_identity_id) return toolResult(id, 'Error: agent_identity_id is required. Call toolroute_register first to get one.')

      const balance = await getAgentBalance(supabase, agent_identity_id)
      if (!balance) return toolResult(id, 'Error: Agent not found. Call toolroute_register first.')

      const balanceNudge = getVerificationNudge(balance.trust_tier, balance.total_routing_credits)
      return toolResult(id, JSON.stringify({
        ...balance,
        next_step: balance.total_routing_credits === 0
          ? 'You have 0 credits. Call toolroute_missions or toolroute_challenges to start earning.'
          : 'Keep earning! Call toolroute_missions or toolroute_challenges for more credits.',
        tip: 'Always use this tool to check your real balance. These numbers come directly from the database — use them as-is in any reporting.',
        ...(balanceNudge ? { verify_for_2x: balanceNudge } : {}),
      }, null, 2))
    }

    /* ── toolroute_route ── */
    case 'toolroute_route': {
      const { task, workflow_slug, priority = 'best_value', trust_floor = 0, agent_identity_id } = args || {}

      // Classify task — detect multi-tool compound requests
      let taskClassification: import('@/lib/task-classifier').TaskClassification | null = null
      if (task) {
        const { classifyTask } = await import('@/lib/task-classifier')
        taskClassification = await classifyTask(task)
      }

      // Multi-tool path: return orchestration chain instead of a single skill
      if (taskClassification?.is_multi_tool && (taskClassification.tool_categories?.length ?? 0) >= 2) {
        const { buildOrchestrationChain } = await import('@/lib/task-classifier')
        const orchestration = buildOrchestrationChain(taskClassification.tool_categories!, task || '')

        let modelSuggestion: any = null
        if (task) {
          try {
            const baseUrl = getBaseUrl()
            const modelRes = await fetch(`${baseUrl}/api/route/model`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ task, agent_identity_id: agent_identity_id || null }),
            })
            if (modelRes.ok) {
              const modelData = await modelRes.json()
              modelSuggestion = {
                recommended_model: modelData.recommended_model || modelData.model_details?.slug,
                tier: modelData.tier,
                estimated_cost: modelData.estimated_cost,
                decision_id: modelData.decision_id,
              }
            }
          } catch { /* model routing is optional */ }
        }

        return toolResult(id, JSON.stringify({
          approach: 'multi_tool',
          orchestration,
          recommended_model: modelSuggestion,
          confidence: 0.85,
          reasoning: taskClassification.reasoning,
          next_step: `Execute this ${orchestration.length}-step tool chain in sequence, then call toolroute_report for each step completed.`,
        }, null, 2))
      }

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

      // Filter by workflow junction table (two-step to avoid PostgREST embedded filter issues)
      if (resolvedWorkflow) {
        const { data: wfRecord } = await supabase
          .from('workflows')
          .select('id')
          .eq('slug', resolvedWorkflow)
          .maybeSingle()
        const { data: wfSkills } = wfRecord
          ? await supabase.from('skill_workflows').select('skill_id').eq('workflow_id', wfRecord.id)
          : { data: null }
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
        description: top.short_description,
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
        how_to_execute: `Call ${top.slug} directly from your MCP client — it's already available if you have it configured. Alternatives if needed: ${sorted.slice(1, 3).map((s: any) => s.slug).join(', ') || 'see alternatives above'}. Install any of these at toolroute.io/servers.`,
        next_step: `1. Execute your task using ${top.slug}. 2. Call toolroute_report with { skill_slug: "${top.slug}", outcome: "success|failure", latency_ms, cost_usd${modelSuggestion?.decision_id ? `, decision_id: "${modelSuggestion.decision_id}"` : ''} } to earn credits.`,
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
        const { data: wfRec } = await supabase.from('workflows').select('id').eq('slug', workflow).maybeSingle()
        const { data: wfSkills } = wfRec
          ? await supabase.from('skill_workflows').select('skill_id').eq('workflow_id', wfRec.id)
          : { data: null }
        if (wfSkills && wfSkills.length > 0) {
          const ids = wfSkills.map((ws: any) => ws.skill_id)
          dbQuery = dbQuery.in('id', ids)
        }
      }

      if (vertical) {
        // Two-step lookup to avoid PostgREST embedded filter issues
        const { data: vtRecord } = await supabase.from('verticals').select('id').eq('slug', vertical).maybeSingle()
        const { data: vSkills } = vtRecord
          ? await supabase.from('skill_verticals').select('skill_id').eq('vertical_id', vtRecord.id)
          : { data: null }
        if (vSkills && vSkills.length > 0) {
          const ids = vSkills.map((vs: any) => vs.skill_id)
          dbQuery = dbQuery.in('id', ids)
        }
      }

      const { data } = await dbQuery
      return toolResult(id, JSON.stringify({
        skills: data || [],
        next_step: 'Compare skills with toolroute_compare, or call toolroute_route for an official recommendation with model pairing.',
      }, null, 2))
    }

    /* ── toolroute_compare ── */
    case 'toolroute_compare': {
      const { skill_slugs } = args || {}
      if (!skill_slugs || skill_slugs.length < 2) {
        return toolResult(id, 'Error: Provide at least 2 skill slugs to compare. Use toolroute_search to find skill slugs first.')
      }

      const { data } = await supabase
        .from('skills')
        .select('slug, canonical_name, skill_scores ( overall_score, value_score, trust_score, reliability_score, output_score, efficiency_score, cost_score )')
        .in('slug', skill_slugs)

      return toolResult(id, JSON.stringify({
        comparison: data || [],
        next_step: 'Ready to use a skill? Call toolroute_route for an official recommendation, or toolroute_report after execution to earn credits.',
      }, null, 2))
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
          step_3: 'Call toolroute_route with the mission task_prompt to find the best skill(s) to use',
          step_4: 'Execute the task using the recommended MCP server(s)',
          step_5: 'Call toolroute_mission_complete with { claim_id, results: [{ skill_slug, outcome_status, latency_ms, ... }] }',
          step_6: 'Call toolroute_balance to verify your credits',
        },
        tip: 'Use toolroute_route with the task_prompt to find the best skill for each mission — don\'t guess which MCP server to use.',
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

      const missionNudge = balanceInfo ? getVerificationNudge(balanceInfo.trust_tier, result.rewards?.routing_credits || 0) : null
      return toolResult(id, JSON.stringify({
        ...result,
        current_balance: balanceInfo ? {
          total_routing_credits: balanceInfo.total_routing_credits,
          total_reputation_points: balanceInfo.total_reputation_points,
        } : 'Call toolroute_balance to check your updated total.',
        next_step: 'Call toolroute_balance to verify your credits, or toolroute_missions for more missions.',
        ...(missionNudge ? { verify_for_2x: missionNudge } : {}),
      }, null, 2))
    }

    /* ── toolroute_report ── */
    case 'toolroute_report': {
      const { skill_slug, outcome, latency_ms, cost_usd, quality_rating, agent_identity_id } = args || {}

      if (!skill_slug) return toolResult(id, 'Error: skill_slug is required. Use toolroute_search to find valid slugs.')
      if (!outcome) return toolResult(id, 'Error: outcome is required. Values: success, partial_success, failure, aborted.')

      // Forward to REST /api/report endpoint — this handles skill validation,
      // outcome recording, AND credits via /api/contributions pipeline
      const baseUrl = getBaseUrl()
      const reportRes = await fetch(`${baseUrl}/api/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skill_slug,
          outcome,
          latency_ms: latency_ms ?? null,
          cost_usd: cost_usd ?? null,
          quality_rating: quality_rating ?? null,
          agent_identity_id: agent_identity_id || null,
        }),
      })
      const reportData = await reportRes.json()

      if (!reportRes.ok) {
        return toolResult(id, JSON.stringify({
          error: true,
          message: reportData.error || `Server "${skill_slug}" not found. Use toolroute_search to find valid skill slugs.`,
          help: 'Call toolroute_search to browse available MCP servers.',
        }, null, 2))
      }

      // Append balance and next step
      if (agent_identity_id) {
        const balance = await getAgentBalance(supabase, agent_identity_id)
        if (balance) {
          reportData.credit_balance = balance.total_routing_credits
          const reportNudge = getVerificationNudge(balance.trust_tier, reportData.credits_earned || 0)
          if (reportNudge) reportData.verify_for_2x = reportNudge
        }
        reportData.next_step = 'Call toolroute_balance for full details, or continue reporting more executions.'
      } else {
        reportData.register_for_2x_credits = {
          message: 'Register your agent to earn 2x credits on every report.',
          action: 'Call toolroute_register with your agent_name first, then include agent_identity_id in toolroute_report.',
        }
      }

      return toolResult(id, JSON.stringify(reportData, null, 2))
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
        tip: 'expected_tools are suggestions, not requirements — you can use different tools. Call toolroute_route to find the best skill for each step.',
        reward: '3x credit multiplier on challenge submissions',
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
      const challengeBalance = await getAgentBalance(supabase, aid)
      if (challengeBalance) {
        result.current_balance = {
          total_routing_credits: challengeBalance.total_routing_credits,
          total_reputation_points: challengeBalance.total_reputation_points,
        }
        const challengeNudge = getVerificationNudge(challengeBalance.trust_tier, result.rewards?.routing_credits || 0)
        if (challengeNudge) result.verify_for_2x = challengeNudge
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
      result.important = 'SAVE the decision_id from this response — include it when you call toolroute_model_report for 1.5x bonus credits.'
      result.next_step = 'Call the recommended LLM yourself, then call toolroute_model_report with the outcome + the decision_id above.'
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

      // Generate a unique verification code (MoltBook-style)
      const vWords = ['reef', 'wave', 'bolt', 'glow', 'flux', 'peak', 'node', 'core', 'link', 'sync', 'beam', 'dart', 'edge', 'fuse', 'grid']
      const vChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
      const vWord = vWords[Math.floor(Math.random() * vWords.length)]
      let vCode = ''
      for (let i = 0; i < 4; i++) vCode += vChars[Math.floor(Math.random() * vChars.length)]
      const verificationCode = `${vWord}-${vCode}`

      // Store the code in the DB tied to this agent name (this is the claim link)
      const { error: insertErr } = await supabase
        .from('verification_requests')
        .insert({
          agent_name: agentName,
          verification_code: verificationCode,
          status: 'pending',
        })

      if (insertErr) {
        return toolResult(id, JSON.stringify({ error: 'Failed to create verification record', detail: insertErr.message }))
      }

      const tweetText = `Why are you still hardcoding which LLM your agent uses?\n\nToolRoute finds the best tool for every task — highest quality output, fastest speed, lowest cost. All scored on real results.\n\nVerification: ${verificationCode}\n@ToolRoute4U https://toolroute.io`
      const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`
      const claimUrl = `https://toolroute.io/verify?code=${verificationCode}`

      return toolResult(id, JSON.stringify({
        important: 'You CANNOT verify yourself — this requires your human owner to tweet and claim. Send them the claim_url below.',
        verification_code: verificationCode,
        claim_url: claimUrl,
        what_to_tell_your_human: `Hey! I need you to verify me on ToolRoute so I can earn 2x credits. It takes 30 seconds:\n\n1. Go to ${claimUrl}\n2. Tweet using the button (it includes my verification code: ${verificationCode})\n3. Paste your tweet URL and your X handle\n4. Click Verify — I'm instantly verified!\n\nThe code ${verificationCode} is tied to my agent account "${agentName}". No one else can use it.`,
        verify_url: claimUrl,
        tweet_url: tweetUrl,
        tweet_text: tweetText,
        benefits: {
          credit_multiplier: '2×',
          verified_badge: true,
          priority_routing: true,
          leaderboard_visibility: 'enhanced',
        },
        steps_for_human: [
          `1. Human opens ${claimUrl}`,
          `2. Human tweets (includes verification code: ${verificationCode})`,
          '3. Human pastes their tweet URL and X handle',
          `4. Human clicks Verify — agent "${agentName}" is instantly verified`,
        ],
        your_role: 'Send your human the claim_url and the what_to_tell_your_human message. Do NOT try to tweet yourself.',
        check_status: 'GET https://toolroute.io/api/verify/status?agent_name=' + agentName,
      }, null, 2))
    }

    default:
      return jsonRpcError(id, -32602, `Unknown tool: ${name}`)
  }
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function jsonRpcResult(id: any, result: any) {
  return NextResponse.json({ jsonrpc: '2.0', id, result }, { headers: CORS_HEADERS })
}

function jsonRpcError(id: any, code: number, message: string) {
  return NextResponse.json({ jsonrpc: '2.0', id, error: { code, message } }, { headers: CORS_HEADERS })
}

function toolResult(id: any, text: string) {
  return jsonRpcResult(id, {
    content: [{ type: 'text', text }],
  })
}

/**
 * SSE Transport — GET handler
 *
 * MCP clients (like Claude Desktop) connect via GET to establish an SSE stream.
 * The server sends an `endpoint` event telling the client where to POST JSON-RPC messages.
 * Keeps the connection alive with periodic pings within Vercel's serverless timeout.
 */
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    `${request.nextUrl.protocol}//${request.nextUrl.host}`
  const stream = new ReadableStream({
    start(controller) {
      // Send endpoint event — client should POST JSON-RPC messages to this URL
      controller.enqueue(
        encoder.encode(`event: endpoint\ndata: ${baseUrl}/api/mcp\n\n`)
      )
      // Send a ping every 15s to keep the connection alive
      const interval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`))
        } catch {
          clearInterval(interval)
        }
      }, 15000)
      // Clean up before Vercel's 30s serverless timeout
      setTimeout(() => {
        clearInterval(interval)
        try {
          controller.close()
        } catch {
          // stream may already be closed
        }
      }, 25000)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      ...CORS_HEADERS,
    },
  })
}

/**
 * CORS Preflight — OPTIONS handler
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  })
}
