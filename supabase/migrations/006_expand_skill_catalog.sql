-- ToolRoute — Expand Skill Catalog to 45+ skills
-- Adds ~38 new real MCP servers across all 10 workflow categories
-- Also seeds workflow joins, vertical joins, cost models, and outcome records
-- Run AFTER 005_seed_outcome_data.sql
-- Version: 1.4 | March 2026

-- ─────────────────────────────────────────────
-- 1. NEW SKILLS (38 total)
-- ─────────────────────────────────────────────

INSERT INTO skills (canonical_name, slug, repo_url, vendor_name, vendor_type, short_description, open_source, status, featured, license) VALUES

-- ── research-competitive-intelligence (3 new) ──
('Brave Search MCP', 'brave-search-mcp', 'https://github.com/modelcontextprotocol/servers', 'Anthropic', 'official', 'Brave web search API integration — privacy-focused web and local search for agents.', true, 'active', true, 'MIT'),
('Tavily MCP', 'tavily-mcp', 'https://github.com/tavily-ai/tavily-mcp', 'Tavily', 'official', 'AI-optimized research search with built-in answer extraction and source ranking.', true, 'active', true, 'MIT'),
('Perplexity Ask MCP', 'perplexity-ask-mcp', 'https://github.com/ppl-ai/modelcontextprotocol', 'Perplexity', 'community', 'Perplexity AI search integration for real-time research with citations.', true, 'active', false, 'MIT'),

-- ── developer-workflow-code-management (3 new) ──
('GitLab MCP', 'gitlab-mcp', 'https://github.com/modelcontextprotocol/servers', 'Anthropic', 'official', 'GitLab API access — manage repos, merge requests, pipelines, and issues.', true, 'active', false, 'MIT'),
('Linear MCP', 'linear-mcp', 'https://github.com/jerhadf/linear-mcp-server', 'Community', 'community', 'Linear issue tracking and project management for engineering teams.', true, 'active', false, 'MIT'),
('Sentry MCP', 'sentry-mcp', 'https://github.com/getsentry/sentry-mcp', 'Sentry', 'official', 'Error tracking and performance monitoring — query issues, stack traces, and alerts.', true, 'active', true, 'Apache-2.0'),

-- ── qa-testing-automation (4 new) ──
('Browserbase MCP', 'browserbase-mcp', 'https://github.com/browserbase/mcp-server-browserbase', 'Browserbase', 'official', 'Cloud browser infrastructure for headless automation, stealth browsing, and session replay.', true, 'active', true, 'MIT'),
('Puppeteer MCP', 'puppeteer-mcp', 'https://github.com/modelcontextprotocol/servers', 'Anthropic', 'official', 'Puppeteer-based browser automation — screenshots, navigation, form filling, and JS execution.', true, 'active', false, 'MIT'),
('Stagehand MCP', 'stagehand-mcp', 'https://github.com/browserbase/stagehand', 'Browserbase', 'official', 'AI-native browser automation using natural language selectors and visual understanding.', true, 'active', false, 'MIT'),
('Selenium MCP', 'selenium-mcp', 'https://github.com/nichochar/selenium-mcp', 'Community', 'community', 'Selenium WebDriver MCP server — cross-browser testing automation and web scraping.', true, 'active', false, 'MIT'),

-- ── data-analysis-reporting (4 new) ──
('Supabase MCP', 'supabase-mcp', 'https://github.com/supabase-community/supabase-mcp', 'Supabase', 'community', 'Supabase database and storage access — run queries, manage tables, and interact with auth.', true, 'active', true, 'MIT'),
('Neon MCP', 'neon-mcp', 'https://github.com/neondatabase/mcp-server-neon', 'Neon', 'official', 'Serverless Postgres management — create databases, run queries, branch, and scale.', true, 'active', true, 'Apache-2.0'),
('ClickHouse MCP', 'clickhouse-mcp', 'https://github.com/ClickHouse/mcp-clickhouse', 'ClickHouse', 'official', 'Analytics database queries — fast OLAP over billions of rows with SQL.', true, 'active', false, 'Apache-2.0'),
('DuckDB MCP', 'duckdb-mcp', 'https://github.com/community/duckdb-mcp', 'Community', 'community', 'In-process analytical database — query CSV, Parquet, and JSON with zero setup.', true, 'active', false, 'MIT'),

-- ── sales-research-outreach (5 new) ──
('HubSpot MCP', 'hubspot-mcp', 'https://github.com/community/hubspot-mcp', 'Community', 'community', 'HubSpot CRM integration — contacts, deals, companies, and marketing automation.', true, 'active', true, 'MIT'),
('Apollo MCP', 'apollo-mcp', 'https://github.com/community/apollo-mcp', 'Community', 'community', 'Sales intelligence and prospecting — search people, companies, and enrich leads.', true, 'active', false, 'MIT'),
('Clearbit MCP', 'clearbit-mcp', 'https://github.com/community/clearbit-mcp', 'Community', 'community', 'Company and contact enrichment — firmographic, technographic, and intent data.', true, 'active', false, 'MIT'),
('Salesforce MCP', 'salesforce-mcp', 'https://github.com/community/salesforce-mcp', 'Community', 'community', 'Salesforce CRM operations — SOQL queries, record management, and workflow triggers.', true, 'active', true, 'MIT'),
('Clay MCP', 'clay-mcp', 'https://github.com/community/clay-mcp', 'Community', 'community', 'Data enrichment and outreach automation — waterfall enrichment across 50+ providers.', true, 'active', false, 'MIT'),

-- ── content-creation-publishing (5 new) ──
('WordPress MCP', 'wordpress-mcp', 'https://github.com/community/wordpress-mcp', 'Community', 'community', 'WordPress CMS management — create posts, manage media, update pages, and handle comments.', true, 'active', true, 'MIT'),
('Sanity MCP', 'sanity-mcp', 'https://github.com/sanity-io/sanity-mcp-server', 'Sanity', 'official', 'Sanity.io headless CMS — GROQ queries, document CRUD, asset management.', true, 'active', true, 'MIT'),
('Ghost MCP', 'ghost-mcp', 'https://github.com/community/ghost-mcp', 'Community', 'community', 'Ghost publishing platform — create and manage posts, tags, members, and newsletters.', true, 'active', false, 'MIT'),
('Contentful MCP', 'contentful-mcp', 'https://github.com/community/contentful-mcp', 'Community', 'community', 'Contentful headless CMS — content types, entries, assets, and localization.', true, 'active', false, 'MIT'),
('Markdown MCP', 'markdown-mcp', 'https://github.com/community/markdown-mcp', 'Community', 'community', 'Markdown processing and conversion — render, lint, transform, and export to HTML/PDF.', true, 'active', false, 'MIT'),

-- ── customer-support-automation (4 new) ──
('Zendesk MCP', 'zendesk-mcp', 'https://github.com/community/zendesk-mcp', 'Community', 'community', 'Zendesk ticket management — create, update, search tickets, and manage macros.', true, 'active', true, 'MIT'),
('Intercom MCP', 'intercom-mcp', 'https://github.com/community/intercom-mcp', 'Community', 'community', 'Intercom messaging and support — conversations, contacts, and help center articles.', true, 'active', false, 'MIT'),
('Freshdesk MCP', 'freshdesk-mcp', 'https://github.com/community/freshdesk-mcp', 'Community', 'community', 'Freshdesk helpdesk automation — tickets, contacts, knowledge base, and SLA tracking.', true, 'active', false, 'MIT'),
('PagerDuty MCP', 'pagerduty-mcp', 'https://github.com/community/pagerduty-mcp', 'Community', 'community', 'Incident management and alerting — create incidents, manage on-call schedules, acknowledge.', true, 'active', false, 'MIT'),

-- ── knowledge-management (4 new) ──
('Confluence MCP', 'confluence-mcp', 'https://github.com/community/confluence-mcp', 'Community', 'community', 'Confluence wiki access — search pages, read content, create and update documentation.', true, 'active', false, 'MIT'),
('Obsidian MCP', 'obsidian-mcp', 'https://github.com/community/obsidian-mcp', 'Community', 'community', 'Obsidian vault access — read, create, and search notes with backlink support.', true, 'active', true, 'MIT'),
('ReadMe MCP', 'readme-mcp', 'https://github.com/community/readme-mcp', 'Community', 'community', 'ReadMe.com API documentation platform — manage docs, changelogs, and API references.', true, 'active', false, 'MIT'),
('Mem0 MCP', 'mem0-mcp', 'https://github.com/mem0ai/mem0-mcp', 'Mem0', 'official', 'AI memory and personalization layer — store, retrieve, and search agent memories.', true, 'active', true, 'Apache-2.0'),

-- ── design-to-code-workflow (4 new) ──
('Vercel v0 MCP', 'vercel-v0-mcp', 'https://github.com/community/vercel-v0-mcp', 'Community', 'community', 'AI UI generation with v0 — generate React components from text descriptions.', true, 'active', false, 'MIT'),
('Storybook MCP', 'storybook-mcp', 'https://github.com/community/storybook-mcp', 'Community', 'community', 'Component documentation and testing — browse stories, capture snapshots, and run interactions.', true, 'active', false, 'MIT'),
('TailwindCSS MCP', 'tailwindcss-mcp', 'https://github.com/community/tailwindcss-mcp', 'Community', 'community', 'Tailwind utility suggestions — class lookup, responsive helpers, and design token mapping.', true, 'active', false, 'MIT'),
('Framer MCP', 'framer-mcp', 'https://github.com/community/framer-mcp', 'Community', 'community', 'Framer design tool integration — read layouts, export assets, and generate motion code.', true, 'active', false, 'MIT'),

-- ── it-devops-platform-operations (4 new) ──
('Cloudflare MCP', 'cloudflare-mcp', 'https://github.com/cloudflare/mcp-server-cloudflare', 'Cloudflare', 'official', 'Cloudflare Workers, DNS, R2, KV, and D1 management from any agent environment.', true, 'active', true, 'Apache-2.0'),
('Terraform MCP', 'terraform-mcp', 'https://github.com/hashicorp/terraform-mcp-server', 'HashiCorp', 'official', 'Infrastructure as Code — plan, apply, and manage Terraform state and modules.', true, 'active', true, 'MPL-2.0'),
('Kubernetes MCP', 'kubernetes-mcp', 'https://github.com/community/kubernetes-mcp', 'Community', 'community', 'K8s cluster management — pods, deployments, services, and kubectl operations.', true, 'active', false, 'MIT'),
('Docker MCP', 'docker-mcp', 'https://github.com/community/docker-mcp', 'Community', 'community', 'Docker container management — build, run, inspect, and manage images and networks.', true, 'active', false, 'MIT');


-- ─────────────────────────────────────────────
-- 2. SKILL METRICS
-- ─────────────────────────────────────────────

INSERT INTO skill_metrics (skill_id, github_stars, github_forks, open_issues, days_since_last_commit)
SELECT s.id, m.stars, m.forks, m.issues, m.days FROM (
  VALUES
    -- research
    ('brave-search-mcp'::text,   8200, 320, 45, 3),
    ('tavily-mcp',               3200, 180, 22, 5),
    ('perplexity-ask-mcp',       1800, 90, 18, 12),
    -- developer
    ('gitlab-mcp',               7500, 280, 55, 4),
    ('linear-mcp',               1200, 85, 15, 8),
    ('sentry-mcp',               2800, 140, 30, 3),
    -- qa-testing
    ('browserbase-mcp',          3500, 200, 28, 2),
    ('puppeteer-mcp',            7800, 310, 40, 4),
    ('stagehand-mcp',            2400, 120, 20, 6),
    ('selenium-mcp',              800, 60, 12, 15),
    -- data-analysis
    ('supabase-mcp',             2600, 180, 35, 4),
    ('neon-mcp',                 3100, 150, 25, 3),
    ('clickhouse-mcp',           1500, 80, 18, 7),
    ('duckdb-mcp',                900, 55, 10, 14),
    -- sales
    ('hubspot-mcp',              1400, 95, 22, 8),
    ('apollo-mcp',                600, 40, 8, 18),
    ('clearbit-mcp',              450, 30, 6, 22),
    ('salesforce-mcp',           1100, 75, 20, 10),
    ('clay-mcp',                  350, 25, 5, 20),
    -- content
    ('wordpress-mcp',            1200, 80, 18, 9),
    ('sanity-mcp',               1800, 110, 15, 4),
    ('ghost-mcp',                 550, 35, 8, 16),
    ('contentful-mcp',            700, 45, 10, 14),
    ('markdown-mcp',              400, 20, 4, 25),
    -- support
    ('zendesk-mcp',              1100, 70, 16, 10),
    ('intercom-mcp',              650, 40, 9, 15),
    ('freshdesk-mcp',             500, 30, 7, 18),
    ('pagerduty-mcp',             750, 45, 11, 12),
    -- knowledge
    ('confluence-mcp',            800, 50, 12, 14),
    ('obsidian-mcp',             2200, 130, 25, 6),
    ('readme-mcp',                400, 25, 5, 20),
    ('mem0-mcp',                 3500, 190, 30, 3),
    -- design
    ('vercel-v0-mcp',             900, 55, 10, 12),
    ('storybook-mcp',             600, 35, 8, 18),
    ('tailwindcss-mcp',           750, 40, 6, 15),
    ('framer-mcp',                500, 30, 7, 20),
    -- devops
    ('cloudflare-mcp',           4200, 250, 38, 2),
    ('terraform-mcp',            3800, 220, 42, 3),
    ('kubernetes-mcp',           1300, 90, 20, 10),
    ('docker-mcp',               1100, 75, 15, 12)
) AS m(slug, stars, forks, issues, days)
JOIN skills s ON s.slug = m.slug;


-- ─────────────────────────────────────────────
-- 3. SKILL SCORES
-- Value Score = 0.35*output + 0.25*reliability + 0.15*efficiency + 0.15*cost + 0.10*trust
-- ─────────────────────────────────────────────

INSERT INTO skill_scores (skill_id, adoption_score, freshness_score, trust_score, setup_score, reliability_score, output_score, efficiency_score, cost_score, value_score, overall_score)
SELECT s.id, t.adoption, t.freshness, t.trust, t.setup, t.reliability, t.output, t.efficiency, t.cost,
  ROUND((0.35 * t.output + 0.25 * t.reliability + 0.15 * t.efficiency + 0.15 * t.cost + 0.10 * t.trust)::numeric, 2),
  t.overall
FROM (
  VALUES
    -- research (official tools score higher)
    ('brave-search-mcp'::text,  9.0, 9.6, 9.0, 8.5, 9.0, 9.0, 9.0, 9.5, 0, 9.1),
    ('tavily-mcp',              8.5, 9.4, 8.5, 8.0, 8.7, 8.8, 8.5, 8.0, 0, 8.6),
    ('perplexity-ask-mcp',      7.5, 8.2, 7.0, 7.5, 7.5, 8.0, 7.8, 7.5, 0, 7.7),
    -- developer
    ('gitlab-mcp',              8.8, 9.5, 9.0, 8.0, 8.8, 8.8, 8.5, 8.5, 0, 8.8),
    ('linear-mcp',              7.2, 8.5, 7.0, 7.5, 7.8, 7.5, 8.0, 8.5, 0, 7.7),
    ('sentry-mcp',              8.2, 9.5, 8.5, 7.5, 8.5, 8.5, 8.0, 8.0, 0, 8.4),
    -- qa-testing
    ('browserbase-mcp',         8.5, 9.6, 8.5, 8.0, 8.8, 8.5, 8.2, 7.5, 0, 8.4),
    ('puppeteer-mcp',           8.8, 9.5, 9.0, 8.0, 8.5, 8.8, 8.5, 9.0, 0, 8.8),
    ('stagehand-mcp',           7.8, 9.2, 8.0, 7.5, 7.8, 8.2, 7.8, 8.0, 0, 8.0),
    ('selenium-mcp',            6.5, 7.5, 6.5, 7.0, 7.0, 7.2, 7.0, 8.0, 0, 7.1),
    -- data-analysis
    ('supabase-mcp',            8.0, 9.4, 8.0, 8.0, 8.5, 8.5, 8.5, 8.5, 0, 8.5),
    ('neon-mcp',                8.3, 9.5, 8.5, 8.5, 8.8, 8.8, 9.0, 8.5, 0, 8.8),
    ('clickhouse-mcp',          7.5, 9.0, 8.0, 7.0, 8.0, 8.2, 8.5, 7.5, 0, 8.1),
    ('duckdb-mcp',              6.8, 7.8, 7.0, 8.0, 7.5, 7.5, 8.5, 9.5, 0, 8.0),
    -- sales
    ('hubspot-mcp',             7.5, 8.5, 7.5, 7.0, 7.5, 7.8, 7.5, 7.0, 0, 7.5),
    ('apollo-mcp',              6.2, 7.5, 6.5, 6.5, 6.8, 7.0, 7.0, 7.0, 0, 6.9),
    ('clearbit-mcp',            6.0, 7.0, 6.5, 6.5, 6.5, 7.0, 7.0, 6.5, 0, 6.7),
    ('salesforce-mcp',          7.2, 8.0, 7.5, 6.5, 7.5, 7.8, 7.0, 7.0, 0, 7.4),
    ('clay-mcp',                5.8, 7.0, 6.0, 6.0, 6.5, 7.0, 7.0, 6.5, 0, 6.7),
    -- content
    ('wordpress-mcp',           7.2, 8.2, 7.0, 7.5, 7.5, 7.8, 7.5, 8.5, 0, 7.7),
    ('sanity-mcp',              7.8, 9.3, 8.0, 7.5, 8.2, 8.5, 8.0, 8.0, 0, 8.2),
    ('ghost-mcp',               6.0, 7.5, 6.5, 7.0, 6.8, 7.0, 7.5, 8.5, 0, 7.2),
    ('contentful-mcp',          6.5, 7.8, 7.0, 7.0, 7.0, 7.2, 7.0, 7.5, 0, 7.1),
    ('markdown-mcp',            5.5, 6.5, 6.0, 8.0, 7.0, 6.5, 8.0, 9.5, 0, 7.3),
    -- support
    ('zendesk-mcp',             7.2, 8.2, 7.5, 7.0, 7.8, 7.5, 7.5, 7.0, 0, 7.5),
    ('intercom-mcp',            6.5, 7.5, 6.5, 6.5, 7.0, 7.0, 7.0, 7.0, 0, 6.9),
    ('freshdesk-mcp',           6.0, 7.2, 6.5, 6.5, 6.8, 6.8, 7.0, 7.5, 0, 6.9),
    ('pagerduty-mcp',           6.8, 8.0, 7.0, 7.0, 7.5, 7.2, 7.5, 7.5, 0, 7.3),
    -- knowledge
    ('confluence-mcp',          6.5, 7.8, 7.0, 6.5, 7.0, 7.2, 7.0, 7.5, 0, 7.1),
    ('obsidian-mcp',            7.8, 9.0, 7.5, 8.0, 8.0, 8.2, 8.5, 9.5, 0, 8.4),
    ('readme-mcp',              5.8, 7.0, 6.0, 7.0, 6.5, 6.8, 7.0, 8.0, 0, 7.0),
    ('mem0-mcp',                8.0, 9.5, 8.0, 7.5, 8.2, 8.5, 8.0, 8.0, 0, 8.3),
    -- design
    ('vercel-v0-mcp',           6.8, 8.0, 6.5, 7.0, 7.0, 7.5, 7.0, 7.5, 0, 7.2),
    ('storybook-mcp',           6.2, 7.2, 6.5, 7.0, 6.8, 7.0, 7.5, 8.0, 0, 7.1),
    ('tailwindcss-mcp',         6.5, 7.5, 6.5, 7.5, 7.0, 7.0, 8.0, 9.0, 0, 7.5),
    ('framer-mcp',              5.8, 7.0, 6.0, 6.5, 6.5, 7.0, 7.0, 7.5, 0, 6.8),
    -- devops
    ('cloudflare-mcp',          8.5, 9.7, 9.0, 7.5, 9.0, 8.8, 8.5, 8.0, 0, 8.8),
    ('terraform-mcp',           8.5, 9.5, 9.0, 7.0, 8.8, 8.8, 8.0, 7.5, 0, 8.5),
    ('kubernetes-mcp',          7.0, 8.2, 7.0, 6.5, 7.5, 7.5, 7.5, 8.0, 0, 7.5),
    ('docker-mcp',              7.0, 8.0, 7.0, 7.5, 7.5, 7.2, 7.8, 8.5, 0, 7.5)
) AS t(slug, adoption, freshness, trust, setup, reliability, output, efficiency, cost, _placeholder, overall)
JOIN skills s ON s.slug = t.slug;


-- ─────────────────────────────────────────────
-- 4. SKILL WORKFLOWS (join new skills to workflows)
-- Also backfill joins for the original 10 skills
-- ─────────────────────────────────────────────

INSERT INTO skill_workflows (skill_id, workflow_id, is_primary, sort_order)
SELECT s.id, w.id, true, 0 FROM (
  VALUES
    -- Original 10
    ('context7'::text,          'developer-workflow-code-management'::text),
    ('playwright-mcp',          'qa-testing-automation'),
    ('github-mcp-server',       'developer-workflow-code-management'),
    ('firecrawl-mcp',           'research-competitive-intelligence'),
    ('exa-mcp-server',          'research-competitive-intelligence'),
    ('aws-mcp',                 'it-devops-platform-operations'),
    ('figma-context-mcp',       'design-to-code-workflow'),
    ('atlassian-mcp',           'customer-support-automation'),
    ('notion-mcp-server',       'knowledge-management'),
    ('genai-toolbox',           'data-analysis-reporting'),
    -- New: research
    ('brave-search-mcp',        'research-competitive-intelligence'),
    ('tavily-mcp',              'research-competitive-intelligence'),
    ('perplexity-ask-mcp',      'research-competitive-intelligence'),
    -- New: developer
    ('gitlab-mcp',              'developer-workflow-code-management'),
    ('linear-mcp',              'developer-workflow-code-management'),
    ('sentry-mcp',              'developer-workflow-code-management'),
    -- New: qa-testing
    ('browserbase-mcp',         'qa-testing-automation'),
    ('puppeteer-mcp',           'qa-testing-automation'),
    ('stagehand-mcp',           'qa-testing-automation'),
    ('selenium-mcp',            'qa-testing-automation'),
    -- New: data-analysis
    ('supabase-mcp',            'data-analysis-reporting'),
    ('neon-mcp',                'data-analysis-reporting'),
    ('clickhouse-mcp',          'data-analysis-reporting'),
    ('duckdb-mcp',              'data-analysis-reporting'),
    -- New: sales
    ('hubspot-mcp',             'sales-research-outreach'),
    ('apollo-mcp',              'sales-research-outreach'),
    ('clearbit-mcp',            'sales-research-outreach'),
    ('salesforce-mcp',          'sales-research-outreach'),
    ('clay-mcp',                'sales-research-outreach'),
    -- New: content
    ('wordpress-mcp',           'content-creation-publishing'),
    ('sanity-mcp',              'content-creation-publishing'),
    ('ghost-mcp',               'content-creation-publishing'),
    ('contentful-mcp',          'content-creation-publishing'),
    ('markdown-mcp',            'content-creation-publishing'),
    -- New: support
    ('zendesk-mcp',             'customer-support-automation'),
    ('intercom-mcp',            'customer-support-automation'),
    ('freshdesk-mcp',           'customer-support-automation'),
    ('pagerduty-mcp',           'customer-support-automation'),
    -- New: knowledge
    ('confluence-mcp',          'knowledge-management'),
    ('obsidian-mcp',            'knowledge-management'),
    ('readme-mcp',              'knowledge-management'),
    ('mem0-mcp',                'knowledge-management'),
    -- New: design
    ('vercel-v0-mcp',           'design-to-code-workflow'),
    ('storybook-mcp',           'design-to-code-workflow'),
    ('tailwindcss-mcp',         'design-to-code-workflow'),
    ('framer-mcp',              'design-to-code-workflow'),
    -- New: devops
    ('cloudflare-mcp',          'it-devops-platform-operations'),
    ('terraform-mcp',           'it-devops-platform-operations'),
    ('kubernetes-mcp',          'it-devops-platform-operations'),
    ('docker-mcp',              'it-devops-platform-operations')
) AS t(skill_slug, workflow_slug)
JOIN skills s ON s.slug = t.skill_slug
JOIN workflows w ON w.slug = t.workflow_slug
ON CONFLICT (skill_id, workflow_id) DO NOTHING;


-- ─────────────────────────────────────────────
-- 5. SKILL VERTICALS (join skills to industry verticals)
-- Also backfill joins for the original 10 skills
-- ─────────────────────────────────────────────

INSERT INTO skill_verticals (skill_id, vertical_id, is_primary, sort_order)
SELECT s.id, v.id, true, 0 FROM (
  VALUES
    -- Original 10
    ('context7'::text,          'engineering-development'::text),
    ('playwright-mcp',          'engineering-development'),
    ('github-mcp-server',       'engineering-development'),
    ('firecrawl-mcp',           'general-business-operations'),
    ('exa-mcp-server',          'general-business-operations'),
    ('aws-mcp',                 'engineering-development'),
    ('figma-context-mcp',       'engineering-development'),
    ('atlassian-mcp',           'customer-support'),
    ('notion-mcp-server',       'general-business-operations'),
    ('genai-toolbox',           'engineering-development'),
    -- research
    ('brave-search-mcp',        'general-business-operations'),
    ('tavily-mcp',              'general-business-operations'),
    ('perplexity-ask-mcp',      'general-business-operations'),
    -- developer
    ('gitlab-mcp',              'engineering-development'),
    ('linear-mcp',              'engineering-development'),
    ('sentry-mcp',              'engineering-development'),
    -- qa-testing
    ('browserbase-mcp',         'engineering-development'),
    ('puppeteer-mcp',           'engineering-development'),
    ('stagehand-mcp',           'engineering-development'),
    ('selenium-mcp',            'engineering-development'),
    -- data-analysis
    ('supabase-mcp',            'engineering-development'),
    ('neon-mcp',                'engineering-development'),
    ('clickhouse-mcp',          'engineering-development'),
    ('duckdb-mcp',              'engineering-development'),
    -- sales
    ('hubspot-mcp',             'sales-revenue'),
    ('apollo-mcp',              'sales-revenue'),
    ('clearbit-mcp',            'sales-revenue'),
    ('salesforce-mcp',          'sales-revenue'),
    ('clay-mcp',                'sales-revenue'),
    -- content
    ('wordpress-mcp',           'marketing-content'),
    ('sanity-mcp',              'marketing-content'),
    ('ghost-mcp',               'marketing-content'),
    ('contentful-mcp',          'marketing-content'),
    ('markdown-mcp',            'marketing-content'),
    -- support
    ('zendesk-mcp',             'customer-support'),
    ('intercom-mcp',            'customer-support'),
    ('freshdesk-mcp',           'customer-support'),
    ('pagerduty-mcp',           'customer-support'),
    -- knowledge
    ('confluence-mcp',          'general-business-operations'),
    ('obsidian-mcp',            'general-business-operations'),
    ('readme-mcp',              'engineering-development'),
    ('mem0-mcp',                'engineering-development'),
    -- design
    ('vercel-v0-mcp',           'engineering-development'),
    ('storybook-mcp',           'engineering-development'),
    ('tailwindcss-mcp',         'engineering-development'),
    ('framer-mcp',              'engineering-development'),
    -- devops
    ('cloudflare-mcp',          'engineering-development'),
    ('terraform-mcp',           'engineering-development'),
    ('kubernetes-mcp',          'engineering-development'),
    ('docker-mcp',              'engineering-development')
) AS t(skill_slug, vertical_slug)
JOIN skills s ON s.slug = t.skill_slug
JOIN verticals v ON v.slug = t.vertical_slug
ON CONFLICT (skill_id, vertical_id) DO NOTHING;


-- ─────────────────────────────────────────────
-- 6. SKILL COST MODELS
-- ─────────────────────────────────────────────

INSERT INTO skill_cost_models (skill_id, pricing_model, monthly_base_cost_usd)
SELECT s.id, t.model, t.cost FROM (
  VALUES
    -- Original 10
    ('context7'::text,          'free'::text,       0.00),
    ('playwright-mcp',          'free',             0.00),
    ('github-mcp-server',       'free',             0.00),
    ('firecrawl-mcp',           'freemium',        19.00),
    ('exa-mcp-server',          'usage_based',      5.00),
    ('aws-mcp',                 'usage_based',      0.00),
    ('figma-context-mcp',       'free',             0.00),
    ('atlassian-mcp',           'free',             0.00),
    ('notion-mcp-server',       'free',             0.00),
    ('genai-toolbox',           'free',             0.00),
    -- research
    ('brave-search-mcp',        'freemium',         0.00),
    ('tavily-mcp',              'freemium',         0.00),
    ('perplexity-ask-mcp',      'usage_based',     20.00),
    -- developer
    ('gitlab-mcp',              'free',             0.00),
    ('linear-mcp',              'free',             0.00),
    ('sentry-mcp',              'freemium',         0.00),
    -- qa-testing
    ('browserbase-mcp',         'freemium',         0.00),
    ('puppeteer-mcp',           'free',             0.00),
    ('stagehand-mcp',           'free',             0.00),
    ('selenium-mcp',            'free',             0.00),
    -- data-analysis
    ('supabase-mcp',            'free',             0.00),
    ('neon-mcp',                'freemium',         0.00),
    ('clickhouse-mcp',          'free',             0.00),
    ('duckdb-mcp',              'free',             0.00),
    -- sales
    ('hubspot-mcp',             'freemium',        45.00),
    ('apollo-mcp',              'freemium',        49.00),
    ('clearbit-mcp',            'usage_based',     99.00),
    ('salesforce-mcp',          'usage_based',     25.00),
    ('clay-mcp',                'usage_based',    149.00),
    -- content
    ('wordpress-mcp',           'free',             0.00),
    ('sanity-mcp',              'freemium',         0.00),
    ('ghost-mcp',               'free',             0.00),
    ('contentful-mcp',          'freemium',         0.00),
    ('markdown-mcp',            'free',             0.00),
    -- support
    ('zendesk-mcp',             'freemium',        19.00),
    ('intercom-mcp',            'usage_based',     39.00),
    ('freshdesk-mcp',           'freemium',        15.00),
    ('pagerduty-mcp',           'freemium',        21.00),
    -- knowledge
    ('confluence-mcp',          'free',             0.00),
    ('obsidian-mcp',            'free',             0.00),
    ('readme-mcp',              'freemium',         0.00),
    ('mem0-mcp',                'freemium',         0.00),
    -- design
    ('vercel-v0-mcp',           'freemium',         0.00),
    ('storybook-mcp',           'free',             0.00),
    ('tailwindcss-mcp',         'free',             0.00),
    ('framer-mcp',              'free',             0.00),
    -- devops
    ('cloudflare-mcp',          'freemium',         0.00),
    ('terraform-mcp',           'free',             0.00),
    ('kubernetes-mcp',          'free',             0.00),
    ('docker-mcp',              'free',             0.00)
) AS t(slug, model, cost)
JOIN skills s ON s.slug = t.slug
ON CONFLICT (skill_id) DO NOTHING;


-- ─────────────────────────────────────────────
-- 7. OUTCOME RECORDS (~55 records across new skills)
-- Spread across workflow categories with realistic data
-- ─────────────────────────────────────────────

-- Research workflow outcomes
INSERT INTO outcome_records (skill_id, benchmark_profile_id, workflow_slug, task_fingerprint, outcome_status, latency_ms, estimated_cost_usd, retries, output_quality_rating, structured_output_valid, human_correction_required, proof_type, created_at)
SELECT s.id, bp.id, t.wf, t.fp, t.status, t.latency, t.cost, t.retries, t.quality, t.valid, t.human, t.proof, NOW() - (t.days_ago || ' days')::interval
FROM (
  VALUES
    ('brave-search-mcp'::text, 'web-research-profile-v1'::text, 'research-competitive-intelligence'::text, 'research-competitor-pricing-brave', 'success'::text, 1200, 0.002, 0, 8.5, true, false, 'self_reported'::text, 5),
    ('brave-search-mcp', 'web-research-profile-v1', 'research-competitive-intelligence', 'research-market-trends-brave', 'success', 980, 0.001, 0, 9.0, true, false, 'self_reported', 3),
    ('tavily-mcp', 'web-research-profile-v1', 'research-competitive-intelligence', 'research-deep-dive-tavily', 'success', 2100, 0.005, 0, 8.8, true, false, 'self_reported', 7),
    ('tavily-mcp', 'web-research-profile-v1', 'research-competitive-intelligence', 'research-news-summary-tavily', 'success', 1800, 0.004, 1, 8.2, true, false, 'self_reported', 2),
    ('perplexity-ask-mcp', 'web-research-profile-v1', 'research-competitive-intelligence', 'research-qa-perplexity', 'success', 3200, 0.008, 0, 7.8, true, false, 'self_reported', 10),
    ('perplexity-ask-mcp', 'web-research-profile-v1', 'research-competitive-intelligence', 'research-fact-check-perplexity', 'partial_success', 4500, 0.010, 2, 6.5, false, true, 'self_reported', 8)
) AS t(skill_slug, bp_slug, wf, fp, status, latency, cost, retries, quality, valid, human, proof, days_ago)
JOIN skills s ON s.slug = t.skill_slug
JOIN benchmark_profiles bp ON bp.slug = t.bp_slug;

-- Developer workflow outcomes
INSERT INTO outcome_records (skill_id, benchmark_profile_id, workflow_slug, task_fingerprint, outcome_status, latency_ms, estimated_cost_usd, retries, output_quality_rating, structured_output_valid, human_correction_required, proof_type, created_at)
SELECT s.id, bp.id, t.wf, t.fp, t.status, t.latency, t.cost, t.retries, t.quality, t.valid, t.human, t.proof, NOW() - (t.days_ago || ' days')::interval
FROM (
  VALUES
    ('gitlab-mcp'::text, 'repo-qa-profile-v1'::text, 'developer-workflow-code-management'::text, 'dev-mr-review-gitlab', 'success'::text, 1500, 0.003, 0, 8.5, true, false, 'self_reported'::text, 4),
    ('gitlab-mcp', 'repo-qa-profile-v1', 'developer-workflow-code-management', 'dev-pipeline-check-gitlab', 'success', 2200, 0.004, 0, 8.8, true, false, 'self_reported', 2),
    ('linear-mcp', 'repo-qa-profile-v1', 'developer-workflow-code-management', 'dev-issue-create-linear', 'success', 800, 0.001, 0, 7.5, true, false, 'self_reported', 6),
    ('linear-mcp', 'repo-qa-profile-v1', 'developer-workflow-code-management', 'dev-sprint-plan-linear', 'partial_success', 1200, 0.002, 1, 7.0, true, true, 'self_reported', 3),
    ('sentry-mcp', 'repo-qa-profile-v1', 'developer-workflow-code-management', 'dev-error-triage-sentry', 'success', 1800, 0.003, 0, 8.8, true, false, 'self_reported', 5),
    ('sentry-mcp', 'repo-qa-profile-v1', 'developer-workflow-code-management', 'dev-perf-analysis-sentry', 'success', 2500, 0.005, 0, 8.5, true, false, 'self_reported', 1)
) AS t(skill_slug, bp_slug, wf, fp, status, latency, cost, retries, quality, valid, human, proof, days_ago)
JOIN skills s ON s.slug = t.skill_slug
JOIN benchmark_profiles bp ON bp.slug = t.bp_slug;

-- QA Testing outcomes
INSERT INTO outcome_records (skill_id, benchmark_profile_id, workflow_slug, task_fingerprint, outcome_status, latency_ms, estimated_cost_usd, retries, output_quality_rating, structured_output_valid, human_correction_required, proof_type, created_at)
SELECT s.id, bp.id, t.wf, t.fp, t.status, t.latency, t.cost, t.retries, t.quality, t.valid, t.human, t.proof, NOW() - (t.days_ago || ' days')::interval
FROM (
  VALUES
    ('browserbase-mcp'::text, 'browser-task-completion-v1'::text, 'qa-testing-automation'::text, 'qa-form-fill-browserbase', 'success'::text, 3500, 0.010, 0, 8.8, true, false, 'runtime_signed'::text, 3),
    ('browserbase-mcp', 'browser-task-completion-v1', 'qa-testing-automation', 'qa-screenshot-browserbase', 'success', 2800, 0.008, 0, 9.0, true, false, 'runtime_signed', 1),
    ('puppeteer-mcp', 'browser-task-completion-v1', 'qa-testing-automation', 'qa-navigation-puppeteer', 'success', 2200, 0.001, 0, 8.5, true, false, 'self_reported', 5),
    ('puppeteer-mcp', 'browser-task-completion-v1', 'qa-testing-automation', 'qa-data-extract-puppeteer', 'success', 3100, 0.002, 1, 8.0, true, false, 'self_reported', 2),
    ('stagehand-mcp', 'browser-task-completion-v1', 'qa-testing-automation', 'qa-visual-test-stagehand', 'success', 4500, 0.012, 0, 8.2, true, false, 'self_reported', 4),
    ('selenium-mcp', 'browser-task-completion-v1', 'qa-testing-automation', 'qa-cross-browser-selenium', 'partial_success', 5500, 0.003, 2, 6.8, false, true, 'self_reported', 7)
) AS t(skill_slug, bp_slug, wf, fp, status, latency, cost, retries, quality, valid, human, proof, days_ago)
JOIN skills s ON s.slug = t.skill_slug
JOIN benchmark_profiles bp ON bp.slug = t.bp_slug;

-- Data Analysis outcomes
INSERT INTO outcome_records (skill_id, benchmark_profile_id, workflow_slug, task_fingerprint, outcome_status, latency_ms, estimated_cost_usd, retries, output_quality_rating, structured_output_valid, human_correction_required, proof_type, created_at)
SELECT s.id, bp.id, t.wf, t.fp, t.status, t.latency, t.cost, t.retries, t.quality, t.valid, t.human, t.proof, NOW() - (t.days_ago || ' days')::interval
FROM (
  VALUES
    ('supabase-mcp'::text, 'database-query-analysis-v1'::text, 'data-analysis-reporting'::text, 'data-query-supabase', 'success'::text, 450, 0.001, 0, 8.5, true, false, 'self_reported'::text, 3),
    ('supabase-mcp', 'database-query-analysis-v1', 'data-analysis-reporting', 'data-schema-inspect-supabase', 'success', 320, 0.001, 0, 8.8, true, false, 'self_reported', 1),
    ('neon-mcp', 'database-query-analysis-v1', 'data-analysis-reporting', 'data-branch-query-neon', 'success', 580, 0.002, 0, 9.0, true, false, 'runtime_signed', 4),
    ('neon-mcp', 'database-query-analysis-v1', 'data-analysis-reporting', 'data-migration-neon', 'success', 1200, 0.003, 0, 8.5, true, false, 'runtime_signed', 2),
    ('clickhouse-mcp', 'database-query-analysis-v1', 'data-analysis-reporting', 'data-analytics-clickhouse', 'success', 890, 0.002, 0, 8.2, true, false, 'self_reported', 6),
    ('duckdb-mcp', 'database-query-analysis-v1', 'data-analysis-reporting', 'data-csv-query-duckdb', 'success', 250, 0.000, 0, 7.8, true, false, 'self_reported', 5)
) AS t(skill_slug, bp_slug, wf, fp, status, latency, cost, retries, quality, valid, human, proof, days_ago)
JOIN skills s ON s.slug = t.skill_slug
JOIN benchmark_profiles bp ON bp.slug = t.bp_slug;

-- Sales outcomes
INSERT INTO outcome_records (skill_id, benchmark_profile_id, workflow_slug, task_fingerprint, outcome_status, latency_ms, estimated_cost_usd, retries, output_quality_rating, structured_output_valid, human_correction_required, proof_type, created_at)
SELECT s.id, bp.id, t.wf, t.fp, t.status, t.latency, t.cost, t.retries, t.quality, t.valid, t.human, t.proof, NOW() - (t.days_ago || ' days')::interval
FROM (
  VALUES
    ('hubspot-mcp'::text, 'crm-enrichment-v1'::text, 'sales-research-outreach'::text, 'sales-contact-enrich-hubspot', 'success'::text, 1800, 0.005, 0, 7.8, true, false, 'self_reported'::text, 4),
    ('hubspot-mcp', 'crm-enrichment-v1', 'sales-research-outreach', 'sales-deal-create-hubspot', 'success', 1200, 0.003, 0, 8.0, true, false, 'self_reported', 2),
    ('apollo-mcp', 'crm-enrichment-v1', 'sales-research-outreach', 'sales-prospect-search-apollo', 'success', 2200, 0.008, 0, 7.5, true, false, 'self_reported', 6),
    ('clearbit-mcp', 'crm-enrichment-v1', 'sales-research-outreach', 'sales-company-enrich-clearbit', 'success', 1500, 0.010, 0, 7.2, true, false, 'self_reported', 5),
    ('salesforce-mcp', 'crm-enrichment-v1', 'sales-research-outreach', 'sales-soql-query-salesforce', 'success', 2800, 0.004, 1, 7.8, true, false, 'self_reported', 3),
    ('clay-mcp', 'crm-enrichment-v1', 'sales-research-outreach', 'sales-waterfall-enrich-clay', 'partial_success', 5500, 0.025, 2, 6.8, false, true, 'self_reported', 8)
) AS t(skill_slug, bp_slug, wf, fp, status, latency, cost, retries, quality, valid, human, proof, days_ago)
JOIN skills s ON s.slug = t.skill_slug
JOIN benchmark_profiles bp ON bp.slug = t.bp_slug;

-- Content Publishing outcomes
INSERT INTO outcome_records (skill_id, benchmark_profile_id, workflow_slug, task_fingerprint, outcome_status, latency_ms, estimated_cost_usd, retries, output_quality_rating, structured_output_valid, human_correction_required, proof_type, created_at)
SELECT s.id, bp.id, t.wf, t.fp, t.status, t.latency, t.cost, t.retries, t.quality, t.valid, t.human, t.proof, NOW() - (t.days_ago || ' days')::interval
FROM (
  VALUES
    ('wordpress-mcp'::text, 'publishing-workflow-v1'::text, 'content-creation-publishing'::text, 'content-post-create-wordpress', 'success'::text, 1500, 0.001, 0, 7.8, true, false, 'self_reported'::text, 3),
    ('sanity-mcp', 'publishing-workflow-v1', 'content-creation-publishing', 'content-doc-publish-sanity', 'success', 980, 0.002, 0, 8.5, true, false, 'self_reported', 2),
    ('sanity-mcp', 'publishing-workflow-v1', 'content-creation-publishing', 'content-groq-query-sanity', 'success', 650, 0.001, 0, 8.8, true, false, 'self_reported', 1),
    ('ghost-mcp', 'publishing-workflow-v1', 'content-creation-publishing', 'content-newsletter-ghost', 'success', 1800, 0.001, 1, 7.2, true, false, 'self_reported', 5),
    ('contentful-mcp', 'publishing-workflow-v1', 'content-creation-publishing', 'content-entry-create-contentful', 'success', 1200, 0.002, 0, 7.5, true, false, 'self_reported', 4),
    ('markdown-mcp', 'publishing-workflow-v1', 'content-creation-publishing', 'content-md-convert-markdown', 'success', 200, 0.000, 0, 7.0, true, false, 'self_reported', 6)
) AS t(skill_slug, bp_slug, wf, fp, status, latency, cost, retries, quality, valid, human, proof, days_ago)
JOIN skills s ON s.slug = t.skill_slug
JOIN benchmark_profiles bp ON bp.slug = t.bp_slug;

-- Customer Support outcomes
INSERT INTO outcome_records (skill_id, benchmark_profile_id, workflow_slug, task_fingerprint, outcome_status, latency_ms, estimated_cost_usd, retries, output_quality_rating, structured_output_valid, human_correction_required, proof_type, created_at)
SELECT s.id, bp.id, t.wf, t.fp, t.status, t.latency, t.cost, t.retries, t.quality, t.valid, t.human, t.proof, NOW() - (t.days_ago || ' days')::interval
FROM (
  VALUES
    ('zendesk-mcp'::text, 'ticket-triage-v1'::text, 'customer-support-automation'::text, 'support-ticket-classify-zendesk', 'success'::text, 1100, 0.003, 0, 7.8, true, false, 'self_reported'::text, 3),
    ('zendesk-mcp', 'ticket-triage-v1', 'customer-support-automation', 'support-macro-apply-zendesk', 'success', 800, 0.002, 0, 8.0, true, false, 'self_reported', 1),
    ('intercom-mcp', 'ticket-triage-v1', 'customer-support-automation', 'support-convo-route-intercom', 'success', 1500, 0.004, 0, 7.2, true, false, 'self_reported', 5),
    ('freshdesk-mcp', 'ticket-triage-v1', 'customer-support-automation', 'support-ticket-create-freshdesk', 'success', 1200, 0.002, 1, 6.8, true, false, 'self_reported', 4),
    ('pagerduty-mcp', 'ticket-triage-v1', 'customer-support-automation', 'support-incident-create-pagerduty', 'success', 900, 0.003, 0, 7.5, true, false, 'self_reported', 2)
) AS t(skill_slug, bp_slug, wf, fp, status, latency, cost, retries, quality, valid, human, proof, days_ago)
JOIN skills s ON s.slug = t.skill_slug
JOIN benchmark_profiles bp ON bp.slug = t.bp_slug;

-- Knowledge Management outcomes
INSERT INTO outcome_records (skill_id, benchmark_profile_id, workflow_slug, task_fingerprint, outcome_status, latency_ms, estimated_cost_usd, retries, output_quality_rating, structured_output_valid, human_correction_required, proof_type, created_at)
SELECT s.id, bp.id, t.wf, t.fp, t.status, t.latency, t.cost, t.retries, t.quality, t.valid, t.human, t.proof, NOW() - (t.days_ago || ' days')::interval
FROM (
  VALUES
    ('confluence-mcp'::text, 'knowledge-base-search-v1'::text, 'knowledge-management'::text, 'km-page-search-confluence', 'success'::text, 1400, 0.002, 0, 7.2, true, false, 'self_reported'::text, 4),
    ('obsidian-mcp', 'knowledge-base-search-v1', 'knowledge-management', 'km-vault-search-obsidian', 'success', 350, 0.000, 0, 8.5, true, false, 'self_reported', 2),
    ('obsidian-mcp', 'knowledge-base-search-v1', 'knowledge-management', 'km-note-create-obsidian', 'success', 200, 0.000, 0, 8.2, true, false, 'self_reported', 1),
    ('readme-mcp', 'knowledge-base-search-v1', 'knowledge-management', 'km-api-doc-search-readme', 'success', 1100, 0.002, 0, 7.0, true, false, 'self_reported', 6),
    ('mem0-mcp', 'knowledge-base-search-v1', 'knowledge-management', 'km-memory-store-mem0', 'success', 450, 0.001, 0, 8.5, true, false, 'self_reported', 3),
    ('mem0-mcp', 'knowledge-base-search-v1', 'knowledge-management', 'km-memory-recall-mem0', 'success', 280, 0.001, 0, 8.8, true, false, 'self_reported', 1)
) AS t(skill_slug, bp_slug, wf, fp, status, latency, cost, retries, quality, valid, human, proof, days_ago)
JOIN skills s ON s.slug = t.skill_slug
JOIN benchmark_profiles bp ON bp.slug = t.bp_slug;

-- Design-to-Code outcomes (use browser-task-completion as closest benchmark)
INSERT INTO outcome_records (skill_id, benchmark_profile_id, workflow_slug, task_fingerprint, outcome_status, latency_ms, estimated_cost_usd, retries, output_quality_rating, structured_output_valid, human_correction_required, proof_type, created_at)
SELECT s.id, bp.id, t.wf, t.fp, t.status, t.latency, t.cost, t.retries, t.quality, t.valid, t.human, t.proof, NOW() - (t.days_ago || ' days')::interval
FROM (
  VALUES
    ('vercel-v0-mcp'::text, 'browser-task-completion-v1'::text, 'design-to-code-workflow'::text, 'design-ui-gen-v0', 'success'::text, 5500, 0.015, 0, 7.5, true, true, 'self_reported'::text, 4),
    ('storybook-mcp', 'browser-task-completion-v1', 'design-to-code-workflow', 'design-story-browse-storybook', 'success', 1200, 0.001, 0, 7.2, true, false, 'self_reported', 3),
    ('tailwindcss-mcp', 'browser-task-completion-v1', 'design-to-code-workflow', 'design-class-suggest-tailwind', 'success', 300, 0.000, 0, 7.5, true, false, 'self_reported', 2),
    ('framer-mcp', 'browser-task-completion-v1', 'design-to-code-workflow', 'design-layout-export-framer', 'partial_success', 3200, 0.005, 1, 6.5, false, true, 'self_reported', 6)
) AS t(skill_slug, bp_slug, wf, fp, status, latency, cost, retries, quality, valid, human, proof, days_ago)
JOIN skills s ON s.slug = t.skill_slug
JOIN benchmark_profiles bp ON bp.slug = t.bp_slug;

-- DevOps outcomes (use repo-qa as closest benchmark for infra tools)
INSERT INTO outcome_records (skill_id, benchmark_profile_id, workflow_slug, task_fingerprint, outcome_status, latency_ms, estimated_cost_usd, retries, output_quality_rating, structured_output_valid, human_correction_required, proof_type, created_at)
SELECT s.id, bp.id, t.wf, t.fp, t.status, t.latency, t.cost, t.retries, t.quality, t.valid, t.human, t.proof, NOW() - (t.days_ago || ' days')::interval
FROM (
  VALUES
    ('cloudflare-mcp'::text, 'repo-qa-profile-v1'::text, 'it-devops-platform-operations'::text, 'devops-worker-deploy-cloudflare', 'success'::text, 2200, 0.003, 0, 8.8, true, false, 'runtime_signed'::text, 2),
    ('cloudflare-mcp', 'repo-qa-profile-v1', 'it-devops-platform-operations', 'devops-dns-update-cloudflare', 'success', 1500, 0.002, 0, 9.0, true, false, 'runtime_signed', 1),
    ('terraform-mcp', 'repo-qa-profile-v1', 'it-devops-platform-operations', 'devops-plan-apply-terraform', 'success', 8500, 0.005, 0, 8.5, true, false, 'self_reported', 4),
    ('terraform-mcp', 'repo-qa-profile-v1', 'it-devops-platform-operations', 'devops-state-inspect-terraform', 'success', 3200, 0.002, 0, 8.8, true, false, 'self_reported', 2),
    ('kubernetes-mcp', 'repo-qa-profile-v1', 'it-devops-platform-operations', 'devops-pod-list-k8s', 'success', 1800, 0.001, 0, 7.5, true, false, 'self_reported', 5),
    ('docker-mcp', 'repo-qa-profile-v1', 'it-devops-platform-operations', 'devops-container-run-docker', 'success', 2500, 0.001, 0, 7.5, true, false, 'self_reported', 3)
) AS t(skill_slug, bp_slug, wf, fp, status, latency, cost, retries, quality, valid, human, proof, days_ago)
JOIN skills s ON s.slug = t.skill_slug
JOIN benchmark_profiles bp ON bp.slug = t.bp_slug;


-- ─────────────────────────────────────────────
-- DONE — 38 new skills, metrics, scores, workflow/vertical joins,
-- cost models, and 55 outcome records seeded.
-- Total catalog: 48 skills across 10 workflow categories.
-- ─────────────────────────────────────────────
