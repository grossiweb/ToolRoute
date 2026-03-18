/**
 * Shared task → workflow matching logic
 * Single source of truth — used by both /api/route and /api/mcp
 */

export const TASK_WORKFLOW_MAP: Record<string, string[]> = {
  'research-competitive-intelligence': [
    'research', 'scrape', 'crawl', 'extract', 'competitor', 'pricing',
    'web search', 'find information', 'look up', 'gather data', 'source finding',
  ],
  'developer-workflow-code-management': [
    'code', 'repository', 'repo', 'pull request', 'pr', 'commit', 'branch',
    'github', 'codebase', 'refactor', 'debug', 'deploy', 'ci/cd',
  ],
  'qa-testing-automation': [
    'browser', 'navigate', 'click', 'fill form', 'screenshot', 'test',
    'automate', 'playwright', 'selenium', 'e2e', 'end-to-end',
  ],
  'data-analysis-reporting': [
    'database', 'sql', 'query', 'bigquery', 'postgres', 'analytics',
    'report', 'data analysis', 'dashboard', 'chart', 'aggregate',
  ],
  'sales-research-outreach': [
    'prospect', 'lead', 'crm', 'salesforce', 'hubspot', 'enrich',
    'outreach', 'pipeline', 'sales', 'contact', 'company data',
  ],
  'content-creation-publishing': [
    'content', 'blog', 'article', 'publish', 'cms', 'seo',
    'write', 'draft', 'editorial', 'social media',
  ],
  'customer-support-automation': [
    'support', 'ticket', 'triage', 'issue', 'jira', 'helpdesk',
    'customer', 'escalation', 'incident',
  ],
  'knowledge-management': [
    'notion', 'confluence', 'wiki', 'knowledge base', 'documentation',
    'docs', 'notes', 'workspace',
  ],
  'design-to-code-workflow': [
    'figma', 'design', 'ui', 'component', 'layout', 'mockup',
    'wireframe', 'prototype',
  ],
  'it-devops-platform-operations': [
    'aws', 'cloud', 'infrastructure', 'devops', 'deploy', 'monitor',
    'kubernetes', 'docker', 'terraform',
  ],
}

/**
 * Match a natural-language task to a workflow slug using keyword scoring.
 * Longer keyword matches are weighted higher (more specific).
 */
export function matchWorkflowFromTask(task: string): string {
  if (!task) return 'research-competitive-intelligence'
  const lower = task.toLowerCase()

  let bestMatch = 'research-competitive-intelligence'
  let bestScore = 0

  for (const [workflow, keywords] of Object.entries(TASK_WORKFLOW_MAP)) {
    let score = 0
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        score += kw.length // longer keyword matches are more specific
      }
    }
    if (score > bestScore) {
      bestScore = score
      bestMatch = workflow
    }
  }

  return bestMatch
}

/**
 * Calculate task-to-workflow match confidence based on keyword hits.
 */
export function calcTaskConfidence(task: string, resolvedWorkflow: string): number {
  if (!task) return 0.5
  const lower = task.toLowerCase()
  const keywords = TASK_WORKFLOW_MAP[resolvedWorkflow] || []

  let matchedKeywords = 0
  for (const kw of keywords) {
    if (lower.includes(kw)) matchedKeywords++
  }

  // Base confidence from keyword matches, capped at 0.92
  const keywordConfidence = Math.min(0.92, 0.5 + (matchedKeywords * 0.1))
  return Math.round(keywordConfidence * 100) / 100
}
