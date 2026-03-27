/**
 * LLM-based task classifier for intelligent routing.
 * Uses Gemini Flash Lite (~$0.00001 per call) to understand task context.
 *
 * Replaces keyword guessing with actual comprehension:
 * - "Search web for security vulnerabilities" → needs_tool: true (web search)
 * - "Write about security vulnerabilities" → needs_tool: false (writing task)
 *
 * Phase 1: LLM classifies every request
 * Phase 2: Log classifications, build training data
 * Phase 3: Train keyword system from logs, LLM only for ambiguous tasks
 */

export interface TaskClassification {
  needs_external_tool: boolean
  task_type: 'code' | 'writing' | 'creative_writing' | 'analysis' | 'structured' | 'translation' | 'general'
  complexity: 'simple' | 'medium' | 'complex'
  tool_category: string | null  // primary tool category (backward compat)
  tool_categories?: string[]    // all tool categories for multi-tool tasks
  is_multi_tool?: boolean       // true when task needs 2+ different tools
  reasoning: string
  method: 'llm' | 'keyword_fallback'
  // internal: set by routing engine
  _preferredSkill?: string
}

const CLASSIFICATION_PROMPT = `You are a task routing classifier for an AI agent system. Given a task description, classify it so we can route to the right model and tool.

Respond ONLY with valid JSON, no other text:

{
  "needs_external_tool": boolean,
  "task_type": "code" | "writing" | "creative_writing" | "analysis" | "structured" | "translation" | "general",
  "complexity": "simple" | "medium" | "complex",
  "tool_category": string | null,
  "tool_categories": string[],
  "is_multi_tool": boolean,
  "reasoning": "one sentence why"
}

MULTI-TOOL DETECTION:
- is_multi_tool = true when the task explicitly requires 2+ DIFFERENT external tools
- "Send Slack AND update Jira AND email client" → is_multi_tool: true, tool_categories: ["messaging", "code_repo", "email"]
- "Search the web and summarize the results" → is_multi_tool: false (summarize is LLM, not a tool)
- "Scrape this page and store results in database" → is_multi_tool: true, tool_categories: ["web_fetch", "database"]
- When is_multi_tool is false, tool_categories should contain at most 1 item (same as tool_category)
- When is_multi_tool is true, tool_category should be the FIRST/primary tool to use

CRITICAL RULES for needs_external_tool:
- true ONLY if the task REQUIRES real-time access to an external system to complete
- "Search the web for X" = TRUE (needs live web access)
- "Fetch/summarize a URL like https://..." = TRUE (needs to retrieve a web page)
- "What is the current price of X" = TRUE (needs live data)
- "What did X announce yesterday" = TRUE (needs recent news)
- "Send a Slack message" = TRUE (needs Slack API)
- "Schedule a meeting" = TRUE (needs calendar API)
- "Deploy to production" = TRUE (needs deployment system)
- "What is 87423 * 99231" = TRUE (precise arithmetic needs calculator tool)
- "Write ABOUT Slack messages" = FALSE (just generating text)
- "Draft an email" = FALSE (generating text, not sending)
- "Create a project plan" = FALSE (generating text, not booking calendar)
- "Write a troubleshooting guide" = FALSE (generating text from knowledge)
- "Analyze pros and cons of databases" = FALSE (reasoning from knowledge)
- "Explain the difference between X and Y" = FALSE (reasoning from knowledge)
- "Create a competitive analysis" = FALSE (reasoning from knowledge, unless explicitly asking to research live data)
- "Parse JSON data" = FALSE (text processing, no external system needed)
- "Summarize this article" or "Summarize this 5000-word article" = FALSE (content is provided by user, not fetched)
- "Write a Python script to scrape X" = FALSE (writing CODE that scrapes, not actually scraping)

IMPORTANT distinction:
- "Scrape this website" = TRUE (needs web_fetch tool to actually scrape)
- "Write a script to scrape a website" = FALSE (writing code, task_type = "code")
- "Summarize https://example.com" = TRUE (needs web_fetch to retrieve the URL)
- "Summarize this article about climate change" = FALSE (article is provided by user)

task_type rules:
- "code" = writing/reviewing/debugging code, SQL queries, regex, unit tests, any programming. INCLUDES "write a script to do X" even if X involves web/API/DB — the task is writing code.
- "writing" = replies, messages, basic emails, explanations, guides, agendas, outlines, troubleshooting docs
- "creative_writing" = ONLY high-stakes persuasive content: sales pitches, cold outreach to executives, marketing campaigns, ad copy. NOT simple blog outlines or LinkedIn updates.
- "analysis" = comparing options, evaluating tradeoffs, pros/cons, decision matrices, architectural decisions, financial modeling, mathematical derivations
- "structured" = JSON schemas, CSV templates, data parsing/extraction, format conversion
- "translation" = simple, direct translation between human languages. If the task also requires analysis (e.g., "translate then compare", "translate and identify what was lost", "back-translate and analyze differences"), classify as "analysis" not "translation"
- "general" = anything else

complexity rules:
- "simple" = single-step, straightforward task (basic email, simple function, template, translation, short message, trivial question like "What is the capital of France?", trick questions like "pound of feathers vs pound of steel")
- "medium" = requires domain knowledge or multi-part output (technical guide, code review, project plan, multi-step code)
- "complex" = ANY of these: mathematical derivation or proof, financial modeling (DCF, Black-Scholes), self-critique or self-evaluation ("then critique your own answer"), multi-domain reasoning (combining finance + tech + strategy), comprehensive strategy or whitepaper, multi-step logic puzzles with constraints, tasks requiring expert-level judgment

tool_category (ONLY if needs_external_tool is true):
- "web_search" = searching the internet for information or recent events
- "web_fetch" = retrieving/scraping a specific URL or web page
- "calculation" = precise arithmetic that LLMs get wrong (large numbers, financial calculations)
- "email" = sending emails via Gmail/SendGrid/etc
- "messaging" = sending messages via Slack/Discord/Teams
- "database" = querying a live database
- "calendar" = scheduling/managing calendar events
- "deployment" = deploying code, CI/CD operations
- "code_repo" = GitHub/GitLab operations (PRs, issues, commits)
- "ticketing" = project management / issue tracking (Jira, Linear, Asana, Trello, updating tickets)
- "crm" = CRM operations (Salesforce, HubSpot)
- "cms" = content management (WordPress, Ghost)
- "security_scan" = vulnerability scanning, security audits of live systems
- null if needs_external_tool is false

Task: `

/**
 * Classify a task using Gemini Flash Lite via OpenRouter.
 * Cost: ~$0.00001 per call (50 input tokens + 50 output tokens at $0.075/1M)
 * Latency: ~200-500ms
 */
export async function classifyTask(task: string): Promise<TaskClassification> {
  const openrouterKey = process.env.OPENROUTER_API_KEY

  if (!openrouterKey) {
    return keywordFallback(task)
  }

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://toolroute.io',
        'X-Title': 'ToolRoute Task Classifier',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-lite-001',
        messages: [
          { role: 'user', content: CLASSIFICATION_PROMPT + task }
        ],
        max_tokens: 200,
        temperature: 0,
      }),
    })

    if (!res.ok) {
      return keywordFallback(task)
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content?.trim()

    if (!content) {
      return keywordFallback(task)
    }

    // Parse JSON from response (handle markdown code blocks)
    const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(jsonStr)

    return {
      needs_external_tool: Boolean(parsed.needs_external_tool),
      task_type: parsed.task_type || 'general',
      complexity: parsed.complexity || 'medium',
      tool_category: parsed.tool_category || null,
      tool_categories: Array.isArray(parsed.tool_categories) ? parsed.tool_categories : (parsed.tool_category ? [parsed.tool_category] : []),
      is_multi_tool: Boolean(parsed.is_multi_tool),
      reasoning: parsed.reasoning || '',
      method: 'llm',
    }
  } catch {
    return keywordFallback(task)
  }
}

/**
 * Simple keyword fallback when LLM is unavailable.
 * This is the old detection logic, kept as safety net.
 */
function keywordFallback(task: string): TaskClassification {
  const lower = task.toLowerCase()

  // Check if it needs external tools
  const toolSignals = [
    'search the web', 'web search', 'scrape', 'crawl', 'fetch url',
    'send email', 'send slack', 'send message', 'post to', 'publish to',
    'deploy', 'push to github', 'create pr', 'schedule meeting',
    'call api', 'upload file', 'download',
  ]
  const needs_external_tool = toolSignals.some(s => lower.includes(s))

  // Determine task type
  let task_type: TaskClassification['task_type'] = 'general'
  if (/\b(code|function|class|python|javascript|sql|regex|debug|refactor|unit test)\b/.test(lower)) {
    task_type = 'code'
  } else if (/\b(cold email|outreach|blog post|linkedin|marketing copy|pitch|proposal|compelling|persuasive)\b/.test(lower)) {
    task_type = 'creative_writing'
  } else if (/\b(translate|translation|italian|spanish|french|german|chinese|japanese)\b/.test(lower)) {
    task_type = 'translation'
  } else if (/\b(json|csv|schema|parse|extract|template|structured)\b/.test(lower)) {
    task_type = 'structured'
  } else if (/\b(compare|pros and cons|analysis|evaluate|decision matrix|tradeoff)\b/.test(lower)) {
    task_type = 'analysis'
  } else if (/\b(write|draft|compose|explain|reply|message|guide|agenda)\b/.test(lower)) {
    task_type = 'writing'
  }

  // Determine complexity
  let complexity: TaskClassification['complexity'] = 'simple'
  if (/\b(complex|multi-step|comprehensive|deep|strategy|architect)\b/.test(lower)) {
    complexity = 'complex'
  } else if (/\b(analysis|compare|evaluate|plan|review)\b/.test(lower)) {
    complexity = 'medium'
  }

  // Determine tool category
  let tool_category: string | null = null
  if (needs_external_tool) {
    if (/search the web|web search|scrape|crawl/.test(lower)) tool_category = 'web_search'
    else if (/send email|gmail/.test(lower)) tool_category = 'email'
    else if (/send slack|send message|discord/.test(lower)) tool_category = 'messaging'
    else if (/deploy|push to github|create pr/.test(lower)) tool_category = 'code_repo'
    else if (/schedule meeting|calendar/.test(lower)) tool_category = 'calendar'
    else tool_category = 'general'
  }

  return {
    needs_external_tool,
    task_type,
    complexity,
    tool_category,
    reasoning: 'Classified via keyword fallback (LLM unavailable)',
    method: 'keyword_fallback',
  }
}

/**
 * Map task classification to model tier, respecting agent's routing priority.
 *
 * Priority modes:
 *   lowest_cost    → always cheapest model, even for creative tasks
 *   best_value     → creative_writing only for complex creative (proposals, campaigns)
 *   highest_quality → creative_writing for ALL writing, reasoning_pro for analysis
 */
export type RoutingPriority = 'lowest_cost' | 'best_value' | 'highest_quality'

export function classificationToModelTier(
  c: TaskClassification,
  priority: RoutingPriority = 'best_value'
): string {
  if (c.needs_external_tool) return 'tool_agent'

  // lowest_cost: always use cheapest tier regardless of task type
  if (priority === 'lowest_cost') {
    switch (c.task_type) {
      case 'code': return 'fast_code'  // DeepSeek V3 is already cheap ($0.14)
      case 'structured': return 'cheap_structured'
      default: return 'cheap_chat'
    }
  }

  // highest_quality: premium models for all writing + analysis
  if (priority === 'highest_quality') {
    switch (c.task_type) {
      case 'code': return 'fast_code'
      case 'creative_writing': return 'creative_writing'
      case 'writing': return c.complexity === 'complex' ? 'reasoning_pro' : 'creative_writing'
      case 'analysis': return 'reasoning_pro'
      case 'structured': return 'cheap_structured'
      case 'translation': return 'cheap_chat'
      case 'general': return 'cheap_chat'
      default: return 'cheap_chat'
    }
  }

  // best_value (default): balance quality and cost
  switch (c.task_type) {
    case 'code': return 'fast_code'
    case 'creative_writing': return c.complexity === 'complex' ? 'creative_writing' : 'cheap_chat'
    case 'structured': return 'cheap_structured'
    case 'translation': return 'cheap_chat'
    case 'writing': return c.complexity === 'complex' ? 'reasoning_pro' : 'cheap_chat'
    case 'analysis': return c.complexity !== 'simple' ? 'reasoning_pro' : 'cheap_chat'
    case 'general': return 'cheap_chat'
    default: return 'cheap_chat'
  }
}

/**
 * Map tool_category to workflow slug for MCP server selection.
 */
export function toolCategoryToWorkflow(toolCategory: string | null): string {
  const map: Record<string, string> = {
    'web_search': 'research-competitive-intelligence',
    'web_fetch': 'research-competitive-intelligence',
    // 'calculation' intentionally omitted — handled as direct_llm with code model
    'email': 'communication-email',
    'messaging': 'communication-messaging',
    'database': 'data-analysis-reporting',
    'calendar': 'executive-assistant-productivity',
    'deployment': 'it-devops-platform-operations',
    'code_repo': 'developer-workflow-code-management',
    'ticketing': 'developer-workflow-code-management',
    'file_ops': 'document-processing-summarization',
    'crm': 'sales-research-outreach',
    'cms': 'content-creation-publishing',
    'security_scan': 'security-operations',
  }
  return map[toolCategory || ''] || 'general'
}
/**
 * Best skill for each tool category — used for both single-tool and multi-tool routing.
 */
export const TOOL_CATEGORY_SKILL_PREFERENCE: Record<string, { slug: string; name: string }> = {
  'web_fetch': { slug: 'firecrawl-mcp', name: 'Firecrawl MCP' },
  'web_search': { slug: 'exa-mcp-server', name: 'Exa MCP Server' },
  'email': { slug: 'gmail-mcp', name: 'Gmail MCP Server' },
  'messaging': { slug: 'slack-mcp', name: 'Slack MCP Server' },
  'calendar': { slug: 'google-calendar-mcp', name: 'Google Calendar MCP' },
  'code_repo': { slug: 'github-mcp-server', name: 'GitHub MCP Server' },
  'ticketing': { slug: 'atlassian-mcp', name: 'Atlassian MCP' },
  'database': { slug: 'supabase-mcp', name: 'Supabase MCP' },
  'security_scan': { slug: 'snyk-mcp', name: 'Snyk MCP' },
  'crm': { slug: 'hubspot-mcp', name: 'HubSpot MCP' },
  'cms': { slug: 'wordpress-mcp', name: 'WordPress MCP' },
  'deployment': { slug: 'vercel-mcp', name: 'Vercel MCP' },
}

/**
 * Build an orchestration chain for multi-tool tasks.
 */
export function buildOrchestrationChain(
  toolCategories: string[],
  task: string
): { step: number; tool_category: string; recommended_skill: string; skill_name: string; action: string }[] {
  return toolCategories.map((cat, idx) => {
    const skill = TOOL_CATEGORY_SKILL_PREFERENCE[cat]
    return {
      step: idx + 1,
      tool_category: cat,
      recommended_skill: skill?.slug || 'unknown',
      skill_name: skill?.name || cat,
      action: `Step ${idx + 1}: ${cat.replace(/_/g, ' ')} operation`,
    }
  })
}
// env update
