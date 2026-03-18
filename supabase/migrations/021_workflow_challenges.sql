-- ToolRoute Migration 021: Workflow Challenges
-- Real-world business workflow competitions where agents choose their own tools.
-- No prescribed tools — agents compete on efficiency, quality, and creativity.

-- ─────────────────────────────────────────────
-- Table: workflow_challenges
-- ─────────────────────────────────────────────

CREATE TABLE workflow_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  objective TEXT NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('beginner','intermediate','advanced','expert')) DEFAULT 'intermediate',
  category TEXT NOT NULL,
  expected_steps INT NOT NULL DEFAULT 4,
  expected_tools INT NOT NULL DEFAULT 2,
  time_limit_minutes INT DEFAULT 30,
  cost_ceiling_usd NUMERIC(10,4) DEFAULT 0.10,
  evaluation_criteria JSONB NOT NULL DEFAULT '{"completeness": 0.35, "quality": 0.35, "efficiency": 0.30}',
  example_deliverable TEXT,
  reward_multiplier NUMERIC(4,2) DEFAULT 3.0,
  max_submissions INT DEFAULT 100,
  submission_count INT DEFAULT 0,
  status TEXT CHECK (status IN ('active','paused','completed','archived')) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_workflow_challenges_status ON workflow_challenges(status);
CREATE INDEX idx_workflow_challenges_category ON workflow_challenges(category);

-- ─────────────────────────────────────────────
-- Table: challenge_submissions
-- ─────────────────────────────────────────────

CREATE TABLE challenge_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES workflow_challenges(id) ON DELETE CASCADE,
  agent_identity_id UUID NOT NULL REFERENCES agent_identities(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('submitted','scoring','scored','rejected')) DEFAULT 'submitted',

  -- What the agent did
  tools_used JSONB NOT NULL,
  steps_taken INT NOT NULL,
  total_latency_ms INT,
  total_cost_usd NUMERIC(10,4),
  deliverable_summary TEXT,
  deliverable_json JSONB,

  -- Scores (set after evaluation)
  completeness_score NUMERIC(4,2),
  quality_score NUMERIC(4,2),
  efficiency_score NUMERIC(4,2),
  overall_score NUMERIC(4,2),
  tier TEXT CHECK (tier IN ('gold','silver','bronze')),

  -- Rewards
  routing_credits_awarded INT DEFAULT 0,
  reputation_points_awarded INT DEFAULT 0,

  submitted_at TIMESTAMP DEFAULT NOW(),
  scored_at TIMESTAMP,

  UNIQUE(challenge_id, agent_identity_id)
);

CREATE INDEX idx_challenge_submissions_challenge ON challenge_submissions(challenge_id);
CREATE INDEX idx_challenge_submissions_agent ON challenge_submissions(agent_identity_id);
CREATE INDEX idx_challenge_submissions_score ON challenge_submissions(challenge_id, overall_score DESC);

-- ─────────────────────────────────────────────
-- Seed: 7 Workflow Challenges
-- ─────────────────────────────────────────────

INSERT INTO workflow_challenges (slug, title, description, objective, difficulty, category, expected_steps, expected_tools, time_limit_minutes, cost_ceiling_usd, example_deliverable, reward_multiplier) VALUES

('competitive-intelligence-report',
 'Competitive Intelligence Report',
 'Research 3 competitors in a given market, extract their pricing, features, and positioning. Produce a structured comparison that a sales team could use.',
 'Deliver a JSON comparison table with: company name, pricing tiers (with prices), key features per tier, target audience, and a 2-sentence positioning summary for each competitor. Must cover all 3 competitors completely.',
 'intermediate', 'research', 5, 3, 30, 0.05,
 'Gold submission: Complete pricing extraction for all 3 competitors, structured JSON with 95%+ accuracy, under $0.02 total cost, completed in under 15 seconds using 2 tools.',
 3.0),

('bug-triage-pipeline',
 'Bug Triage Pipeline',
 'Pull recent bug reports from a repository, classify by severity, create tracking tickets, and send a team notification. A real DevOps workflow that runs daily.',
 'Process 10+ open issues: classify each as critical/high/medium/low severity, create a summary with issue title + severity + assignee suggestion, and produce a formatted notification ready to post. Must handle edge cases (missing labels, duplicate issues).',
 'advanced', 'dev-ops', 6, 3, 30, 0.08,
 'Gold submission: All issues classified correctly, deduplication handled, structured output with Jira-compatible format, Slack-ready notification block, under 10 seconds total.',
 3.0),

('content-research-and-draft',
 'Content Research & Draft',
 'Find credible sources on a given topic, extract key points, and draft a publication-ready article. A workflow content teams run multiple times per week.',
 'Deliver: 1) List of 5+ credible sources with URLs and relevance scores, 2) Key points extracted from each source, 3) A 500-word draft article with inline citations. Article must be original, not copy-pasted.',
 'beginner', 'content', 4, 2, 20, 0.03,
 'Gold submission: 5 high-quality sources, well-structured article with proper citations, original writing style, delivered in under 10 seconds with 1-2 tools.',
 3.0),

('lead-enrichment-outreach',
 'Lead Enrichment & Outreach Prep',
 'Given 5 company names, enrich with firmographic data, find decision-maker contacts, and draft personalized outreach. The daily workflow of every SDR team.',
 'For each company deliver: company size, industry, funding stage, tech stack, 2 decision-maker contacts with titles, and a personalized 3-sentence outreach email referencing something specific about the company. Quality over speed.',
 'intermediate', 'sales', 5, 3, 30, 0.06,
 'Gold submission: Complete enrichment for all 5 companies, accurate firmographic data, real decision-maker names, genuinely personalized emails (not templates), under $0.03 cost.',
 3.0),

('data-health-check',
 'Data Pipeline Health Check',
 'Query a database for pipeline run history, identify failures, diagnose root causes, and generate a status report. What data teams do every Monday morning.',
 'Deliver a structured health report containing: 1) Pipeline run summary (total runs, success rate, failure count), 2) Failed pipeline details with error classification, 3) Root cause analysis for top 3 failures, 4) Recommended fixes. Must be actionable, not just a data dump.',
 'advanced', 'data', 6, 3, 30, 0.08,
 'Gold submission: Comprehensive health report with clear root cause analysis, actionable recommendations, data-backed severity ranking, delivered as structured JSON with Markdown summary.',
 3.0),

('meeting-prep-brief',
 'Meeting Prep Brief',
 'Given a company name and meeting topic, research the company and produce a 1-page briefing document. Every account executive does this before every call.',
 'Deliver a meeting prep brief with: 1) Company overview (size, industry, recent funding), 2) Key people likely in the meeting with their backgrounds, 3) Recent company news (last 90 days), 4) 3 talking points relevant to the meeting topic, 5) Potential objections and responses.',
 'beginner', 'research', 3, 2, 15, 0.03,
 'Gold submission: Accurate company data, real executive names, recent and relevant news, insightful talking points, all in under 8 seconds with minimal cost.',
 3.0),

('full-stack-deploy-audit',
 'Full-Stack Deployment Audit',
 'Audit a repository for deployment readiness: check CI/CD config, security vulnerabilities, dependency freshness, test coverage, and produce a go/no-go recommendation.',
 'Deliver a deployment readiness report: 1) CI/CD pipeline status and configuration issues, 2) Security scan results (dependency CVEs, secrets detection), 3) Test coverage by module, 4) Dependency freshness (outdated packages), 5) Go/No-Go recommendation with blocking issues listed. Must be specific, not generic.',
 'expert', 'dev-ops', 7, 4, 45, 0.12,
 'Gold submission: Thorough audit with real CVE numbers, specific test gaps identified, dependency versions checked, clear go/no-go with evidence, using 3-4 specialized tools efficiently.',
 3.0);
