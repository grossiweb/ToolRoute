-- Migration 016: Expand task catalog and cross-map tools to tasks
-- Adds 6 new tasks visible on the sidebar but missing from the DB,
-- maps tools to those new tasks, and fills in sparse mappings for
-- existing tasks. All inserts use ON CONFLICT DO NOTHING for idempotency.

-- ─────────────────────────────────────────────
-- NEW TASKS
-- ─────────────────────────────────────────────
INSERT INTO tasks (name, slug, description, example_query, display_order) VALUES
  ('Transcribe Audio',       'transcribe-audio',    'Convert speech to text using AI transcription services.',                    'Transcribe the product demo recording from yesterday',       36),
  ('Extract Text from PDFs', 'extract-text-pdf',    'Extract text, tables, and data from PDF documents.',                        'Extract the invoice line items from the attached PDF',       37),
  ('Generate Embeddings',    'generate-embeddings',  'Create vector embeddings for semantic search and RAG pipelines.',           'Generate embeddings for all support articles in the KB',     38),
  ('Summarize Documents',    'summarize-documents',  'Summarize long documents, articles, and reports.',                          'Summarize the 30-page quarterly board deck into key points', 39),
  ('Generate Reports',       'generate-reports',     'Create data-driven reports and dashboards.',                                'Generate a monthly revenue report with charts',              40),
  ('Analyze Code',           'analyze-code',         'Review code for bugs, vulnerabilities, and quality issues.',                'Analyze the auth module for security vulnerabilities',       41)
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────
-- TOOL MAPPINGS FOR NEW TASKS
-- ─────────────────────────────────────────────
INSERT INTO skill_tasks (skill_id, task_id, relevance_score)
SELECT s.id, ta.id, v.rel FROM (VALUES
  -- Transcribe Audio
  ('brave-search-mcp', 'transcribe-audio', 6.0),
  ('context7',         'transcribe-audio', 6.5),

  -- Extract Text from PDFs
  ('firecrawl-mcp',    'extract-text-pdf', 8.5),
  ('browserbase-mcp',  'extract-text-pdf', 7.0),
  ('brave-search-mcp', 'extract-text-pdf', 6.5),

  -- Generate Embeddings
  ('genai-toolbox',    'generate-embeddings', 9.0),
  ('context7',         'generate-embeddings', 8.0),
  ('supabase-mcp',     'generate-embeddings', 7.5),
  ('neon-mcp',         'generate-embeddings', 7.0),

  -- Summarize Documents
  ('context7',            'summarize-documents', 8.5),
  ('notion-mcp-server',   'summarize-documents', 7.5),
  ('confluence-mcp',      'summarize-documents', 7.0),
  ('obsidian-mcp',        'summarize-documents', 7.0),

  -- Generate Reports
  ('genai-toolbox',    'generate-reports', 8.5),
  ('supabase-mcp',     'generate-reports', 8.0),
  ('quickbooks-mcp',   'generate-reports', 8.0),
  ('neon-mcp',         'generate-reports', 7.5),
  ('stripe-mcp',       'generate-reports', 7.0),

  -- Analyze Code
  ('sonarqube-mcp',       'analyze-code', 9.0),
  ('snyk-mcp',            'analyze-code', 9.0),
  ('trivy-mcp',           'analyze-code', 8.5),
  ('github-mcp-server',   'analyze-code', 8.0),
  ('playwright-mcp',      'analyze-code', 7.5),
  ('gitlab-mcp',          'analyze-code', 7.5),
  ('context7',            'analyze-code', 7.0),
  ('sentry-mcp',          'analyze-code', 7.0),
  ('linear-mcp',          'analyze-code', 7.0),
  ('terraform-mcp',       'analyze-code', 7.0),
  ('tailwindcss-mcp',     'analyze-code', 7.0),
  ('storybook-mcp',       'analyze-code', 7.0),
  ('figma-context-mcp',   'analyze-code', 6.5)
) AS v(skill_slug, task_slug, rel)
JOIN skills s ON s.slug = v.skill_slug
JOIN tasks ta ON ta.slug = v.task_slug
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────
-- CROSS-MAPPINGS: Fill sparse existing tasks
-- ─────────────────────────────────────────────
INSERT INTO skill_tasks (skill_id, task_id, relevance_score)
SELECT s.id, ta.id, v.rel FROM (VALUES
  -- Web Search — add more search-capable tools
  ('exa-mcp-server',  'web-search', 9.0),
  ('context7',        'web-search', 7.0),

  -- Web Scraping — brave can assist with discovery
  ('brave-search-mcp', 'web-scraping', 7.0),

  -- Code Review — security scanners complement review
  ('snyk-mcp',  'code-review', 8.0),
  ('trivy-mcp', 'code-review', 7.5),

  -- Database Queries — context7 for docs/schema lookup
  ('context7', 'database-queries', 7.0),

  -- Data Analysis — brave for supplemental research
  ('brave-search-mcp', 'data-analysis', 6.5),

  -- Content Writing — knowledge tools aid drafting
  ('brave-search-mcp', 'content-writing', 7.0),
  ('confluence-mcp',   'content-writing', 7.5),
  ('obsidian-mcp',     'content-writing', 7.0),

  -- Knowledge Base Search — broaden knowledge sources
  ('atlassian-mcp',    'knowledge-base-search', 8.5),
  ('brave-search-mcp', 'knowledge-base-search', 7.0),

  -- Infrastructure Management — K8s is core infra
  ('kubernetes-mcp', 'infra-management', 8.5),

  -- Design-to-Code — Figma is the primary design source
  ('figma-context-mcp', 'design-to-code', 9.5),

  -- Error Monitoring — issue trackers and alerting
  ('linear-mcp', 'error-monitoring', 7.5),
  ('slack-mcp',  'error-monitoring', 6.5),

  -- Team Communication — project and planning tools
  ('notion-mcp-server', 'team-communication', 7.0),
  ('linear-mcp',        'team-communication', 7.5),

  -- Calendar Management — messaging/email overlap
  ('slack-mcp', 'calendar-management', 7.0),
  ('gmail-mcp', 'calendar-management', 7.5),

  -- Documentation Lookup — additional doc sources
  ('obsidian-mcp',  'documentation-lookup', 8.0),
  ('atlassian-mcp', 'documentation-lookup', 7.5)
) AS v(skill_slug, task_slug, rel)
JOIN skills s ON s.slug = v.skill_slug
JOIN tasks ta ON ta.slug = v.task_slug
ON CONFLICT DO NOTHING;
