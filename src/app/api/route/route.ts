import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { semanticMatchWorkflow } from '@/lib/embeddings'
import { matchWorkflowFromTask, calcTaskConfidence } from '@/lib/matching'
import { rateLimit, getRateLimitKey } from '@/lib/rate-limit'

// GET /api/route — Self-documenting API guide for agents
export async function GET() {
  return NextResponse.json({
    name: 'ToolRoute',
    version: '1.0.0',
    description: 'The intelligent routing layer for MCP servers. Find the best tool for every agent task — scored on real execution data.',
    base_url: 'https://toolroute.io',
    quick_start: {
      step_1_register: {
        description: 'Register your agent to get an identity (idempotent — safe to call every time)',
        method: 'POST',
        url: '/api/agents/register',
        body: {
          agent_name: 'your-agent-name',
          agent_kind: 'autonomous | copilot | workflow-agent | evaluation-agent | hybrid',
          host_client_slug: 'cursor | claude-desktop | vscode | custom (optional)',
          model_family: 'claude | gpt | gemini | etc (optional)',
        },
        returns: 'agent_identity_id (UUID) — use this in all subsequent calls',
      },
      step_2_route: {
        description: 'Ask ToolRoute which MCP server is best for your task',
        method: 'POST',
        url: '/api/route',
        body: {
          task: 'natural language description of what you need to do',
          agent_identity_id: 'UUID from step 1 (optional but recommended)',
          constraints: {
            priority: 'best_value | best_quality | best_efficiency | lowest_cost | highest_trust | most_reliable',
            max_cost_usd: 'maximum cost per run (optional)',
            trust_floor: 'minimum trust score 0-10 (optional)',
          },
        },
        returns: 'recommended_skill slug, confidence score, alternatives, fallback chain',
      },
      step_3_execute: {
        description: 'Install and use the recommended MCP server (ToolRoute does not execute — you do)',
        note: 'The recommended_skill slug maps to an npm package: npx -y @modelcontextprotocol/{slug}',
      },
      step_4_report: {
        description: 'Report what happened — earns routing credits and improves scores for everyone',
        important: 'You can report ANY MCP server execution — not just recommendations from step 2. Report skills you chose yourself, from missions, or from any source.',
        method: 'POST',
        url: '/api/report',
        body: {
          skill_slug: 'any MCP server slug you used (e.g. "firecrawl-mcp", "playwright-mcp")',
          outcome: 'success | partial_success | failure | aborted',
          latency_ms: 'execution time in ms (optional but earns more credits)',
          cost_usd: 'estimated cost (optional)',
          quality_rating: '0-10 output quality (optional)',
          agent_identity_id: 'UUID from step 1 (optional but earns 2x credits)',
        },
        returns: 'credits_earned, reputation_earned, credit_balance',
      },
    },
    reporting: {
      description: 'Report ANY MCP server execution to earn credits — not limited to ToolRoute recommendations.',
      what_to_report: [
        'Any MCP server you used for any task (recommended or not)',
        'Successes, partial successes, failures, and aborts — all earn credits',
        'Benchmark mission results via /api/missions/complete for 4x multiplier',
        'A/B comparisons of 2+ skills via /api/contributions (comparative_eval type)',
        'Fallback chains when primary skill fails via /api/contributions (fallback_chain type)',
      ],
      endpoints: {
        simple: 'POST /api/report — quick telemetry for any single execution',
        missions: 'POST /api/missions/complete — submit benchmark mission results (4x credits)',
        advanced: 'POST /api/contributions — comparative evals, fallback chains, benchmark packages',
      },
    },
    endpoints: {
      'POST /api/agents/register': 'Register or look up an agent identity',
      'GET /api/agents/register?name=': 'Look up agent by name or id',
      'POST /api/route': 'Get a task-based tool recommendation',
      'GET /api/route': 'This guide',
      'POST /api/report': 'Report ANY skill execution — earns credits (GET for full docs)',
      'GET /api/report': 'Documentation for reporting — what to report, examples, credit rewards',
      'POST /api/contributions': 'Advanced telemetry — A/B tests, fallback chains, benchmark packages',
      'POST /api/mcp': 'JSON-RPC MCP endpoint (8 tools)',
      'GET /api/skills': 'Search the MCP server catalog',
      'GET /api/missions/available': 'List available benchmark missions (10 events)',
      'POST /api/missions/claim': 'Claim a benchmark mission',
      'POST /api/missions/complete': 'Submit mission results (4x credit multiplier)',
      'GET /api/challenges': 'Workflow Challenges — real business tasks, you choose the tools (3x credits)',
      'POST /api/challenges/submit': 'Submit challenge results with tools used, timing, deliverable',
      'GET /api/challenges/{slug}/leaderboard': 'Challenge leaderboard — see winning tool combos',
      'GET /api/admin/stats': 'Platform telemetry dashboard',
    },
    challenges: {
      description: 'Workflow Challenges are real business tasks (competitive research, bug triage, content drafting) where YOU pick the tools. Scored on efficiency — fewer tools, lower cost, faster = Gold tier.',
      endpoint: 'GET /api/challenges',
      submit: 'POST /api/challenges/submit',
      reward: '3x credit multiplier + Gold/Silver/Bronze tiers',
    },
    mcp_server: {
      description: 'ToolRoute is itself an MCP server. Add it to your config for tool-assisted routing.',
      cursor: { url: 'https://toolroute.io/api/mcp', transport: 'http' },
      claude_desktop: { command: 'npx', args: ['-y', '@toolroute/sdk', '--mcp'] },
      tools: ['toolroute_route', 'toolroute_search', 'toolroute_compare', 'toolroute_missions', 'toolroute_report', 'toolroute_register', 'toolroute_challenges', 'toolroute_challenge_submit'],
    },
    scoring: {
      formula: 'Value Score = 0.35×Output + 0.25×Reliability + 0.15×Efficiency + 0.15×Cost + 0.10×Trust',
      scale: '0-10, capped at 8.8. An 8.5+ is excellent. 7.5+ is very good. Like Consumer Reports — nothing is perfect.',
      methodology: 'Outcome-backed telemetry from real agent executions — not GitHub stars, not vibes',
    },
    credit_economy: {
      run_report: '3-10 credits',
      comparative_eval: '8-25 credits (2.5x multiplier)',
      fallback_chain: '5-15 credits (1.5x multiplier)',
      benchmark_package: '15-40 credits (4x multiplier)',
      trust_tiers: 'unverified → baseline → trusted → production → enterprise (auto-promoted by reputation)',
    },
  })
}

export async function POST(request: NextRequest) {
  // Rate limit: 120 requests/hour per IP
  const rlKey = getRateLimitKey(request)
  const rl = rateLimit('route', rlKey, 120)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    )
  }

  const supabase = createServerSupabaseClient()

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const {
    task,
    workflow_slug: explicitWorkflow,
    vertical_slug,
    constraints = {},
    agent_identity_id,
  } = body

  const {
    priority = 'best_value',
    max_cost_usd,
    trust_floor = 0,
    latency_preference = 'medium',
    data_residency,
    require_effort_level,
    exclude_workload_tags,
  } = constraints

  const {
    estimated_input_tokens,
    estimated_output_tokens,
    us_only,
  } = body

  // Classify task using LLM (Gemini Flash Lite, ~$0.00001 per call)
  // Falls back to keyword detection if LLM unavailable
  let taskClassification: import('@/lib/task-classifier').TaskClassification | null = null
  if (task && !explicitWorkflow) {
    const { classifyTask } = await import('@/lib/task-classifier')
    taskClassification = await classifyTask(task)
  }
  const needsMcpServer = taskClassification
    ? taskClassification.needs_external_tool
    : (task ? detectMcpNeed(task) : true)

  // Require either task or workflow_slug
  if (!task && !explicitWorkflow) {
    return NextResponse.json({
      error: 'Either "task" (natural language) or "workflow_slug" is required.',
      usage: {
        method: 'POST',
        url: '/api/route',
        example_body: {
          task: 'scrape product pages and extract pricing data',
          agent_identity_id: 'optional — register at POST /api/agents/register first',
        },
      },
      guide: 'GET /api/route for full API documentation',
    }, { status: 400 })
  }

  // Resolve workflow from task if not explicitly provided
  let resolvedWorkflow = explicitWorkflow || ''
  let confidence = explicitWorkflow ? 0.95 : 0.5
  let matchMethod: 'explicit' | 'semantic' | 'keyword' = explicitWorkflow ? 'explicit' : 'keyword'

  if (!explicitWorkflow && task) {
    // Use LLM classification if available (most accurate)
    if (taskClassification && taskClassification.method === 'llm') {
      if (taskClassification.needs_external_tool && taskClassification.tool_category) {
        // Calculation tasks are better handled by code models than MCP servers
        if (taskClassification.tool_category === 'calculation') {
          taskClassification.needs_external_tool = false
          taskClassification.task_type = 'code'
          taskClassification.complexity = 'simple'
          resolvedWorkflow = 'general'
        } else {
        const { toolCategoryToWorkflow } = await import('@/lib/task-classifier')
        resolvedWorkflow = toolCategoryToWorkflow(taskClassification.tool_category)
        }
        // Preferred skill overrides for specific tool categories
        const TOOL_CATEGORY_SKILL_PREFERENCE: Record<string, string> = {
          'web_fetch': 'firecrawl-mcp',
          'web_search': 'exa-mcp-server',
          'email': 'gmail-mcp',
          'messaging': 'slack-mcp',
          'calendar': 'google-calendar-mcp',
          'code_repo': 'github-mcp-server',
          'database': 'supabase-mcp',
          'security_scan': 'snyk-mcp',
        }
        const preferredSkillSlug = TOOL_CATEGORY_SKILL_PREFERENCE[taskClassification.tool_category]
        if (preferredSkillSlug) {
          (taskClassification as any)._preferredSkill = preferredSkillSlug
        }
      } else {
        resolvedWorkflow = 'general'
      }
      confidence = 0.90
      matchMethod = 'llm' as any
    } else {
      // Try semantic matching
      const semanticResult = await semanticMatchWorkflow(task)

      if (semanticResult.method === 'semantic' && semanticResult.similarity > 0.3) {
        resolvedWorkflow = semanticResult.workflow
        confidence = Math.min(0.95, 0.65 + semanticResult.similarity * 0.3)
        matchMethod = 'semantic'
      } else {
        // Fall back to keyword matching (shared lib)
        resolvedWorkflow = matchWorkflowFromTask(task)
        confidence = calcTaskConfidence(task, resolvedWorkflow)
        matchMethod = 'keyword'
      }
    }
  }

  // Fetch skills with scores
  // Strategy: if we resolved a workflow, fetch skills for that workflow first.
  // This avoids the "top 50 skills" trap where relevant skills get excluded.
  let candidates: any[] = []
  let junctionFiltered = false

  if (resolvedWorkflow) {
    // Step 1: look up workflow ID by slug
    const { data: workflowRecord } = await supabase
      .from('workflows')
      .select('id')
      .eq('slug', resolvedWorkflow)
      .maybeSingle()

    // Step 2: query junction table directly by workflow_id
    const { data: workflowSkillIds } = workflowRecord
      ? await supabase
          .from('skill_workflows')
          .select('skill_id')
          .eq('workflow_id', workflowRecord.id)
      : { data: null }

    if (workflowSkillIds && workflowSkillIds.length > 0) {
      const matchedIds = workflowSkillIds.map((ws: any) => ws.skill_id)

      // Fetch full details for these specific skills
      const { data: workflowSkills } = await supabase
        .from('skills')
        .select(`
          id, slug, canonical_name, short_description, vendor_type,
          skill_scores ( overall_score, trust_score, reliability_score, output_score, efficiency_score, cost_score, value_score ),
          skill_metrics ( github_stars, days_since_last_commit ),
          skill_cost_models ( monthly_base_cost_usd, pricing_model )
        `)
        .eq('status', 'active')
        .not('skill_scores', 'is', null)
        .in('id', matchedIds)

      if (workflowSkills && workflowSkills.length > 0) {
        candidates = workflowSkills
        junctionFiltered = true
      }
    }
  }

  // Fallback: if no workflow or no workflow-specific skills found, fetch all
  if (candidates.length === 0) {
    const { data: allSkills, error: skillsError } = await supabase
      .from('skills')
      .select(`
        id, slug, canonical_name, short_description, vendor_type,
        skill_scores ( overall_score, trust_score, reliability_score, output_score, efficiency_score, cost_score, value_score ),
        skill_metrics ( github_stars, days_since_last_commit ),
        skill_cost_models ( monthly_base_cost_usd, pricing_model )
      `)
      .eq('status', 'active')
      .not('skill_scores', 'is', null)
      .limit(50)

    if (skillsError) {
      return NextResponse.json({
        error: 'Database query failed',
        detail: skillsError.message,
      }, { status: 500 })
    }

    candidates = allSkills || []
  }

  if (candidates.length === 0) {
    return NextResponse.json({
      recommended_skill: null,
      confidence: 0,
      message: 'No scored skills found yet. Data accumulating.',
    })
  }

  // Filter by trust floor
  const filtered = candidates.filter((s: any) => {
    const trust = s.skill_scores?.trust_score ?? 0
    return trust >= trust_floor
  })

  // Filter by max cost if specified
  const costFiltered = max_cost_usd != null
    ? filtered.filter((s: any) => {
        const cost = s.skill_cost_models?.monthly_base_cost_usd
        return cost == null || cost <= max_cost_usd
      })
    : filtered

  candidates = costFiltered.length > 0 ? costFiltered : filtered

  // Per-agent personalization: boost skills this agent has used successfully before
  const agentPreferredSlugs = new Set<string>()
  if (agent_identity_id) {
    const { data: agentHistory } = await supabase
      .from('contribution_events')
      .select('payload_json')
      .eq('agent_identity_id', agent_identity_id)
      .eq('contribution_type', 'run_telemetry')
      .eq('accepted', true)
      .limit(30)

    if (agentHistory) {
      for (const ev of agentHistory) {
        const p = ev.payload_json as any
        if ((p?.outcome_status === 'success' || p?.outcome_status === 'partial_success') && p?.skill_slug) {
          agentPreferredSlugs.add(p.skill_slug)
        }
      }
    }
  }

  // Sort by priority mode, with personalization boost for known-good skills
  const PERSONALIZATION_BOOST = 0.5
  const sorted = [...candidates].sort((a: any, b: any) => {
    const sa = a.skill_scores
    const sb = b.skill_scores
    if (!sa || !sb) return 0
    const boostA = agentPreferredSlugs.has(a.slug) ? PERSONALIZATION_BOOST : 0
    const boostB = agentPreferredSlugs.has(b.slug) ? PERSONALIZATION_BOOST : 0
    switch (priority) {
      case 'best_quality': return ((sb.output_score || 0) + boostB) - ((sa.output_score || 0) + boostA)
      case 'best_efficiency': return ((sb.efficiency_score || 0) + boostB) - ((sa.efficiency_score || 0) + boostA)
      case 'lowest_cost': return ((sb.cost_score || 0) + boostB) - ((sa.cost_score || 0) + boostA)
      case 'highest_trust': return ((sb.trust_score || 0) + boostB) - ((sa.trust_score || 0) + boostA)
      case 'most_reliable': return ((sb.reliability_score || 0) + boostB) - ((sa.reliability_score || 0) + boostA)
      default: return ((sb.value_score || sb.overall_score || 0) + boostB) - ((sa.value_score || sa.overall_score || 0) + boostA)
    }
  })

  if (sorted.length === 0) {
    return NextResponse.json({
      recommended_skill: null,
      confidence: 0,
      message: 'No skills match your constraints. Try relaxing trust_floor or max_cost_usd.',
    })
  }

  // If classifier has a preferred skill for this tool_category, prioritize it
  let top = sorted[0] as any
  const preferredSlug = (taskClassification as any)?._preferredSkill
  if (preferredSlug) {
    const preferredIdx = sorted.findIndex((s: any) => s.slug === preferredSlug)
    if (preferredIdx > 0) {
      top = sorted[preferredIdx] as any
      sorted.splice(preferredIdx, 1)
      sorted.unshift(top)
    }
  }
  const alternatives = sorted.slice(1, 4).map((s: any) => s.slug)

  // Fetch outcome count for the recommended skill (more data = higher confidence)
  const { count: outcomeCount } = await supabase
    .from('outcome_records')
    .select('id', { count: 'exact', head: true })
    .eq('skill_id', top.id)

  const dataBackedOutcomeCount = outcomeCount ?? 0

  // Adjust confidence: boost when we have junction-table matches and outcome data
  let adjustedConfidence = confidence
  if (junctionFiltered) {
    // Junction table narrowed the results — boost confidence
    adjustedConfidence = Math.min(0.97, adjustedConfidence + 0.05)
  }
  if (dataBackedOutcomeCount > 0) {
    // More outcome records = higher confidence, diminishing returns
    const outcomeBoost = Math.min(0.08, Math.log10(dataBackedOutcomeCount + 1) * 0.03)
    adjustedConfidence = Math.min(0.99, adjustedConfidence + outcomeBoost)
  }

  // Recommend combo if available
  const combo = await getRecommendedCombo(supabase, top.slug, alternatives)

  // Determine fallback
  const fallback = alternatives.length > 0 ? alternatives[0] : null

  // Track telemetry rate (increment recommendations)
  trackRecommendation(supabase).catch(() => {})

  // If agent is registered, log the routing event for personalization
  let agentContext: any = null
  if (agent_identity_id) {
    const { data: agent } = await supabase
      .from('agent_identities')
      .select('agent_name, trust_tier')
      .eq('id', agent_identity_id)
      .single()

    if (agent) {
      agentContext = {
        agent_name: agent.agent_name,
        trust_tier: agent.trust_tier,
        recognized: true,
        ...(agentPreferredSlugs.size > 0 && {
          personalized: true,
          personalization_note: `Routing personalized — boosted ${agentPreferredSlugs.size} skill(s) you've used successfully before.`,
        }),
      }

      // Check for recent verification approval (within last hour) to notify agent
      if (agent.trust_tier === 'trusted') {
        const { data: recentVerification } = await supabase
          .from('verification_requests')
          .select('reviewed_at, x_handle')
          .eq('agent_name', agent.agent_name)
          .eq('status', 'approved')
          .order('reviewed_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (recentVerification?.reviewed_at) {
          const reviewedAt = new Date(recentVerification.reviewed_at)
          const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
          if (reviewedAt > hourAgo) {
            agentContext.notification = {
              type: 'verification_approved',
              message: `Your human owner @${recentVerification.x_handle} just verified you! You now earn 2x credits on everything.`,
              verified_by: `@${recentVerification.x_handle}`,
              benefits: ['2x credit multiplier', 'Verified badge', 'Priority routing'],
            }
          }
        }
      }
    }
  }

  // Get model recommendation directly (no self-fetch — fails on Vercel)
  let recommendedModel: any = null
  if (task) {
    try {
      const { detectTaskSignals, resolveModelTier, rankModelsInTier, buildFallbackChain, estimateTaskCost, TIER_DESCRIPTIONS } = await import('@/lib/model-routing')

      // Use LLM classifier for tier if available, fall back to signal detection
      let tier: string
      if (taskClassification && taskClassification.method === 'llm') {
        const { classificationToModelTier } = await import('@/lib/task-classifier')
        const routingPriority = (priority === 'lowest_cost' || priority === 'highest_quality') ? priority : 'best_value'
        tier = classificationToModelTier(taskClassification, routingPriority as any)
      } else {
        const signals = detectTaskSignals(task)
        tier = resolveModelTier(signals, task)
      }

      const { data: aliasRows } = await supabase
        .from('model_aliases')
        .select(`
          priority, is_fallback, alias_name,
          model_registry (
            id, slug, display_name, provider, provider_model_id,
            input_cost_per_mtok, output_cost_per_mtok,
            context_window, supports_tool_calling, supports_structured_output
          )
        `)
        .eq('tier', tier)
        .eq('active', true)
        .order('priority', { ascending: true })

      if (aliasRows && aliasRows.length > 0) {
        const candidates = aliasRows.map((a: any) => {
          const m = Array.isArray(a.model_registry) ? a.model_registry[0] : a.model_registry
          return {
            id: m.id, slug: m.slug, display_name: m.display_name,
            provider: m.provider, provider_model_id: m.provider_model_id,
            priority: a.priority, is_fallback: a.is_fallback,
            input_cost_per_mtok: parseFloat(m.input_cost_per_mtok || '0'),
            output_cost_per_mtok: parseFloat(m.output_cost_per_mtok || '0'),
            context_window: m.context_window,
            supports_tool_calling: m.supports_tool_calling,
            supports_structured_output: m.supports_structured_output,
            avg_latency_ms: null, supports_vision: false,
            reasoning_strength: 'medium', code_strength: 'medium',
            deprecation_date: null,
          }
        })
        const ranked = rankModelsInTier(candidates, {})
        if (ranked.length > 0) {
          const primary = ranked[0]
          recommendedModel = {
            slug: primary.slug,
            display_name: primary.display_name,
            provider: primary.provider,
            provider_model_id: primary.provider_model_id,
            input_cost_per_mtok: primary.input_cost_per_mtok,
            output_cost_per_mtok: primary.output_cost_per_mtok,
            tier,
            tier_description: (TIER_DESCRIPTIONS as any)[tier]?.name || tier,
            reason: `${(TIER_DESCRIPTIONS as any)[tier]?.name || tier} tier — best cost/quality for this task type`,
          }
        }
      }
    } catch {
      // Model routing is optional — don't block skill routing
    }
  }

  // ── Pipeline reconciliation: models table + legacy tier classifier ──────────
  // Goal: one winning model. recommended_model and model_details must always
  // describe the same model. The models table is authoritative when constraints
  // are active; the legacy tier classifier wins otherwise.
  let modelDetails: any = null
  let costEstimate: any = null
  let actionableNotes: string[] | null = null
  let modelsTableRows: any[] = []

  if (recommendedModel) {
    try {
      const { data: modelRows } = await supabase
        .from('models')
        .select(`
          id, provider, display_name, tier,
          input_price_per_m, output_price_per_m, input_price_tiered,
          cache_read_multiplier, context_window, max_output_tokens,
          supports_vision, supports_tool_use, supports_reasoning,
          supports_task_budgets, max_image_resolution_px,
          effort_levels, tokenizer_inflation_vs_baseline,
          data_residency, us_only_multiplier, exclude_for_workloads,
          editorial_notes, best_for, avoid_for,
          is_routable, deprecated_at
        `)
        .eq('is_routable', true)
        .is('deprecated_at', null)

      modelsTableRows = modelRows || []
    } catch {
      // models table is optional — never blocks skill routing
    }
  }

  if (modelsTableRows.length > 0) {
    const constraintsForFilter = { data_residency, require_effort_level, exclude_workload_tags }
    const hasConstraints = !!(data_residency?.length || require_effort_level || exclude_workload_tags?.length)
    const filtered = filterByConstraints(modelsTableRows, constraintsForFilter)

    // Empty set with active constraints — return 200 with actionable guidance, not 4xx
    if (filtered.length === 0 && hasConstraints) {
      return NextResponse.json({
        approach: null,
        recommended_skill: null,
        recommended_model: null,
        confidence: 0,
        model_details: null,
        cost_estimate: null,
        actionable_notes: [
          'No models match the provided constraints. Relax data_residency, require_effort_level, or exclude_workload_tags and try again.',
        ],
      })
    }

    // ── Determine authoritative winner ──────────────────────────────────────
    // Invariant: recommended_model.slug === model_details.id in every response
    // where both are populated.
    let authoritativeRow: any = null

    if (require_effort_level) {
      // Effort level pin: the filter result is authoritative — legacy tier classifier
      // cannot know about effort_levels, so it will always pick the wrong model.
      authoritativeRow = filtered[0] || null

    } else if (data_residency?.length || exclude_workload_tags?.length) {
      // Residency/workload constraints: check if the legacy winner satisfies them.
      // Match by id === slug (models.id is the slug-like identifier).
      const legacyRow = modelsTableRows.find((m: any) => m.id === recommendedModel?.slug)
      if (legacyRow && filterByConstraints([legacyRow], constraintsForFilter).length > 0) {
        // Legacy winner satisfies constraints — keep it
        authoritativeRow = legacyRow
      } else {
        // Legacy winner violates constraints — override with filter winner
        authoritativeRow = filtered[0] || null
      }

    } else {
      // No constraints: look up legacy winner in models table by id === slug
      // If not found, model_details stays null (slug not yet in seed data)
      authoritativeRow = modelsTableRows.find((m: any) => m.id === recommendedModel?.slug) || null
    }

    if (authoritativeRow) {
      // Override recommended_model when authoritative winner differs from legacy
      if (recommendedModel && authoritativeRow.id !== recommendedModel.slug) {
        recommendedModel = rebuildRecommendedModel(authoritativeRow, require_effort_level)
      }

      // model_details always describes the same model as recommended_model
      modelDetails = {
        id: authoritativeRow.id,
        provider: authoritativeRow.provider,
        tier: authoritativeRow.tier,
        context_window: authoritativeRow.context_window,
        effort_levels: authoritativeRow.effort_levels,
        data_residency: authoritativeRow.data_residency || 'global',
        supports_task_budgets: authoritativeRow.supports_task_budgets,
      }

      // Tokenizer-aware cost estimate (only when token counts provided)
      if (estimated_input_tokens != null && estimated_output_tokens != null && authoritativeRow.input_price_per_m != null) {
        costEstimate = estimateEffectiveCostUsd(authoritativeRow, estimated_input_tokens, estimated_output_tokens, { usOnly: us_only })
      }

      // Build actionable notes from the winning model row
      const notes: string[] = []
      const inflation = authoritativeRow.tokenizer_inflation_vs_baseline || 1.0
      if (inflation > 1.0) {
        const pct = ((inflation - 1) * 100).toFixed(0)
        notes.push(`Tokenizer produces up to ${pct}% more tokens than baseline. Effective cost reflects this.`)
      }
      const taskKind = body.task?.kind
      if (taskKind && authoritativeRow.best_for?.includes(taskKind)) {
        notes.push(`Model is explicitly tuned for: ${taskKind}.`)
      }
      if (taskKind && authoritativeRow.avoid_for?.includes(taskKind)) {
        notes.push(`Caution: model is marked avoid-for "${taskKind}". Consider a lighter model.`)
      }
      if (authoritativeRow.editorial_notes?.length) {
        notes.push(...authoritativeRow.editorial_notes.slice(0, 2))
      }
      actionableNotes = notes.length > 0 ? notes : null
    }
    // authoritativeRow is null when legacy slug has no models-table row yet —
    // model_details stays null, recommended_model stays as-is. Expected for slugs
    // not yet in seed data; fix incrementally as models table is populated.
  }

  // Determine approach: multi-tool, single MCP server, or direct LLM?
  // Re-read needs_external_tool from taskClassification — it may have been overridden
  // (e.g. calculation tasks are redirected to direct LLM after initial classification)
  const effectiveNeedsMcp = taskClassification ? taskClassification.needs_external_tool : needsMcpServer
  const isMultiTool = taskClassification?.is_multi_tool && (taskClassification.tool_categories?.length ?? 0) >= 2
  const approach = isMultiTool ? 'multi_tool' : (effectiveNeedsMcp ? 'mcp_server' : 'direct_llm')

  // Build orchestration chain for multi-tool tasks
  let orchestration = null
  if (isMultiTool && taskClassification?.tool_categories) {
    const { buildOrchestrationChain } = await import('@/lib/task-classifier')
    orchestration = buildOrchestrationChain(taskClassification.tool_categories, task || '')
  }

  return NextResponse.json({
    approach,
    ...(approach === 'multi_tool' ? {
      message: `This task requires ${taskClassification?.tool_categories?.length} tools in sequence.`,
      orchestration,
      recommended_skill: orchestration?.[0]?.recommended_skill || null,
      recommended_skill_name: orchestration?.[0]?.skill_name || null,
      recommended_model: recommendedModel,
    } : approach === 'direct_llm' ? {
      message: 'This task can be handled by your LLM directly — no MCP server needed.',
      recommended_model: recommendedModel,
      recommended_skill: null,
      recommended_skill_name: null,
      cost_insight: recommendedModel
        ? `Use ${recommendedModel.display_name} (${recommendedModel.provider}) at $${recommendedModel.input_cost_per_mtok}/1M tokens — ${recommendedModel.tier_description || recommendedModel.tier} tier. Priority: ${priority}. Pass constraints.priority = "lowest_cost" or "highest_quality" to adjust.`
        : 'Use your current model — this is a standard LLM task.',
    } : {
      recommended_skill: top.slug,
      recommended_skill_name: top.canonical_name,
      recommended_model: recommendedModel,
    }),
    confidence: Math.round(adjustedConfidence * 100) / 100,
    reasoning: approach === 'multi_tool'
      ? `Multi-tool task requiring ${taskClassification?.tool_categories?.join(', ')}. Execute steps in order.`
      : approach === 'direct_llm'
      ? `Pure LLM task — no external tool access required. ${recommendedModel ? `Recommended: ${recommendedModel.slug} (${recommendedModel.tier} tier).` : 'Use your current model.'}`
      : buildReasoning(top, priority, task, resolvedWorkflow),
    alternatives: approach === 'direct_llm' ? [] : alternatives,
    recommended_combo: approach === 'direct_llm' ? null : combo,
    fallback: approach === 'direct_llm' ? null : fallback,
    scores: approach === 'direct_llm' ? null : top.skill_scores,
    outcome_count: dataBackedOutcomeCount,
    non_mcp_alternative: approach === 'direct_llm' ? null : getNonMcpAlternative(resolvedWorkflow),
    routing_metadata: {
      resolved_workflow: resolvedWorkflow,
      priority_mode: priority,
      candidates_evaluated: candidates.length,
      junction_table_filtered: junctionFiltered,
      trust_floor_applied: trust_floor,
      latency_preference: latency_preference,
      match_method: matchMethod,
      ...(taskClassification ? {
        classification: {
          task_type: taskClassification.task_type,
          complexity: taskClassification.complexity,
          tool_category: taskClassification.tool_category,
          tool_categories: taskClassification.tool_categories,
          is_multi_tool: taskClassification.is_multi_tool,
          method: taskClassification.method,
          reasoning: taskClassification.reasoning,
        },
      } : {}),
    },
    wanted_telemetry: {
      report_endpoint: '/api/report',
      reward_multiplier: 1.5,
      comparative_bonus: 2.5,
      estimated_credits: {
        run_report: '+3 to +10 routing credits',
        comparative_eval: '+8 to +25 routing credits',
        fallback_chain: '+5 to +15 routing credits',
        benchmark_package: '+15 to +40 routing credits',
      },
      fields: ['latency_ms', 'cost_usd', 'quality_rating', 'outcome', 'fallback_chain'],
      one_liner: approach === 'direct_llm'
        ? `toolroute.report({ model: '${recommendedModel?.slug || 'your-model'}', outcome: 'success', quality_rating: 8, latency_ms: 1200 })`
        : `toolroute.report({ skill: '${top.slug}', outcome: 'success', latency_ms: 2340 })`,
    },
    model_details: modelDetails,
    cost_estimate: costEstimate,
    actionable_notes: actionableNotes,
    agent: agentContext,
    ...(agent_identity_id ? {} : {
      register_hint: {
        message: 'Register your agent to earn 2x credits on every report and unlock mission claiming.',
        action: 'POST /api/agents/register',
        body: { agent_name: 'your-agent-name' },
        then: 'Include the returned agent_identity_id in this request and in POST /api/report',
      },
    }),
  })
}

function buildReasoning(skill: any, priority: string, task: string | undefined, workflow: string): string {
  const scores = skill.skill_scores
  if (!scores) return 'Recommended based on catalog metadata.'

  const valueScore = scores.value_score?.toFixed(1) ?? scores.overall_score?.toFixed(1)
  const parts: string[] = []

  parts.push(`${skill.canonical_name} scores ${valueScore}/10 value.`)

  if (priority !== 'best_value') {
    parts.push(`Selected for ${priority.replace(/_/g, ' ')} priority.`)
  } else {
    parts.push('Highest value score in this category with strong reliability.')
  }

  if (task) {
    parts.push(`Matched to workflow: ${workflow.replace(/-/g, ' ')}.`)
  }

  return parts.join(' ')
}

async function getRecommendedCombo(
  supabase: any,
  topSkillSlug: string,
  alternativeSlugs: string[]
): Promise<string[] | null> {
  // Find combinations that include the top skill
  const { data: combos } = await supabase
    .from('combination_skills')
    .select(`
      combination_id,
      skill:skills ( slug ),
      combinations ( slug, name )
    `)
    .limit(20)

  if (!combos || combos.length === 0) return null

  // Group by combination and find one that includes our top skill
  const comboMap = new Map<string, string[]>()
  for (const c of combos) {
    const comboSlug = (c as any).combinations?.slug
    const skillSlug = (c as any).skill?.slug
    if (!comboSlug || !skillSlug) continue
    if (!comboMap.has(comboSlug)) comboMap.set(comboSlug, [])
    comboMap.get(comboSlug)!.push(skillSlug)
  }

  const keys = Array.from(comboMap.keys())
  for (const key of keys) {
    const skillSlugs = comboMap.get(key)!
    if (skillSlugs.includes(topSkillSlug)) {
      return skillSlugs
    }
  }

  return null
}

/**
 * Detect whether a task actually needs an MCP server or is a pure LLM task.
 * Pure LLM tasks: writing, code generation, translation, analysis from memory,
 * formatting, brainstorming — anything the model can do without external tools.
 * MCP-required tasks: web search, scraping, API calls, file operations,
 * database queries, sending messages, calendar operations, etc.
 */
function detectMcpNeed(task: string): boolean {
  const lower = task.toLowerCase()

  // CHECK LLM-ONLY SIGNALS FIRST (more specific about what user is asking)
  const llmOnly = [
    // Writing/generation
    'write a', 'draft a', 'compose', 'generate a', 'create a template',
    'write code', 'write python', 'write javascript', 'write sql',
    'write function', 'write class', 'implement a',
    'write unit test', 'write test', 'generate test', 'test case',
    'write a slack', 'write a message', 'draft a message',
    'write a reply', 'write a response', 'draft a reply',
    // Analysis/explanation from knowledge (not external data)
    'explain', 'summarize this', 'analyze this', 'compare', 'pros and cons',
    'review this code', 'fix this code', 'debug this', 'refactor',
    'translate', 'rewrite', 'improve this', 'edit this',
    'analyze the pros', 'advantages and disadvantages', 'tradeoffs',
    'competitive analysis', 'analysis of', 'evaluate the',
    'difference between', 'explain the difference',
    // Formatting/structuring
    'format', 'convert to json', 'parse this', 'extract from this',
    'create csv', 'generate schema', 'outline', 'parse and extract',
    'create a template', 'generate a template',
    // Planning/brainstorming
    'brainstorm', 'plan for', 'strategy for', 'decision matrix',
    'meeting agenda', 'project plan', 'choosing between',
    'choose between', 'which is better', 'recommend a',
    // Knowledge tasks (no external lookup needed)
    'troubleshooting guide', 'how to guide', 'tutorial',
    'best practices', 'checklist', 'framework for',
    'options for', 'considerations for',
    // Content creation
    'blog post', 'article', 'linkedin post', 'social media',
    'newsletter', 'report template', 'agenda',
  ]

  for (const signal of llmOnly) {
    if (lower.includes(signal)) return false
  }

  // THEN check MCP signals (need external system access)
  const mcpRequired = [
    // Web access (specific actions, not just mentioning "web")
    'search the web', 'web search', 'scrape', 'crawl', 'fetch url', 'browse',
    'look up online', 'find online', 'google', 'search for',
    // Database operations (actual execution, not just writing SQL)
    'run query', 'execute sql', 'insert into', 'update table',
    'query the database', 'connect to database',
    // External service operations (sending/executing, not writing)
    'send email', 'send slack', 'send message', 'post to', 'publish to',
    'deploy', 'push to github', 'create pr', 'open issue', 'create ticket',
    'schedule meeting', 'add to calendar', 'set reminder',
    // File/system operations
    'upload file', 'download', 'read file from', 'scan repository',
    'monitor', 'check status', 'ping',
    // API calls
    'call api', 'hit endpoint', 'make request', 'webhook',
    // Specific tool mentions (these tools need MCP to operate)
    'figma', 'notion', 'jira', 'confluence', 'salesforce', 'hubspot',
    'stripe', 'shopify', 'zendesk', 'github', 'gitlab',
  ]

  for (const signal of mcpRequired) {
    if (lower.includes(signal)) return true
  }

  // Default: assume LLM can handle it (most tasks are generation/analysis)
  return false
}

function getNonMcpAlternative(workflowSlug: string): object | null {
  const alternatives: Record<string, object> = {
    'developer-workflow-code-management': {
      approach: 'direct_cli',
      example: 'gh issue list --repo owner/repo',
      when_to_prefer: 'Simple read-only queries where speed matters more than LLM reasoning',
      tradeoff: 'No LLM context about results, but 3-5x faster with no token overhead',
    },
    'data-analysis-reporting': {
      approach: 'direct_api',
      example: 'Direct SQL via psql or database client',
      when_to_prefer: 'Structured, deterministic queries where the schema is known',
      tradeoff: 'No natural language interface, but faster and cheaper for batch operations',
    },
    'research-competitive-intelligence': {
      approach: 'direct_api',
      example: 'curl https://api.example.com/search?q=query',
      when_to_prefer: 'Simple deterministic queries where speed matters more than reasoning',
      tradeoff: 'No LLM synthesis, but lower cost and predictable latency',
    },
    'it-devops-platform-operations': {
      approach: 'direct_cli',
      example: 'aws ec2 describe-instances --filters ...',
      when_to_prefer: 'Well-known CLI commands with predictable outputs',
      tradeoff: 'No intelligent interpretation, but zero token cost and sub-second latency',
    },
  }
  return alternatives[workflowSlug] || null
}

const TIER_DISPLAY_NAMES: Record<string, string> = {
  cheap_chat: 'Cheap Chat',
  cheap_structured: 'Cheap Structured',
  fast_code: 'Fast Code',
  creative_writing: 'Creative Writing',
  reasoning_pro: 'Reasoning Pro',
  tool_agent: 'Tool Agent',
  best_available: 'Best Available',
  flagship: 'Flagship',
}

/**
 * Build the rich recommended_model shape from a models-table row.
 * Used when the constraint filter winner overrides the legacy tier classifier.
 */
function rebuildRecommendedModel(row: any, effortLevel?: string): any {
  return {
    slug: row.id,
    display_name: row.display_name,
    provider: row.provider,
    provider_model_id: `${row.provider}/${row.id}`,
    input_cost_per_mtok: row.input_price_per_m,
    output_cost_per_mtok: row.output_price_per_m,
    tier: row.tier,
    tier_description: TIER_DISPLAY_NAMES[row.tier] || row.tier,
    reason: effortLevel
      ? `Required effort level: ${effortLevel}`
      : 'Matches constraints — best available for this task.',
  }
}

function filterByConstraints(candidates: any[], constraints: {
  data_residency?: string[]
  require_effort_level?: string
  exclude_workload_tags?: string[]
}): any[] {
  if (!constraints) return candidates

  return candidates.filter(model => {
    // Data residency
    if (constraints.data_residency && constraints.data_residency.length > 0) {
      const modelResidency = model.data_residency || 'global'
      if (!constraints.data_residency.includes(modelResidency)) return false
    }

    // Effort level pin
    if (constraints.require_effort_level) {
      if (!model.effort_levels?.includes(constraints.require_effort_level)) return false
    }

    // Workload exclusion
    if (constraints.exclude_workload_tags && constraints.exclude_workload_tags.length > 0) {
      const excluded: string[] = model.exclude_for_workloads || []
      const hasConflict = constraints.exclude_workload_tags.some((tag: string) =>
        excluded.includes(tag)
      )
      if (hasConflict) return false
    }

    return true
  })
}

function estimateEffectiveCostUsd(
  model: any,
  estimatedInputTokensBaseline: number,
  estimatedOutputTokensBaseline: number,
  options?: { usOnly?: boolean }
): {
  effective_input_tokens: number
  effective_output_tokens: number
  estimated_cost_usd: number
  sticker_cost_usd: number
  inflation_factor: number
  us_only_premium: number
} {
  const inflation = model.tokenizer_inflation_vs_baseline || 1.0
  const effectiveInput = Math.ceil(estimatedInputTokensBaseline * inflation)
  const effectiveOutput = Math.ceil(estimatedOutputTokensBaseline * inflation)

  const stickerCost =
    (estimatedInputTokensBaseline * (model.input_price_per_m || 0)) / 1_000_000 +
    (estimatedOutputTokensBaseline * (model.output_price_per_m || 0)) / 1_000_000

  let estimatedCost =
    (effectiveInput * (model.input_price_per_m || 0)) / 1_000_000 +
    (effectiveOutput * (model.output_price_per_m || 0)) / 1_000_000

  let usOnlyPremium = 0
  if (options?.usOnly && model.us_only_multiplier) {
    const premium = estimatedCost * (model.us_only_multiplier - 1)
    estimatedCost += premium
    usOnlyPremium = premium
  }

  return {
    effective_input_tokens: effectiveInput,
    effective_output_tokens: effectiveOutput,
    estimated_cost_usd: Number(estimatedCost.toFixed(6)),
    sticker_cost_usd: Number(stickerCost.toFixed(6)),
    inflation_factor: inflation,
    us_only_premium: Number(usOnlyPremium.toFixed(6)),
  }
}

async function trackRecommendation(supabase: any) {
  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const periodEnd = new Date(periodStart.getTime() + 24 * 60 * 60 * 1000)

  // Use maybeSingle + order + limit to avoid error when multiple rows exist for same period
  const { data: existing } = await supabase
    .from('telemetry_rate_tracking')
    .select('id, total_recommendations')
    .gte('period_start', periodStart.toISOString())
    .lt('period_end', periodEnd.toISOString())
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (existing) {
    await supabase.from('telemetry_rate_tracking')
      .update({ total_recommendations: existing.total_recommendations + 1 })
      .eq('id', existing.id)
  } else {
    await supabase.from('telemetry_rate_tracking').insert({
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      total_recommendations: 1,
      total_reported_runs: 0,
      telemetry_rate: 0,
    })
  }
}
