/**
 * Shared task → workflow matching logic
 * Single source of truth — used by both /api/route and /api/mcp
 *
 * All 21 workflows from the database are represented here.
 * Keywords are scored by length (longer = more specific = higher weight).
 */

export const TASK_WORKFLOW_MAP: Record<string, string[]> = {
  'research-competitive-intelligence': [
    'scrape website', 'crawl website', 'competitor analysis', 'competitor pricing',
    'web search', 'find information online', 'look up online', 'gather data from web',
    'competitive intelligence', 'market research', 'search the web',
    'find articles online', 'search online', 'web scraping', 'data extraction from web',
    'research report', 'industry research',
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
    'query database', 'run sql', 'bigquery', 'postgres query', 'analytics dashboard',
    'data analysis report', 'dashboard', 'chart data', 'aggregate data',
    'csv data', 'dataset analysis', 'data processing pipeline', 'parse data',
    'snowflake', 'duckdb', 'data visualization', 'spreadsheet analysis',
    'parquet', 'tabular data', 'statistical analysis', 'analyze dataset',
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
    'marketing campaign', 'run campaign', 'email marketing', 'newsletter campaign',
    'mailchimp', 'google ads', 'advertising campaign',
    'semrush', 'seo analysis', 'marketing automation',
    'ad campaign', 'audience targeting', 'conversion tracking', 'landing page optimization',
    'a/b test marketing', 'marketing analytics', 'campaign performance',
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
    'security scan', 'vulnerability scan', 'snyk', 'sonarqube', 'trivy',
    'penetration test', 'security audit', 'compliance check',
    'cve', 'patch vulnerability', 'security assessment',
    'code scanning', 'dependency check', 'run security', 'scan for vulnerabilities',
  ],
  'communication-email': [
    'gmail', 'send email', 'draft email', 'compose email',
    'inbox', 'sendgrid', 'forward email', 'reply email',
    'email triage', 'email draft', 'cold email',
    'email outreach', 'mailbox', 'read email', 'check email',
  ],
  'communication-messaging': [
    'slack', 'discord', 'teams', 'message', 'chat',
    'send message', 'post message', 'dm', 'direct message',
    'channel', 'twilio', 'sms', 'text message',
    'phone call', 'notification', 'communicate',
    'microsoft teams', 'group chat',
  ],
  'social-forum-engagement': [
    'post on forum', 'forum thread',
    'discussion forum', 'community forum', 'social media post', 'engage on social',
    'write a comment on forum', 'forum post', 'social media post',
    'online community', 'reply to forum thread', 'post on social media',
  ],
  'document-processing-summarization': [
    'summarize document', 'summary of document', 'pdf', 'meeting notes',
    'extract text from', 'parse document', 'transcript',
    'read pdf', 'pdf extraction',
    'document analysis', 'text extraction from', 'digest document',
    'note taking', 'action items from meeting',
  ],
  'executive-assistant-productivity': [
    'calendar', 'schedule', 'meeting', 'reminder',
    'schedule meeting', 'book meeting', 'google calendar',
    'todoist', 'task list', 'to-do', 'organize',
    'zoom', 'video call', 'calendly', 'appointment', 'booking',
    'agenda', 'planner', 'time management',
  ],
}

/**
 * Match a natural-language task to a workflow slug using keyword scoring.
 * Longer keyword matches are weighted higher (more specific).
 */
export function matchWorkflowFromTask(task: string): string {
  if (!task) return 'general'
  const lower = task.toLowerCase()

  let bestMatch = 'general'
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
