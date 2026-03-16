-- ToolRoute Migration 008: Tasks and Tool Types
-- Adds two new discovery axes for multi-dimensional tool routing

-- ─────────────────────────────────────────────
-- TOOL TYPES (Leaderboard categories)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tool_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────
-- TASKS (Atomic actions)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  example_query TEXT,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────
-- JUNCTION TABLES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS skill_tool_types (
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  tool_type_id UUID REFERENCES tool_types(id) ON DELETE CASCADE,
  PRIMARY KEY (skill_id, tool_type_id)
);

CREATE TABLE IF NOT EXISTS skill_tasks (
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  relevance_score NUMERIC(3,1) DEFAULT 8.0,
  PRIMARY KEY (skill_id, task_id)
);

CREATE TABLE IF NOT EXISTS task_workflows (
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, workflow_id)
);

-- ─────────────────────────────────────────────
-- SEED TOOL TYPES
-- ─────────────────────────────────────────────
INSERT INTO tool_types (slug, name, description, icon, display_order) VALUES
  ('mcp-servers', 'MCP Servers', 'Model Context Protocol servers that extend AI agent capabilities', '🔌', 1),
  ('language-models', 'Language Models', 'Large language models for text generation, reasoning, and analysis', '🧠', 2),
  ('embedding-models', 'Embedding Models', 'Models that convert text to vector representations for similarity search', '📐', 3),
  ('vector-databases', 'Vector Databases', 'Databases optimized for storing and querying vector embeddings', '🗄️', 4),
  ('speech-to-text', 'Speech to Text', 'Audio transcription and speech recognition services', '🎤', 5),
  ('text-to-speech', 'Text to Speech', 'Voice synthesis and audio generation from text', '🔊', 6),
  ('ocr', 'OCR', 'Optical character recognition for extracting text from images and documents', '📄', 7),
  ('vision-models', 'Vision Models', 'Image understanding, classification, and visual reasoning models', '👁️', 8),
  ('agent-frameworks', 'Agent Frameworks', 'Frameworks for building autonomous AI agents', '🤖', 9),
  ('rag-tools', 'RAG Tools', 'Retrieval-augmented generation tools for grounding LLM outputs', '📚', 10),
  ('evaluation-tools', 'Evaluation Tools', 'Tools for measuring AI model and pipeline quality', '📊', 11),
  ('observability', 'Observability', 'Monitoring, logging, and tracing for AI systems', '🔍', 12),
  ('data-pipelines', 'Data Pipelines', 'ETL, data processing, and pipeline orchestration tools', '⚡', 13),
  ('code-generation', 'Code Generation', 'AI-powered code completion, generation, and transformation', '💻', 14),
  ('image-generation', 'Image Generation', 'AI image creation, editing, and manipulation tools', '🎨', 15),
  ('search-engines', 'Search Engines', 'AI-powered search and information retrieval services', '🔎', 16),
  ('automation-platforms', 'Automation Platforms', 'Workflow automation and integration platforms', '⚙️', 17),
  ('security-tools', 'Security Tools', 'AI security scanning, vulnerability detection, and compliance', '🛡️', 18)
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────
-- SEED TASKS
-- ─────────────────────────────────────────────
INSERT INTO tasks (slug, name, description, example_query, display_order) VALUES
  ('transcribe-audio', 'Transcribe Audio', 'Convert spoken audio to accurate text transcripts', 'transcribe this meeting recording', 1),
  ('extract-text-pdf', 'Extract Text from PDFs', 'Parse and extract structured text content from PDF documents', 'extract all text and tables from this PDF', 2),
  ('generate-embeddings', 'Generate Embeddings', 'Convert text into vector embeddings for semantic search', 'embed these documents for similarity search', 3),
  ('summarize-documents', 'Summarize Documents', 'Create concise summaries of long documents or articles', 'summarize this 50-page report', 4),
  ('translate-text', 'Translate Text', 'Translate content between languages with high accuracy', 'translate this contract to Spanish', 5),
  ('generate-speech', 'Generate Speech', 'Convert text to natural-sounding speech audio', 'generate a voiceover for this script', 6),
  ('detect-sentiment', 'Detect Sentiment', 'Analyze text for emotional tone and sentiment polarity', 'analyze sentiment of customer reviews', 7),
  ('classify-text', 'Classify Text', 'Categorize text into predefined or dynamic categories', 'classify these support tickets by urgency', 8),
  ('generate-images', 'Generate Images', 'Create images from text descriptions or prompts', 'generate a product mockup image', 9),
  ('caption-images', 'Caption Images', 'Generate descriptive captions for images', 'describe what is in this screenshot', 10),
  ('scrape-web-pages', 'Scrape Web Pages', 'Extract structured data from websites and web pages', 'scrape competitor pricing from their website', 11),
  ('search-web', 'Search the Web', 'Find and retrieve relevant information from the internet', 'find recent news about this company', 12),
  ('query-databases', 'Query Databases', 'Generate and execute database queries from natural language', 'show me all orders from last month', 13),
  ('manage-repositories', 'Manage Repositories', 'Create, update, and manage code repositories and pull requests', 'create a PR for this bug fix', 14),
  ('automate-browser', 'Automate Browser', 'Control web browsers programmatically for testing and data collection', 'fill out this web form automatically', 15),
  ('manage-tickets', 'Manage Tickets', 'Create, update, and triage project management tickets', 'create a Jira ticket for this bug', 16),
  ('send-emails', 'Send Emails', 'Compose and send emails programmatically', 'draft and send a follow-up email', 17),
  ('schedule-meetings', 'Schedule Meetings', 'Manage calendar events and meeting scheduling', 'find a time that works for everyone', 18),
  ('manage-crm', 'Manage CRM', 'Update and query customer relationship management systems', 'add this lead to the sales pipeline', 19),
  ('analyze-code', 'Analyze Code', 'Review code for bugs, vulnerabilities, and quality issues', 'scan this codebase for security issues', 20),
  ('deploy-infrastructure', 'Deploy Infrastructure', 'Provision and manage cloud infrastructure resources', 'deploy this app to production', 21),
  ('process-payments', 'Process Payments', 'Handle payment transactions, subscriptions, and billing', 'create a subscription for this customer', 22),
  ('manage-content', 'Manage Content', 'Create, edit, and publish content in CMS platforms', 'publish this blog post to WordPress', 23),
  ('enrich-leads', 'Enrich Leads', 'Find and append data to sales leads and contacts', 'find the email and company info for this person', 24),
  ('monitor-errors', 'Monitor Errors', 'Track, alert on, and diagnose application errors', 'show me the most common errors this week', 25),
  ('generate-reports', 'Generate Reports', 'Create data-driven reports and visualizations', 'generate a monthly revenue report', 26),
  ('review-contracts', 'Review Contracts', 'Analyze legal documents for risks and key terms', 'identify risky clauses in this contract', 27),
  ('manage-inventory', 'Manage Inventory', 'Track and manage product inventory and stock levels', 'check stock levels for these products', 28)
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────
-- MAP ALL EXISTING SKILLS TO MCP SERVERS TOOL TYPE
-- ─────────────────────────────────────────────
INSERT INTO skill_tool_types (skill_id, tool_type_id)
SELECT s.id, tt.id
FROM skills s
CROSS JOIN tool_types tt
WHERE tt.slug = 'mcp-servers'
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────
-- MAP SKILLS TO TASKS
-- ─────────────────────────────────────────────
INSERT INTO skill_tasks (skill_id, task_id, relevance_score)
SELECT s.id, t2.id, rel FROM (
  VALUES
    -- Research tools
    ('firecrawl-mcp'::text, 'scrape-web-pages'::text, 9.5),
    ('firecrawl-mcp', 'search-web', 8.0),
    ('firecrawl-mcp', 'extract-text-pdf', 7.0),
    ('exa-mcp-server', 'search-web', 9.5),
    ('exa-mcp-server', 'scrape-web-pages', 7.0),
    ('brave-search-mcp', 'search-web', 9.0),
    ('tavily-mcp', 'search-web', 9.0),
    ('tavily-mcp', 'summarize-documents', 7.5),
    ('perplexity-mcp', 'search-web', 9.0),
    ('perplexity-mcp', 'summarize-documents', 8.5),
    -- Browser automation
    ('playwright-mcp', 'automate-browser', 9.5),
    ('playwright-mcp', 'scrape-web-pages', 8.0),
    ('browserbase-mcp', 'automate-browser', 9.0),
    ('browserbase-mcp', 'scrape-web-pages', 7.5),
    ('puppeteer-mcp', 'automate-browser', 8.5),
    ('puppeteer-mcp', 'scrape-web-pages', 7.5),
    -- Developer tools
    ('context7', 'analyze-code', 7.0),
    ('github-mcp-server', 'manage-repositories', 9.5),
    ('github-mcp-server', 'analyze-code', 7.0),
    ('gitlab-mcp', 'manage-repositories', 9.0),
    ('linear-mcp', 'manage-tickets', 9.0),
    ('sentry-mcp', 'monitor-errors', 9.5),
    -- DevOps
    ('aws-mcp', 'deploy-infrastructure', 9.0),
    ('terraform-mcp', 'deploy-infrastructure', 9.5),
    ('kubernetes-mcp', 'deploy-infrastructure', 9.0),
    ('cloudflare-mcp', 'deploy-infrastructure', 8.5),
    -- Data
    ('genai-toolbox', 'query-databases', 9.5),
    ('genai-toolbox', 'generate-reports', 8.0),
    ('supabase-mcp', 'query-databases', 9.0),
    ('neon-mcp', 'query-databases', 9.0),
    -- Knowledge & content
    ('notion-mcp-server', 'manage-content', 8.5),
    ('notion-mcp-server', 'summarize-documents', 7.0),
    ('obsidian-mcp', 'manage-content', 8.0),
    ('obsidian-mcp', 'summarize-documents', 7.0),
    ('confluence-mcp', 'manage-content', 8.0),
    ('wordpress-mcp', 'manage-content', 9.0),
    ('sanity-mcp', 'manage-content', 9.0),
    ('ghost-mcp', 'manage-content', 8.5),
    -- Design
    ('figma-context-mcp', 'analyze-code', 7.5),
    ('storybook-mcp', 'analyze-code', 7.0),
    ('tailwindcss-mcp', 'analyze-code', 7.0),
    -- Support & tickets
    ('atlassian-mcp', 'manage-tickets', 9.5),
    ('zendesk-mcp', 'manage-tickets', 9.0),
    ('zendesk-mcp', 'classify-text', 7.5),
    ('intercom-mcp', 'manage-tickets', 8.5),
    ('intercom-mcp', 'classify-text', 7.0),
    -- Sales & CRM
    ('hubspot-mcp', 'manage-crm', 9.5),
    ('hubspot-mcp', 'enrich-leads', 7.5),
    ('apollo-mcp', 'enrich-leads', 9.5),
    ('apollo-mcp', 'manage-crm', 7.0),
    ('salesforce-mcp', 'manage-crm', 9.5),
    ('salesforce-mcp', 'generate-reports', 7.5),
    -- Marketing
    ('google-ads-mcp', 'generate-reports', 8.5),
    ('mailchimp-mcp', 'send-emails', 9.0),
    ('semrush-mcp', 'search-web', 8.0),
    ('semrush-mcp', 'generate-reports', 8.0),
    -- Finance
    ('stripe-mcp', 'process-payments', 9.5),
    ('quickbooks-mcp', 'generate-reports', 8.5),
    ('quickbooks-mcp', 'process-payments', 7.5),
    ('plaid-mcp', 'process-payments', 8.5),
    -- Legal
    ('docusign-mcp', 'review-contracts', 8.0),
    ('legalforce-mcp', 'review-contracts', 9.0),
    ('courtlistener-mcp', 'review-contracts', 7.5),
    ('courtlistener-mcp', 'search-web', 7.0),
    -- HR
    ('greenhouse-mcp', 'manage-tickets', 7.5),
    ('lever-mcp', 'manage-tickets', 7.5),
    ('bamboohr-mcp', 'generate-reports', 7.0),
    -- E-commerce
    ('shopify-mcp', 'manage-inventory', 9.5),
    ('shopify-mcp', 'process-payments', 7.5),
    ('woocommerce-mcp', 'manage-inventory', 9.0),
    ('woocommerce-mcp', 'manage-content', 7.0),
    ('amazon-seller-mcp', 'manage-inventory', 9.0),
    -- Security
    ('snyk-mcp', 'analyze-code', 9.0),
    ('sonarqube-mcp', 'analyze-code', 9.0),
    ('trivy-mcp', 'analyze-code', 8.5),
    -- Productivity
    ('google-calendar-mcp', 'schedule-meetings', 9.5),
    ('slack-mcp', 'send-emails', 7.0),
    ('gmail-mcp', 'send-emails', 9.5),
    ('gmail-mcp', 'classify-text', 7.0)
) AS t(skill_slug, task_slug, rel)
JOIN skills s ON s.slug = t.skill_slug
JOIN tasks t2 ON t2.slug = t.task_slug
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────
-- MAP TASKS TO WORKFLOWS
-- ─────────────────────────────────────────────
INSERT INTO task_workflows (task_id, workflow_id)
SELECT t.id, w.id FROM (
  VALUES
    ('scrape-web-pages'::text, 'research-competitive-intelligence'::text),
    ('search-web', 'research-competitive-intelligence'),
    ('summarize-documents', 'research-competitive-intelligence'),
    ('automate-browser', 'qa-testing-automation'),
    ('manage-repositories', 'developer-workflow-code-management'),
    ('analyze-code', 'developer-workflow-code-management'),
    ('monitor-errors', 'developer-workflow-code-management'),
    ('deploy-infrastructure', 'it-devops-platform-operations'),
    ('query-databases', 'data-analysis-reporting'),
    ('generate-reports', 'data-analysis-reporting'),
    ('manage-content', 'content-creation-publishing'),
    ('manage-tickets', 'customer-support-automation'),
    ('classify-text', 'customer-support-automation'),
    ('manage-crm', 'sales-research-outreach'),
    ('enrich-leads', 'sales-research-outreach'),
    ('send-emails', 'executive-assistant-productivity'),
    ('schedule-meetings', 'executive-assistant-productivity'),
    ('process-payments', 'finance-accounting-automation'),
    ('review-contracts', 'legal-research-document-management'),
    ('manage-inventory', 'ecommerce-operations'),
    ('detect-sentiment', 'marketing-intelligence-campaign-management'),
    ('generate-images', 'content-creation-publishing'),
    ('transcribe-audio', 'content-creation-publishing'),
    ('extract-text-pdf', 'data-analysis-reporting'),
    ('generate-embeddings', 'data-analysis-reporting'),
    ('translate-text', 'content-creation-publishing'),
    ('generate-speech', 'content-creation-publishing'),
    ('caption-images', 'content-creation-publishing')
) AS t(task_slug, workflow_slug)
JOIN tasks t2 ON t2.slug = t.task_slug
JOIN workflows w ON w.slug = t.workflow_slug
ON CONFLICT DO NOTHING;
