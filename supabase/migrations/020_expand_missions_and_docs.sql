-- ToolRoute Migration 020: Expand Benchmark Missions
-- Adds 7 new missions to cover all 10 Olympic events
-- (Events 1-3 already had missions, adding 4-10)

INSERT INTO benchmark_missions (event_id, title, description, task_prompt, task_fingerprint, skill_ids, reward_multiplier, max_claims)
SELECT e.id, t.title, t.description, t.task_prompt, t.fingerprint, ARRAY(
  SELECT s.id FROM skills s WHERE s.slug = ANY(t.skill_slugs)
), t.multiplier, t.max_claims FROM (
  VALUES
    -- Event 4: PDF & Document Extraction
    ('pdf-document-extraction'::text,
     'Financial Report Data Extraction',
     'Extract key financial metrics, tables, and structured data from a multi-page PDF report.',
     'Parse the provided financial report PDF. Extract: 1) Revenue figures by quarter, 2) All pricing tables with row/column structure preserved, 3) Key metrics (margins, growth rates, market share), 4) Executive summary bullet points. Return as structured JSON.',
     'pdf-extraction-financial-001',
     ARRAY['firecrawl-mcp', 'exa-mcp-server'],
     2.5, 50),

    -- Event 5: Knowledge Base Search
    ('knowledge-base-search',
     'Enterprise Knowledge Retrieval',
     'Search across a knowledge base to answer 5 complex questions requiring multi-document synthesis.',
     'Using the connected knowledge base, answer these questions: 1) What is the current onboarding process for new engineers? 2) What are the active API rate limits and how do they differ by tier? 3) Summarize the last 3 architecture decision records. 4) What security compliance certifications are maintained? 5) What is the incident response escalation path?',
     'knowledge-search-enterprise-001',
     ARRAY['notion-mcp-server', 'atlassian-mcp'],
     2.5, 50),

    -- Event 6: Database Query Generation
    ('database-query-generation',
     'Schema-Aware SQL Generation',
     'Generate 5 progressively complex SQL queries for a normalized e-commerce database schema.',
     'Given this e-commerce database schema (users, orders, products, order_items, reviews), generate SQL queries for: 1) Revenue by product category this quarter, 2) Customers who ordered 3+ times in 30 days, 3) Top 10 products by review score with order count, 4) Month-over-month revenue growth with running totals, 5) Cohort retention analysis by signup month. Include query optimization hints.',
     'db-query-ecommerce-001',
     ARRAY['genai-toolbox'],
     2.5, 50),

    -- Event 7: Workflow Automation
    ('workflow-automation',
     'Multi-Platform Workflow Orchestration',
     'Execute a 5-step automated workflow across multiple platforms with error handling and retry logic.',
     'Orchestrate this workflow: 1) Pull new GitHub issues labeled "bug" from the last 24h, 2) Classify severity using issue body analysis, 3) Create corresponding Jira tickets with mapped priority, 4) Post a Slack summary to #engineering with issue links, 5) Update a Google Sheet tracker with all issues and statuses. Handle failures gracefully with retries and fallback notifications.',
     'workflow-multi-platform-001',
     ARRAY['github-mcp-server', 'atlassian-mcp', 'notion-mcp-server'],
     2.5, 50),

    -- Event 8: Code Intelligence
    ('code-intelligence',
     'Codebase Security & Quality Audit',
     'Perform a security scan and code quality analysis on a repository, producing actionable findings.',
     'Analyze this repository for: 1) Security vulnerabilities (SQL injection, XSS, hardcoded secrets, dependency CVEs), 2) Code quality issues (dead code, duplicated logic, missing error handling), 3) Architecture concerns (circular dependencies, god classes, missing abstractions), 4) Test coverage gaps by module, 5) Performance anti-patterns. Return prioritized findings with severity, location, and fix suggestions.',
     'code-intel-security-001',
     ARRAY['github-mcp-server', 'context7'],
     2.5, 50),

    -- Event 9: CRM Enrichment
    ('crm-enrichment',
     'Lead Enrichment & Scoring Pipeline',
     'Enrich 10 raw leads with company data, contacts, and scoring signals from multiple sources.',
     'For each of these 10 leads (company name + domain only): 1) Find company size, industry, funding stage, and tech stack, 2) Identify 2-3 decision-maker contacts with titles and LinkedIn URLs, 3) Score lead fit (1-100) based on ICP criteria: B2B SaaS, 50-500 employees, Series A+, 4) Flag buying signals (recent hiring, tech migrations, funding rounds), 5) Return structured JSON with confidence scores per field.',
     'crm-enrichment-leads-001',
     ARRAY['exa-mcp-server', 'firecrawl-mcp'],
     2.5, 50),

    -- Event 10: Data Pipeline Orchestration
    ('data-pipeline-orchestration',
     'ETL Pipeline Construction & Validation',
     'Build and validate a 4-stage data pipeline with transformation logic and quality checks.',
     'Construct a data pipeline that: 1) Extracts raw event data from a JSON API endpoint (paginated, 1000+ records), 2) Transforms records: normalize timestamps to UTC, deduplicate by event_id, enrich with geo-IP lookup, 3) Loads transformed data into a staging table with schema validation, 4) Runs quality checks: completeness (>99%), freshness (<5min lag), uniqueness constraints. Report pipeline metrics: records processed, transform errors, load time, quality score.',
     'pipeline-etl-validation-001',
     ARRAY['genai-toolbox'],
     2.5, 50)
) AS t(event_slug, title, description, task_prompt, fingerprint, skill_slugs, multiplier, max_claims)
JOIN olympic_events e ON e.slug = t.event_slug;

-- Clean up duplicate telemetry_rate_tracking rows (keep earliest per period)
DELETE FROM telemetry_rate_tracking
WHERE id NOT IN (
  SELECT DISTINCT ON (period_start) id
  FROM telemetry_rate_tracking
  ORDER BY period_start, created_at ASC
);
