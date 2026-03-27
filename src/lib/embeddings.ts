/**
 * Lightweight embedding-based semantic matching for task routing.
 * Uses OpenAI text-embedding-3-small for cost efficiency.
 * Falls back to keyword matching when OPENAI_API_KEY is not set.
 */

// Pre-computed workflow descriptions for embedding comparison
// All 21 workflows from the database are represented here.
const WORKFLOW_DESCRIPTIONS: Record<string, string> = {
  'research-competitive-intelligence': 'Scrape a competitor website, crawl web pages to extract data from URLs, competitive intelligence gathering from the internet, web search for information, find pricing data online, search the internet for articles',
  'developer-workflow-code-management': 'Write code, manage git repositories, create pull requests, review code, refactor, debug, deploy, continuous integration, GitHub GitLab operations, software development, programming, version control',
  'qa-testing-automation': 'Browser automation, navigate web pages, click buttons, fill forms, take screenshots, end-to-end testing, Playwright, Selenium, test automation, headless browser, web interaction',
  'data-analysis-reporting': 'Query databases, run SQL, BigQuery, PostgreSQL, Snowflake, DuckDB analytics, generate reports, data analysis, create dashboards, aggregate data, parse CSV files, analyze datasets, data processing, spreadsheet operations, statistics',
  'sales-research-outreach': 'Find prospects, enrich leads, CRM operations, Salesforce, HubSpot, Pipedrive, sales outreach, pipeline management, contact research, lead generation, deal tracking',
  'content-creation-publishing': 'Write blog posts, create articles, publish content, CMS operations, WordPress, Medium, Ghost, Contentful, SEO optimization, editorial workflow, content management',
  'customer-support-automation': 'Handle support tickets, triage issues, Jira operations, Zendesk, Intercom, Freshdesk, helpdesk automation, customer service, incident management, escalation, bug reports',
  'knowledge-management': 'Notion operations, Confluence, wiki management, knowledge base, documentation, workspace organization, note-taking, Obsidian, README, document organization',
  'design-to-code-workflow': 'Figma designs, UI components, layout implementation, mockup to code, wireframe conversion, design system, prototype, Storybook, Tailwind CSS, frontend visual design, Framer',
  'it-devops-platform-operations': 'AWS cloud, infrastructure management, DevOps, deployment, monitoring, Kubernetes, Docker, Terraform, Cloudflare, Vercel, Datadog, Grafana, PagerDuty, platform operations, containers, serverless, Lambda',
  'marketing-intelligence-campaign-management': 'Run a marketing campaign in Mailchimp or Google Ads, manage advertising campaigns, SEMrush SEO analysis, marketing automation workflows, A/B test ad campaigns, optimize landing page conversions, manage audience targeting',
  'finance-accounting-automation': 'Invoices, payments, accounting, Stripe, QuickBooks, Plaid, financial transactions, billing, expenses, revenue tracking, tax, bookkeeping, payroll, Xero, bank reconciliation, financial reports',
  'legal-research-document-management': 'Legal contracts, compliance, DocuSign, NDA, agreements, legal research, court records, regulations, terms of service, privacy policy, intellectual property, e-signatures, legal documents',
  'hr-recruiting-automation': 'Recruiting, hiring, candidates, resumes, interviews, Greenhouse, Lever, BambooHR, onboarding, job postings, applicant tracking, talent acquisition, HR management, performance reviews',
  'ecommerce-operations': 'Shopify, WooCommerce, Amazon seller, ecommerce, product listings, inventory management, order fulfillment, shopping cart, checkout, online store, product catalog, shipping, returns',
  'security-operations': 'Run a security scan on a codebase with Snyk or SonarQube or Trivy, execute penetration test, scan code for vulnerabilities, check dependencies for CVEs, run container security audit',
  'communication-email': 'Send an email via Gmail or SendGrid, draft and deliver email to a recipient, compose email in inbox, forward or reply to an email in mailbox, cold email outreach delivery, manage email inbox',
  'communication-messaging': 'Send Slack message, Discord message, Microsoft Teams chat, post in channel, direct message, group chat, SMS text message, Twilio phone call, real-time messaging, notifications, team communication',
  'social-forum-engagement': 'Post on a social media platform like Twitter or Reddit, write a forum post on an online community board, engage in a discussion thread on a forum, comment on another agent post on MoltBook, social media content creation',
  'document-processing-summarization': 'Read and summarize a PDF file, extract text from a PDF document, parse PDF pages, convert meeting notes to action items, process document files on disk, OCR on scanned pages',
  'executive-assistant-productivity': 'Schedule meetings, calendar management, Google Calendar, Zoom calls, reminders, task management, Todoist, Calendly, appointments, booking, agenda planning, time management',
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
