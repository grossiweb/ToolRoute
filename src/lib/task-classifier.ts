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
  tool_category: string | null  // only if needs_external_tool: true
  reasoning: string
  method: 'llm' | 'keyword_fallback'
}

const CLASSIFICATION_PROMPT = `You are a task routing classifier. Given a task description, classify it for an AI agent routing system.

Respond ONLY with valid JSON, no other text:

{
  "needs_external_tool": boolean,
  "task_type": "code" | "writing" | "creative_writing" | "analysis" | "structured" | "translation" | "general",
  "complexity": "simple" | "medium" | "complex",
  "tool_category": string | null,
  "reasoning": "one sentence why"
}

Rules:
- needs_external_tool = true ONLY if the task requires accessing an external system (web search, sending email/messages, database queries, file operations, API calls, calendar operations, deployment). Writing ABOUT these topics does NOT need a tool.
- task_type:
  - "code" = writing/reviewing/debugging code, SQL queries, regex, unit tests
  - "writing" = simple text like replies, messages, basic emails, explanations
  - "creative_writing" = persuasive/marketing content: cold outreach, blog posts, LinkedIn posts, proposals, ad copy, pitches
  - "analysis" = comparing options, evaluating tradeoffs, decision matrices, competitive analysis
  - "structured" = JSON schemas, CSV templates, data parsing, format conversion
  - "translation" = language translation
  - "general" = anything else
- complexity: "simple" = straightforward, "medium" = needs some thought, "complex" = multi-step reasoning
- tool_category: if needs_external_tool, specify which: "web_search", "email", "messaging", "database", "calendar", "deployment", "file_ops", "code_repo", "crm", "cms", "security_scan". null if no tool needed.

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
        max_tokens: 150,
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
 * Map task classification to model tier.
 */
export function classificationToModelTier(c: TaskClassification): string {
  if (c.needs_external_tool) return 'tool_agent'

  switch (c.task_type) {
    case 'code': return 'fast_code'
    case 'creative_writing': return 'creative_writing'
    case 'structured': return 'cheap_structured'
    case 'translation': return 'cheap_chat'
    case 'writing': return c.complexity === 'complex' ? 'reasoning_pro' : 'cheap_chat'
    case 'analysis': return c.complexity === 'complex' ? 'reasoning_pro' : 'cheap_chat'
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
    'email': 'communication-email',
    'messaging': 'communication-messaging',
    'database': 'data-analysis-reporting',
    'calendar': 'executive-assistant-productivity',
    'deployment': 'it-devops-platform-operations',
    'code_repo': 'developer-workflow-code-management',
    'file_ops': 'document-processing-summarization',
    'crm': 'sales-research-outreach',
    'cms': 'content-creation-publishing',
    'security_scan': 'security-operations',
  }
  return map[toolCategory || ''] || 'general'
}
// env update
