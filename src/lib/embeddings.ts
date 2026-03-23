/**
 * Lightweight embedding-based semantic matching for task routing.
 * Uses OpenAI text-embedding-3-small for cost efficiency.
 * Falls back to keyword matching when OPENAI_API_KEY is not set.
 */

// Pre-computed workflow descriptions for embedding comparison
// All 17 workflows from the database are represented here.
const WORKFLOW_DESCRIPTIONS: Record<string, string> = {
  'research-competitive-intelligence': 'Research competitors, scrape websites, crawl web pages, extract data from URLs, gather competitive intelligence, web search, find pricing information, search the internet, look up information online',
  'developer-workflow-code-management': 'Write code, manage git repositories, create pull requests, review code, refactor, debug, deploy, continuous integration, GitHub GitLab operations, software development, programming, version control',
  'qa-testing-automation': 'Browser automation, navigate web pages, click buttons, fill forms, take screenshots, end-to-end testing, Playwright, Selenium, test automation, headless browser, web interaction',
  'data-analysis-reporting': 'Query databases, run SQL, BigQuery, PostgreSQL, Snowflake, DuckDB analytics, generate reports, data analysis, create dashboards, aggregate data, parse CSV files, analyze datasets, data processing, spreadsheet operations, statistics',
  'sales-research-outreach': 'Find prospects, enrich leads, CRM operations, Salesforce, HubSpot, Pipedrive, sales outreach, pipeline management, contact research, lead generation, deal tracking',
  'content-creation-publishing': 'Write blog posts, create articles, publish content, CMS operations, WordPress, Medium, Ghost, Contentful, SEO optimization, editorial workflow, content management',
  'customer-support-automation': 'Handle support tickets, triage issues, Jira operations, Zendesk, Intercom, Freshdesk, helpdesk automation, customer service, incident management, escalation, bug reports',
  'knowledge-management': 'Notion operations, Confluence, wiki management, knowledge base, documentation, workspace organization, note-taking, Obsidian, README, document organization',
  'design-to-code-workflow': 'Figma designs, UI components, layout implementation, mockup to code, wireframe conversion, design system, prototype, Storybook, Tailwind CSS, frontend visual design, Framer',
  'it-devops-platform-operations': 'AWS cloud, infrastructure management, DevOps, deployment, monitoring, Kubernetes, Docker, Terraform, Cloudflare, Vercel, Datadog, Grafana, PagerDuty, platform operations, containers, serverless, Lambda',
  'marketing-intelligence-campaign-management': 'Marketing campaigns, email marketing, newsletters, Mailchimp, SendGrid, Google Ads, advertising, SEMrush, SEO analysis, marketing automation, audience targeting, conversion optimization, ad campaigns, landing pages',
  'finance-accounting-automation': 'Invoices, payments, accounting, Stripe, QuickBooks, Plaid, financial transactions, billing, expenses, revenue tracking, tax, bookkeeping, payroll, Xero, bank reconciliation, financial reports',
  'legal-research-document-management': 'Legal contracts, compliance, DocuSign, NDA, agreements, legal research, court records, regulations, terms of service, privacy policy, intellectual property, e-signatures, legal documents',
  'hr-recruiting-automation': 'Recruiting, hiring, candidates, resumes, interviews, Greenhouse, Lever, BambooHR, onboarding, job postings, applicant tracking, talent acquisition, HR management, performance reviews',
  'ecommerce-operations': 'Shopify, WooCommerce, Amazon seller, ecommerce, product listings, inventory management, order fulfillment, shopping cart, checkout, online store, product catalog, shipping, returns',
  'security-operations': 'Security scanning, vulnerability detection, Snyk, SonarQube, Trivy, penetration testing, security audits, compliance checks, threat detection, CVE, patching, code scanning, dependency checks',
  'executive-assistant-productivity': 'Send email, draft email, compose messages, schedule meetings, calendar management, Google Calendar, Gmail, Slack messages, Discord, Microsoft Teams, Zoom calls, reminders, task management, Todoist, Calendly, appointments, SMS, Twilio, phone calls, notifications, forum comments, social media posting, summarize documents, PDF summaries, meeting notes, communication, messaging',
}

// Cache for workflow embeddings (computed once per cold start, reused)
// Cache invalidates on deploy (new serverless instance)
let workflowEmbeddingsCache: Map<string, number[]> | null = null

async function getEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
      }),
    })

    if (!res.ok) return null

    const data = await res.json()
    return data.data?.[0]?.embedding ?? null
  } catch {
    return null
  }
}

async function getWorkflowEmbeddings(): Promise<Map<string, number[]>> {
  if (workflowEmbeddingsCache) return workflowEmbeddingsCache

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return new Map()

  try {
    const texts = Object.values(WORKFLOW_DESCRIPTIONS)
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: texts,
      }),
    })

    if (!res.ok) return new Map()

    const data = await res.json()
    const embeddings = data.data as Array<{ embedding: number[]; index: number }>

    const cache = new Map<string, number[]>()
    const slugs = Object.keys(WORKFLOW_DESCRIPTIONS)
    for (const item of embeddings) {
      cache.set(slugs[item.index], item.embedding)
    }

    workflowEmbeddingsCache = cache
    return cache
  } catch {
    return new Map()
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

export interface SemanticMatch {
  workflow: string
  similarity: number
  method: 'semantic' | 'keyword'
}

/**
 * Match a natural-language task to the best workflow using embeddings.
 * Returns the best match with similarity score and method used.
 */
export async function semanticMatchWorkflow(task: string): Promise<SemanticMatch> {
  const taskEmbedding = await getEmbedding(task)

  if (!taskEmbedding) {
    // Fall back to keyword matching
    return { workflow: '', similarity: 0, method: 'keyword' }
  }

  const workflowEmbeddings = await getWorkflowEmbeddings()

  if (workflowEmbeddings.size === 0) {
    return { workflow: '', similarity: 0, method: 'keyword' }
  }

  let bestWorkflow = ''
  let bestSimilarity = -1

  for (const [slug, embedding] of Array.from(workflowEmbeddings.entries())) {
    const sim = cosineSimilarity(taskEmbedding, embedding)
    if (sim > bestSimilarity) {
      bestSimilarity = sim
      bestWorkflow = slug
    }
  }

  return {
    workflow: bestWorkflow,
    similarity: Math.round(bestSimilarity * 1000) / 1000,
    method: 'semantic',
  }
}

/**
 * Get similarity scores for ALL workflows (for multi-workflow routing)
 */
export async function getWorkflowSimilarities(task: string): Promise<Array<{ workflow: string; similarity: number }>> {
  const taskEmbedding = await getEmbedding(task)

  if (!taskEmbedding) return []

  const workflowEmbeddings = await getWorkflowEmbeddings()

  const results: Array<{ workflow: string; similarity: number }> = []

  for (const [slug, embedding] of Array.from(workflowEmbeddings.entries())) {
    results.push({
      workflow: slug,
      similarity: Math.round(cosineSimilarity(taskEmbedding, embedding) * 1000) / 1000,
    })
  }

  return results.sort((a, b) => b.similarity - a.similarity)
}
