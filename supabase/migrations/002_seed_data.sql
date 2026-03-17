-- ToolRoute Seed Data
-- Run AFTER 001_initial_schema.sql

-- ─────────────────────────────────────────────
-- AUTH MODES
-- ─────────────────────────────────────────────
INSERT INTO auth_modes (slug, name) VALUES
  ('none', 'None required'),
  ('api-key', 'API Key'),
  ('oauth', 'OAuth'),
  ('local-session', 'Local Session'),
  ('github-pat', 'GitHub PAT'),
  ('service-account', 'Service Account'),
  ('basic-auth', 'Basic Auth'),
  ('custom', 'Custom'),
  ('unknown', 'Unknown');

-- ─────────────────────────────────────────────
-- INSTALL METHODS
-- ─────────────────────────────────────────────
INSERT INTO install_methods (slug, name) VALUES
  ('npm', 'npm / npx'),
  ('pip', 'pip'),
  ('docker', 'Docker'),
  ('binary', 'Binary'),
  ('manual', 'Manual'),
  ('remote', 'Remote (no install)'),
  ('marketplace', 'Marketplace one-click');

-- ─────────────────────────────────────────────
-- TRANSPORT TYPES
-- ─────────────────────────────────────────────
INSERT INTO transport_types (slug, name) VALUES
  ('stdio', 'stdio'),
  ('streamable-http', 'Streamable HTTP'),
  ('sse', 'SSE'),
  ('websocket', 'WebSocket');

-- ─────────────────────────────────────────────
-- CLIENTS
-- ─────────────────────────────────────────────
INSERT INTO clients (slug, name) VALUES
  ('claude', 'Claude'),
  ('claude-desktop', 'Claude Desktop'),
  ('claude-code', 'Claude Code'),
  ('cursor', 'Cursor'),
  ('windsurf', 'Windsurf'),
  ('cline', 'Cline'),
  ('vscode', 'VS Code'),
  ('copilot', 'GitHub Copilot'),
  ('opencode', 'OpenCode'),
  ('custom', 'Custom Host');

-- ─────────────────────────────────────────────
-- RISK FLAGS
-- ─────────────────────────────────────────────
INSERT INTO risk_flags (slug, name, severity) VALUES
  ('code-execution', 'Code execution', 'high'),
  ('terminal-access', 'Terminal access', 'high'),
  ('filesystem-write', 'Filesystem write access', 'high'),
  ('browser-control', 'Browser control', 'medium'),
  ('cloud-write-access', 'Cloud write access', 'high'),
  ('repo-write-access', 'Repository write access', 'medium'),
  ('financial-data', 'Financial data access', 'high'),
  ('pii-access', 'PII access', 'high'),
  ('healthcare-data', 'Healthcare data', 'critical'),
  ('remote-unverified', 'Remote unverified source', 'medium'),
  ('abandoned-maintainer', 'Abandoned or inactive maintainer', 'medium'),
  ('poor-docs', 'Poor or incomplete documentation', 'low');

-- ─────────────────────────────────────────────
-- FUNCTIONAL ROLES
-- ─────────────────────────────────────────────
INSERT INTO functional_roles (slug, name) VALUES
  ('discovery', 'Discovery'),
  ('retrieval', 'Retrieval'),
  ('enrichment', 'Enrichment'),
  ('analysis', 'Analysis'),
  ('generation', 'Generation'),
  ('execution', 'Execution'),
  ('orchestration', 'Orchestration'),
  ('communication', 'Communication'),
  ('publishing', 'Publishing'),
  ('storage', 'Storage'),
  ('monitoring', 'Monitoring'),
  ('compliance', 'Compliance'),
  ('design', 'Design');

-- ─────────────────────────────────────────────
-- VERTICALS
-- ─────────────────────────────────────────────
INSERT INTO verticals (slug, name, description) VALUES
  ('engineering-development', 'Engineering & Development', 'Software development, DevOps, and platform engineering'),
  ('sales-revenue', 'Sales & Revenue', 'Sales research, outreach, CRM, and pipeline management'),
  ('marketing-content', 'Marketing & Content', 'Content creation, SEO, campaigns, and analytics'),
  ('finance-accounting', 'Finance & Accounting', 'Financial data, accounting, payments, and forecasting'),
  ('legal-compliance', 'Legal & Compliance', 'Legal research, contracts, compliance, and regulatory'),
  ('customer-support', 'Customer Support', 'Support automation, triage, and customer communication'),
  ('hr-recruiting', 'HR & Recruiting', 'Recruiting, screening, onboarding, and HR management'),
  ('ecommerce-retail', 'E-commerce & Retail', 'Online stores, inventory, orders, and product data'),
  ('healthcare', 'Healthcare', 'Clinical data, FHIR, medical research, and health systems'),
  ('real-estate', 'Real Estate', 'Property data, listings, market analysis, and underwriting'),
  ('education', 'Education', 'Learning management, content, and educational tools'),
  ('cybersecurity', 'Cybersecurity', 'Security scanning, vulnerability management, and compliance'),
  ('general-business-operations', 'General Business Operations', 'Cross-functional business automation and productivity');

-- ─────────────────────────────────────────────
-- WORKFLOWS
-- ─────────────────────────────────────────────
INSERT INTO workflows (slug, name, description) VALUES
  ('developer-workflow-code-management', 'Developer Workflow & Code Management', 'Coding, repo management, code review, and deployment'),
  ('research-competitive-intelligence', 'Research & Competitive Intelligence', 'Web research, source finding, and competitive analysis'),
  ('sales-research-outreach', 'Sales Research & Outreach', 'Prospect research, enrichment, and outreach automation'),
  ('content-creation-publishing', 'Content Creation & Publishing', 'Content research, writing, and CMS publishing'),
  ('data-analysis-reporting', 'Data Analysis & Reporting', 'Database queries, analysis, and report generation'),
  ('customer-support-automation', 'Customer Support Automation', 'Issue triage, escalation, and support workflows'),
  ('marketing-intelligence-campaign-management', 'Marketing Intelligence & Campaign Management', 'Analytics, ad optimization, and campaign tracking'),
  ('finance-accounting-automation', 'Finance & Accounting Automation', 'Financial data retrieval, reconciliation, and reporting'),
  ('legal-research-document-management', 'Legal Research & Document Management', 'Case research, contract review, and document workflows'),
  ('hr-recruiting-automation', 'HR & Recruiting Automation', 'Candidate screening, scheduling, and onboarding'),
  ('ecommerce-operations', 'E-commerce Operations', 'Inventory, orders, pricing, and catalog management'),
  ('qa-testing-automation', 'QA & Testing Automation', 'Browser testing, regression testing, and QA workflows'),
  ('it-devops-platform-operations', 'IT / DevOps / Platform Operations', 'Infrastructure management, monitoring, and deployment'),
  ('security-operations', 'Security Operations', 'Vulnerability scanning, compliance checking, and incident response'),
  ('design-to-code-workflow', 'Design-to-Code Workflow', 'Design handoff, component generation, and UI development'),
  ('knowledge-management', 'Knowledge Management', 'Documentation, wikis, and organizational knowledge'),
  ('executive-assistant-productivity', 'Executive Assistant & Productivity', 'Email, calendar, scheduling, and productivity automation');

-- ─────────────────────────────────────────────
-- CAPABILITIES
-- ─────────────────────────────────────────────
INSERT INTO capabilities (slug, name) VALUES
  ('browser-automation', 'Browser Automation'),
  ('web-search', 'Web Search'),
  ('web-crawling-scraping', 'Web Crawling & Scraping'),
  ('documentation-knowledge-retrieval', 'Documentation & Knowledge Retrieval'),
  ('code-repositories', 'Code & Repositories'),
  ('ide-developer-tools', 'IDE & Developer Tools'),
  ('filesystem-local-machine', 'Filesystem & Local Machine'),
  ('terminal-command-execution', 'Terminal & Command Execution'),
  ('databases', 'Databases'),
  ('data-warehouses-query-engines', 'Data Warehouses & Query Engines'),
  ('vector-databases-rag', 'Vector Databases & RAG'),
  ('cloud-infrastructure', 'Cloud & Infrastructure'),
  ('devops-ci-cd', 'DevOps & CI/CD'),
  ('monitoring-observability', 'Monitoring & Observability'),
  ('security-compliance-tooling', 'Security & Compliance Tooling'),
  ('communication-messaging', 'Communication & Messaging'),
  ('email', 'Email'),
  ('calendar-scheduling', 'Calendar & Scheduling'),
  ('project-management-tickets', 'Project Management & Tickets'),
  ('notes-docs-knowledge-bases', 'Notes, Docs & Knowledge Bases'),
  ('spreadsheets-bi', 'Spreadsheets & BI'),
  ('design-creative-tools', 'Design & Creative Tools'),
  ('cms-publishing', 'CMS & Publishing'),
  ('marketing-tools', 'Marketing Tools'),
  ('crm-revenue-systems', 'CRM & Revenue Systems'),
  ('ecommerce-platforms', 'E-commerce Platforms'),
  ('payments-billing', 'Payments & Billing'),
  ('finance-data-market-intelligence', 'Finance Data & Market Intelligence'),
  ('accounting-erp', 'Accounting & ERP'),
  ('legal-documents-contracts', 'Legal Documents & Contracts'),
  ('hr-recruiting-systems', 'HR & Recruiting Systems'),
  ('customer-support-systems', 'Customer Support Systems'),
  ('healthcare-clinical-data', 'Healthcare & Clinical Data'),
  ('real-estate-property-systems', 'Real Estate & Property Systems'),
  ('agent-orchestration', 'Agent Orchestration'),
  ('memory-personalization', 'Memory & Personalization'),
  ('automation-integration-hubs', 'Automation & Integration Hubs'),
  ('media-generation-processing', 'Media Generation & Processing'),
  ('generic-utilities', 'Generic Utilities');

-- ─────────────────────────────────────────────
-- BENCHMARK PROFILES
-- ─────────────────────────────────────────────
INSERT INTO benchmark_profiles (slug, name, description, workflow_slug) VALUES
  ('web-research-profile-v1', 'Web Research v1', 'Competitive research, source finding, and content extraction', 'research-competitive-intelligence'),
  ('browser-task-completion-v1', 'Browser Task Completion v1', 'Navigation, form filling, clicking, and data extraction', 'qa-testing-automation'),
  ('repo-qa-profile-v1', 'Repository Q&A v1', 'Codebase Q&A, repo actions, and workflow automation', 'developer-workflow-code-management'),
  ('database-query-analysis-v1', 'Database Query & Analysis v1', 'Schema-aware query assistance and data analysis', 'data-analysis-reporting'),
  ('crm-enrichment-v1', 'CRM Enrichment v1', 'Lead and company enrichment and field accuracy', 'sales-research-outreach'),
  ('publishing-workflow-v1', 'Publishing Workflow v1', 'Content formatting and CMS handoff quality', 'content-creation-publishing'),
  ('ticket-triage-v1', 'Ticket Triage v1', 'Support and engineering issue routing and classification', 'customer-support-automation'),
  ('ecommerce-catalog-extraction-v1', 'E-commerce Catalog Extraction v1', 'Catalog, pricing, and product data extraction', 'ecommerce-operations');

-- ─────────────────────────────────────────────
-- SEED SKILLS (Top 10 to start)
-- ─────────────────────────────────────────────
INSERT INTO skills (canonical_name, slug, repo_url, vendor_name, vendor_type, short_description, open_source, remote_available, local_available, status, featured, license) VALUES
  ('Context7', 'context7', 'https://github.com/upstash/context7', 'Upstash', 'official', 'Pulls current, version-specific docs and examples directly into coding agents — fixes stale documentation.', true, true, true, 'active', true, 'MIT'),
  ('Playwright MCP', 'playwright-mcp', 'https://github.com/microsoft/playwright-mcp', 'Microsoft', 'official', 'Browser automation through structured accessibility snapshots for LLMs — navigate, click, fill, and extract.', true, false, true, 'active', true, 'Apache-2.0'),
  ('GitHub MCP Server', 'github-mcp-server', 'https://github.com/github/github-mcp-server', 'GitHub', 'official', 'Read repos, manage PRs and issues, analyze workflows, and automate GitHub operations.', true, true, true, 'active', true, 'MIT'),
  ('Firecrawl MCP', 'firecrawl-mcp', 'https://github.com/firecrawl/firecrawl-mcp-server', 'Firecrawl', 'official', 'Web scraping, crawling, discovery, and deep research — the core web intelligence skill.', true, false, true, 'active', true, 'MIT'),
  ('Exa MCP Server', 'exa-mcp-server', 'https://github.com/exa-labs/exa-mcp-server', 'Exa Labs', 'official', 'Exa AI search and crawling for real-time web information — fast and cost-efficient.', true, false, true, 'active', true, 'MIT'),
  ('AWS MCP', 'aws-mcp', 'https://github.com/awslabs/mcp', 'AWS', 'official', 'AWS best-practice-aware MCP servers for cloud infrastructure and development workflows.', true, false, true, 'active', true, 'Apache-2.0'),
  ('Figma Context MCP', 'figma-context-mcp', 'https://github.com/GLips/Figma-Context-MCP', 'GLips', 'community', 'Gives coding agents access to Figma files and layout data for accurate code generation.', true, false, true, 'active', true, 'MIT'),
  ('Atlassian MCP', 'atlassian-mcp', 'https://github.com/sooperset/mcp-atlassian', 'Community', 'community', 'MCP server for Jira and Confluence — manage tickets, pages, and team workflows.', true, false, true, 'active', false, 'MIT'),
  ('Notion MCP Server', 'notion-mcp-server', 'https://github.com/makenotion/notion-mcp-server', 'Notion', 'official', 'Official Notion API MCP server — read and write your Notion workspace from any agent.', true, false, true, 'active', true, 'MIT'),
  ('GenAI Toolbox', 'genai-toolbox', 'https://github.com/googleapis/genai-toolbox', 'Google', 'official', 'Database-focused MCP supporting BigQuery, Neo4j, Postgres, and Spanner — Google-scale data access.', true, false, true, 'active', false, 'Apache-2.0');

-- Seed metrics for the skills above (approximate values)
INSERT INTO skill_metrics (skill_id, github_stars, github_forks, open_issues, days_since_last_commit)
SELECT id, stars, forks, issues, days FROM (
  VALUES
    ('context7'::text,        49100, 1200, 142, 5),
    ('playwright-mcp',        29000,  800,  20, 6),
    ('github-mcp-server',     27900,  900, 169, 0),
    ('firecrawl-mcp',          5800,  200,  49, 3),
    ('exa-mcp-server',         4000,  150,  11, 7),
    ('aws-mcp',                8500,  300, 125, 5),
    ('figma-context-mcp',     13700,  400,  24, 14),
    ('atlassian-mcp',          4600,  200, 129, 10),
    ('notion-mcp-server',      4000,  180, 100, 12),
    ('genai-toolbox',         13400,  500, 121, 2)
) AS t(slug, stars, forks, issues, days)
JOIN skills s ON s.slug = t.slug;

-- Seed scores for the skills above (hand-curated initial values)
INSERT INTO skill_scores (skill_id, adoption_score, freshness_score, trust_score, setup_score, reliability_score, output_score, efficiency_score, cost_score, value_score, overall_score)
SELECT id, adoption, freshness, trust, setup, reliability, output, efficiency, cost, value, overall FROM (
  VALUES
    ('context7'::text,        9.5, 9.8, 8.5, 8.0, 9.0, 9.5, 8.5, 8.0, 9.2, 9.5),
    ('playwright-mcp',        9.3, 9.7, 9.0, 8.5, 9.2, 9.3, 8.8, 8.5, 9.1, 9.3),
    ('github-mcp-server',     9.2, 9.9, 9.5, 7.5, 8.8, 9.2, 8.5, 8.0, 9.0, 9.2),
    ('firecrawl-mcp',         8.9, 9.7, 8.0, 8.0, 8.5, 9.0, 8.0, 7.5, 8.7, 8.9),
    ('exa-mcp-server',        8.7, 9.5, 8.0, 8.5, 8.8, 8.5, 9.0, 8.8, 8.8, 8.7),
    ('aws-mcp',               9.0, 9.8, 9.5, 7.0, 9.0, 9.0, 8.5, 7.8, 8.9, 9.0),
    ('figma-context-mcp',     8.9, 8.5, 8.0, 7.5, 8.5, 9.0, 8.5, 8.0, 8.8, 8.9),
    ('atlassian-mcp',         8.5, 9.0, 8.5, 7.5, 8.5, 8.5, 8.0, 8.0, 8.4, 8.5),
    ('notion-mcp-server',     8.6, 8.8, 9.0, 7.5, 8.8, 8.5, 8.0, 8.5, 8.6, 8.6),
    ('genai-toolbox',         9.0, 9.9, 9.5, 7.0, 9.0, 9.2, 8.5, 8.0, 9.0, 9.0)
) AS t(slug, adoption, freshness, trust, setup, reliability, output, efficiency, cost, value, overall)
JOIN skills s ON s.slug = t.slug;

-- ─────────────────────────────────────────────
-- SEED COMBINATIONS
-- ─────────────────────────────────────────────
INSERT INTO combinations (slug, name, headline, description, setup_complexity, confidence_level, featured) VALUES
  ('code-copilot-stack', 'Code Copilot Stack', 'Docs + repo context + browser execution', 'Combines current docs retrieval, repository actions, and browser automation for the most complete coding agent workflow.', 'medium', 'high', true),
  ('deep-research-desk', 'Deep Research Desk', 'Find · crawl · browse · synthesize', 'The complete web intelligence stack — Firecrawl for extraction, Exa for search, Playwright for dynamic pages.', 'medium', 'high', true),
  ('sales-research-stack', 'The Sales Research Stack', 'Research · enrich · draft · log', 'Give your agent the ability to research a prospect, enrich their data, and draft personalized outreach automatically.', 'medium', 'high', true),
  ('cloud-debug-stack', 'Cloud Debug Stack', 'Code + cloud + security in one workflow', 'Inspect code, scan for vulnerabilities, and query cloud resources together for DevOps workflows.', 'high', 'high', false),
  ('design-to-code-stack', 'Design-to-Code Stack', 'Design → code → test', 'Extract Figma design specs, write code against them, and test the result in a browser automatically.', 'medium', 'high', true),
  ('support-triage-desk', 'Support Triage Desk', 'Issue → ticket → notify', 'Reproduce GitHub issues, create Jira tickets, and notify the team via Slack — full support triage loop.', 'medium', 'high', false),
  ('data-report-builder', 'Data Report Builder', 'Query · analyze · visualize', 'Query databases with GenAI Toolbox, run analysis in Python, and generate charts and reports.', 'medium', 'high', false),
  ('product-coordination-stack', 'Product Coordination Stack', 'Tickets + code + docs + comms', 'Keep Jira, GitHub, Notion, and Slack synchronized — the full product engineering coordination loop.', 'high', 'high', false);

-- Link combinations to skills
-- Code Copilot Stack
INSERT INTO combination_skills (combination_id, skill_id, role_in_combo, sequence_order)
SELECT c.id, s.id, role, seq FROM (
  VALUES ('code-copilot-stack', 'context7', 'retrieval', 1),
         ('code-copilot-stack', 'github-mcp-server', 'execution', 2),
         ('code-copilot-stack', 'playwright-mcp', 'execution', 3)
) AS t(combo_slug, skill_slug, role, seq)
JOIN combinations c ON c.slug = t.combo_slug
JOIN skills s ON s.slug = t.skill_slug;

-- Deep Research Desk
INSERT INTO combination_skills (combination_id, skill_id, role_in_combo, sequence_order)
SELECT c.id, s.id, role, seq FROM (
  VALUES ('deep-research-desk', 'firecrawl-mcp', 'retrieval', 1),
         ('deep-research-desk', 'exa-mcp-server', 'discovery', 2),
         ('deep-research-desk', 'playwright-mcp', 'execution', 3)
) AS t(combo_slug, skill_slug, role, seq)
JOIN combinations c ON c.slug = t.combo_slug
JOIN skills s ON s.slug = t.skill_slug;

-- Sales Research Stack
INSERT INTO combination_skills (combination_id, skill_id, role_in_combo, sequence_order)
SELECT c.id, s.id, role, seq FROM (
  VALUES ('sales-research-stack', 'firecrawl-mcp', 'retrieval', 1),
         ('sales-research-stack', 'exa-mcp-server', 'discovery', 2)
) AS t(combo_slug, skill_slug, role, seq)
JOIN combinations c ON c.slug = t.combo_slug
JOIN skills s ON s.slug = t.skill_slug;

-- Link combinations to verticals
INSERT INTO combination_verticals (combination_id, vertical_id)
SELECT c.id, v.id FROM (
  VALUES
    ('code-copilot-stack', 'engineering-development'),
    ('deep-research-desk', 'marketing-content'),
    ('deep-research-desk', 'sales-revenue'),
    ('sales-research-stack', 'sales-revenue'),
    ('cloud-debug-stack', 'engineering-development'),
    ('design-to-code-stack', 'engineering-development'),
    ('support-triage-desk', 'customer-support'),
    ('data-report-builder', 'finance-accounting'),
    ('product-coordination-stack', 'engineering-development')
) AS t(combo_slug, vertical_slug)
JOIN combinations c ON c.slug = t.combo_slug
JOIN verticals v ON v.slug = t.vertical_slug;

-- ─────────────────────────────────────────────
-- VERTICAL PAGES
-- ─────────────────────────────────────────────
INSERT INTO vertical_pages (vertical_id, summary, featured)
SELECT v.id, summary, featured FROM (
  VALUES
    ('engineering-development'::text, 'The deepest MCP vertical — 6,800+ servers across docs, code, browser, cloud, and security tools.', true),
    ('sales-revenue', 'Sales research, prospect enrichment, CRM automation, and outreach at scale.', true),
    ('marketing-content', 'Content research, SEO intelligence, campaign management, and CMS publishing.', true),
    ('ecommerce-retail', 'Inventory management, catalog extraction, payment processing, and order automation.', false),
    ('finance-accounting', 'Market data, financial research, accounting automation, and payment reconciliation.', false)
) AS t(slug, summary, featured)
JOIN verticals v ON v.slug = t.slug;
