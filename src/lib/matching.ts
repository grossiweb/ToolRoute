/**
 * Shared task → workflow matching logic
 * Single source of truth — used by both /api/route and /api/mcp
 *
 * All 17 workflows from the database are represented here.
 * Keywords are scored by length (longer = more specific = higher weight).
 */

export const TASK_WORKFLOW_MAP: Record<string, string[]> = {
  'research-competitive-intelligence': [
    'research', 'scrape', 'crawl', 'extract', 'competitor', 'pricing',
    'web search', 'find information', 'look up', 'gather data', 'source finding',
    'competitive intelligence', 'market research', 'search the web',
    'find articles', 'search online', 'web scraping', 'data extraction',
  ],
  'developer-workflow-code-management': [
    'code', 'repository', 'repo', 'pull request', 'pr', 'commit', 'branch',
    'github', 'gitlab', 'codebase', 'refactor', 'debug', 'deploy', 'ci/cd',
    'code review', 'merge', 'lint', 'build', 'compile', 'software development',
    'programming', 'version control', 'bitbucket',
  ],
  'qa-testing-automation': [
    'browser', 'navigate', 'click', 'fill form', 'screenshot', 'test',
    'automate', 'playwright', 'selenium', 'e2e', 'end-to-end',
    'browser automation', 'web testing', 'ui test', 'integration test',
    'headless browser', 'web interaction', 'form submission',
  ],
  'data-analysis-reporting': [
    'database', 'sql', 'query', 'bigquery', 'postgres', 'analytics',
    'report', 'data analysis', 'dashboard', 'chart', 'aggregate',
    'csv', 'dataset', 'data processing', 'parse data', 'analyze data',
    'snowflake', 'duckdb', 'metrics', 'visualization', 'spreadsheet',
    'parquet', 'json data', 'tabular', 'statistics',
  ],
  'sales-research-outreach': [
    'prospect', 'lead', 'crm', 'salesforce', 'hubspot', 'enrich',
    'outreach', 'pipeline', 'sales', 'contact', 'company data',
    'lead generation', 'prospecting', 'sales intelligence', 'deal',
    'opportunity', 'pipedrive', 'freshsales',
  ],
  'content-creation-publishing': [
    'blog', 'article', 'publish', 'cms', 'seo',
    'editorial', 'wordpress', 'medium', 'ghost', 'contentful',
    'create content', 'write article', 'blog post', 'publish content',
    'content management', 'sanity',
  ],
  'customer-support-automation': [
    'support', 'ticket', 'triage', 'helpdesk',
    'customer service', 'escalation', 'incident',
    'zendesk', 'intercom', 'freshdesk', 'customer complaint',
    'support ticket', 'bug report', 'issue tracking',
  ],
  'knowledge-management': [
    'notion', 'confluence', 'wiki', 'knowledge base', 'documentation',
    'docs', 'notes', 'workspace', 'obsidian', 'second brain',
    'note-taking', 'document organization', 'readme',
  ],
  'design-to-code-workflow': [
    'figma', 'design', 'ui component', 'layout', 'mockup',
    'wireframe', 'prototype', 'design system', 'storybook',
    'tailwind', 'css', 'frontend design', 'visual design',
    'framer', 'v0',
  ],
  'it-devops-platform-operations': [
    'aws', 'cloud', 'infrastructure', 'devops', 'monitor',
    'kubernetes', 'docker', 'terraform', 'serverless',
    'cloudflare', 'vercel deploy', 'platform operations',
    'datadog', 'grafana', 'pagerduty', 'incident response',
    'container', 'orchestration', 'lambda', 'gcp', 'azure',
  ],
  'marketing-intelligence-campaign-management': [
    'marketing', 'campaign', 'email marketing', 'newsletter',
    'mailchimp', 'sendgrid', 'google ads', 'advertising',
    'semrush', 'seo analysis', 'marketing automation',
    'ad campaign', 'audience', 'conversion', 'landing page',
    'a/b test marketing', 'marketing analytics',
  ],
  'finance-accounting-automation': [
    'invoice', 'payment', 'accounting', 'stripe', 'quickbooks',
    'plaid', 'financial', 'transaction', 'billing', 'expense',
    'revenue', 'tax', 'bookkeeping', 'payroll', 'xero',
    'financial report', 'bank', 'reconciliation',
  ],
  'legal-research-document-management': [
    'legal', 'contract', 'compliance', 'docusign', 'nda',
    'agreement', 'legal research', 'court', 'regulation',
    'terms of service', 'privacy policy', 'intellectual property',
    'trademark', 'patent', 'legal document', 'e-signature',
  ],
  'hr-recruiting-automation': [
    'recruit', 'hiring', 'candidate', 'resume', 'interview',
    'greenhouse', 'lever', 'bamboohr', 'onboarding',
    'job posting', 'applicant', 'talent', 'hr',
    'employee', 'performance review', 'human resources',
  ],
  'ecommerce-operations': [
    'shopify', 'woocommerce', 'amazon seller', 'ecommerce',
    'product listing', 'inventory', 'order', 'fulfillment',
    'catalog', 'shopping cart', 'checkout', 'online store',
    'product management', 'shipping', 'returns',
  ],
  'security-operations': [
    'security', 'vulnerability', 'snyk', 'sonarqube', 'trivy',
    'penetration test', 'security scan', 'audit', 'compliance check',
    'threat', 'cve', 'patch', 'security assessment',
    'code scanning', 'dependency check',
  ],
  'executive-assistant-productivity': [
    'email', 'calendar', 'schedule', 'meeting', 'reminder',
    'slack', 'message', 'chat', 'teams', 'discord',
    'gmail', 'send email', 'draft email', 'compose email',
    'schedule meeting', 'book meeting', 'google calendar',
    'todoist', 'task list', 'to-do', 'organize',
    'zoom', 'video call', 'notification', 'communicate',
    'send message', 'post message', 'reply', 'forward',
    'social', 'forum', 'comment', 'discussion',
    'twilio', 'sms', 'text message', 'phone call',
    'calendly', 'appointment', 'booking',
    'summarize', 'summary', 'pdf', 'document',
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
