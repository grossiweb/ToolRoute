-- NeoSkill — Olympics, Missions & Agent Leaderboard
-- Run AFTER 002_seed_data.sql
-- Version: 1.1 | March 2026

-- ─────────────────────────────────────────────
-- OLYMPIC EVENTS
-- ─────────────────────────────────────────────

CREATE TABLE olympic_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  benchmark_profile_id UUID NOT NULL REFERENCES benchmark_profiles(id) ON DELETE CASCADE,
  event_number INT NOT NULL,
  status TEXT CHECK (status IN ('open','running','completed','paused')) DEFAULT 'open',
  min_sample_size INT NOT NULL DEFAULT 5,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_olympic_events_status ON olympic_events(status);

-- Skills competing in each event
CREATE TABLE olympic_event_competitors (
  event_id UUID NOT NULL REFERENCES olympic_events(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  medal TEXT CHECK (medal IN ('gold','silver','bronze',NULL)),
  rank INT,
  value_score NUMERIC(4,2),
  sample_size INT NOT NULL DEFAULT 0,
  last_updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, skill_id)
);

-- ─────────────────────────────────────────────
-- BENCHMARK MISSIONS
-- ─────────────────────────────────────────────

CREATE TABLE benchmark_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES olympic_events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  task_prompt TEXT NOT NULL,
  task_fingerprint TEXT NOT NULL,
  skill_ids UUID[] NOT NULL,
  reward_multiplier NUMERIC(4,2) NOT NULL DEFAULT 2.5,
  max_claims INT NOT NULL DEFAULT 50,
  claimed_count INT NOT NULL DEFAULT 0,
  completed_count INT NOT NULL DEFAULT 0,
  status TEXT CHECK (status IN ('available','fully_claimed','completed','expired')) DEFAULT 'available',
  expires_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_benchmark_missions_status ON benchmark_missions(status);
CREATE INDEX idx_benchmark_missions_event ON benchmark_missions(event_id);

CREATE TABLE mission_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES benchmark_missions(id) ON DELETE CASCADE,
  agent_identity_id UUID NOT NULL REFERENCES agent_identities(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('claimed','in_progress','completed','expired','abandoned')) DEFAULT 'claimed',
  claimed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  results_json JSONB,
  reward_routing_credits INT DEFAULT 0,
  reward_reputation_points INT DEFAULT 0,
  UNIQUE(mission_id, agent_identity_id)
);

CREATE INDEX idx_mission_claims_agent ON mission_claims(agent_identity_id);
CREATE INDEX idx_mission_claims_status ON mission_claims(status);

-- ─────────────────────────────────────────────
-- AGENT LEADERBOARD
-- ─────────────────────────────────────────────

CREATE TABLE agent_leaderboard (
  agent_identity_id UUID NOT NULL REFERENCES agent_identities(id) ON DELETE CASCADE,
  workflow_slug TEXT NOT NULL,
  total_runs INT NOT NULL DEFAULT 0,
  success_count INT NOT NULL DEFAULT 0,
  success_rate NUMERIC(6,4) NOT NULL DEFAULT 0,
  avg_value_score NUMERIC(4,2),
  avg_latency_ms INT,
  avg_cost_usd NUMERIC(10,4),
  missions_completed INT NOT NULL DEFAULT 0,
  rank INT,
  last_run_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (agent_identity_id, workflow_slug)
);

CREATE INDEX idx_agent_leaderboard_workflow ON agent_leaderboard(workflow_slug);
CREATE INDEX idx_agent_leaderboard_rank ON agent_leaderboard(workflow_slug, rank);

-- Global agent stats (aggregated across all workflows)
CREATE TABLE agent_global_stats (
  agent_identity_id UUID PRIMARY KEY REFERENCES agent_identities(id) ON DELETE CASCADE,
  total_runs INT NOT NULL DEFAULT 0,
  total_success INT NOT NULL DEFAULT 0,
  overall_success_rate NUMERIC(6,4) NOT NULL DEFAULT 0,
  overall_avg_value_score NUMERIC(4,2),
  total_missions_completed INT NOT NULL DEFAULT 0,
  total_routing_credits INT NOT NULL DEFAULT 0,
  total_reputation_points INT NOT NULL DEFAULT 0,
  global_rank INT,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- BENCHMARK REPORTS
-- ─────────────────────────────────────────────

CREATE TABLE benchmark_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  benchmark_profile_id UUID REFERENCES benchmark_profiles(id) ON DELETE SET NULL,
  event_id UUID REFERENCES olympic_events(id) ON DELETE SET NULL,
  summary TEXT NOT NULL,
  methodology TEXT NOT NULL,
  findings_json JSONB NOT NULL DEFAULT '{}',
  sample_size INT NOT NULL DEFAULT 0,
  report_period_start TIMESTAMP,
  report_period_end TIMESTAMP,
  published BOOLEAN DEFAULT false,
  published_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_benchmark_reports_published ON benchmark_reports(published) WHERE published = true;

-- ─────────────────────────────────────────────
-- SEED OLYMPIC EVENTS (the 10 from the spec)
-- ─────────────────────────────────────────────

INSERT INTO olympic_events (slug, name, description, benchmark_profile_id, event_number, status)
SELECT t.slug, t.name, t.description, bp.id, t.event_num, 'open' FROM (
  VALUES
    ('web-research-extraction', 'Web Research Extraction', 'Firecrawl vs Exa vs Tavily — competitive research, source finding, and structured data extraction from the web.', 'web-research-profile-v1', 1),
    ('browser-task-completion', 'Browser Task Completion', 'Playwright vs Chrome DevTools vs Skyvern — navigation, form filling, data extraction, and multi-step browser workflows.', 'browser-task-completion-v1', 2),
    ('repo-question-answering', 'Repo Question Answering', 'GitHub MCP vs Context7 vs GitMCP — codebase Q&A, repo navigation, and developer workflow automation.', 'repo-qa-profile-v1', 3),
    ('pdf-document-extraction', 'PDF & Document Extraction', 'Unstructured vs document tools — PDF parsing, table extraction, and structured output from complex documents.', 'web-research-profile-v1', 4),
    ('knowledge-base-search', 'Knowledge Base Search', 'Notion vs Confluence vs Slack — enterprise knowledge retrieval, search quality, and cross-platform coverage.', 'web-research-profile-v1', 5),
    ('database-query-generation', 'Database Query Generation', 'Postgres vs BigQuery vs GenAI Toolbox — schema-aware SQL generation, query accuracy, and data analysis.', 'database-query-analysis-v1', 6),
    ('workflow-automation', 'Workflow Automation', 'Zapier vs Pipedream vs Activepieces — multi-step workflow execution, reliability, and integration breadth.', 'web-research-profile-v1', 7),
    ('code-intelligence', 'Code Intelligence', 'GitHub MCP vs Semgrep vs Context7 — code analysis, security scanning, and codebase understanding.', 'repo-qa-profile-v1', 8),
    ('crm-enrichment', 'CRM Enrichment', 'Salesforce vs HubSpot vs enrichment tools — lead data accuracy, field coverage, and enrichment speed.', 'crm-enrichment-v1', 9),
    ('data-pipeline-orchestration', 'Data Pipeline Orchestration', 'Dagster vs n8n vs automation tools — pipeline reliability, scheduling, and data transformation quality.', 'database-query-analysis-v1', 10)
) AS t(slug, name, description, bp_slug, event_num)
JOIN benchmark_profiles bp ON bp.slug = t.bp_slug::text;

-- Seed competitors for existing skills
-- Event 1: Web Research Extraction
INSERT INTO olympic_event_competitors (event_id, skill_id, sample_size)
SELECT e.id, s.id, 0 FROM olympic_events e, skills s
WHERE e.slug = 'web-research-extraction' AND s.slug IN ('firecrawl-mcp', 'exa-mcp-server');

-- Event 2: Browser Task Completion
INSERT INTO olympic_event_competitors (event_id, skill_id, sample_size)
SELECT e.id, s.id, 0 FROM olympic_events e, skills s
WHERE e.slug = 'browser-task-completion' AND s.slug = 'playwright-mcp';

-- Event 3: Repo Question Answering
INSERT INTO olympic_event_competitors (event_id, skill_id, sample_size)
SELECT e.id, s.id, 0 FROM olympic_events e, skills s
WHERE e.slug = 'repo-question-answering' AND s.slug IN ('github-mcp-server', 'context7');

-- Event 6: Database Query Generation
INSERT INTO olympic_event_competitors (event_id, skill_id, sample_size)
SELECT e.id, s.id, 0 FROM olympic_events e, skills s
WHERE e.slug = 'database-query-generation' AND s.slug = 'genai-toolbox';

-- Event 8: Code Intelligence
INSERT INTO olympic_event_competitors (event_id, skill_id, sample_size)
SELECT e.id, s.id, 0 FROM olympic_events e, skills s
WHERE e.slug = 'code-intelligence' AND s.slug IN ('github-mcp-server', 'context7');

-- ─────────────────────────────────────────────
-- SEED BENCHMARK MISSIONS
-- ─────────────────────────────────────────────

INSERT INTO benchmark_missions (event_id, title, description, task_prompt, task_fingerprint, skill_ids, reward_multiplier, max_claims)
SELECT e.id, t.title, t.description, t.task_prompt, t.fingerprint, ARRAY(
  SELECT s.id FROM skills s WHERE s.slug = ANY(t.skill_slugs)
), t.multiplier, t.max_claims FROM (
  VALUES
    ('web-research-extraction'::text,
     'Competitor Pricing Extraction',
     'Extract structured pricing data from 3 competitor landing pages and return a comparison table.',
     'Extract the pricing tiers, features, and costs from these 3 SaaS pricing pages and return a structured JSON comparison.',
     'web-research-pricing-001',
     ARRAY['firecrawl-mcp', 'exa-mcp-server'],
     2.5, 50),
    ('repo-question-answering',
     'Codebase Architecture Q&A',
     'Answer 5 questions about the architecture of a medium-sized open source repo.',
     'Given this repository URL, answer: 1) What framework is used? 2) How is authentication handled? 3) What database is used? 4) Describe the API structure. 5) What testing framework is used?',
     'repo-qa-architecture-001',
     ARRAY['github-mcp-server', 'context7'],
     2.5, 50),
    ('browser-task-completion',
     'Multi-step Form Submission',
     'Navigate to a test form, fill in 10 fields across 3 pages, and submit successfully.',
     'Navigate to the test application, complete the multi-step registration form with the provided test data, and confirm submission.',
     'browser-form-001',
     ARRAY['playwright-mcp'],
     2.5, 50)
) AS t(event_slug, title, description, task_prompt, fingerprint, skill_slugs, multiplier, max_claims)
JOIN olympic_events e ON e.slug = t.event_slug;
