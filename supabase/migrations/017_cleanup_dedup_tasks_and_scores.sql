-- ─────────────────────────────────────────────────────────────
-- Migration 017: Deduplicate tasks, ensure all servers have scores
--
-- Problem: Multiple migrations created overlapping tasks with
-- different slugs (e.g. "Web Search" vs "Search the Web").
-- This merges mappings into canonical slugs and deletes dupes.
-- Also ensures every active skill has a skill_scores row.
-- ─────────────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════
-- 1. MERGE DUPLICATE TASK MAPPINGS
--    For each pair: copy skill_tasks from "dupe" → "keep", then delete dupe
-- ═══════════════════════════════════════════════

-- Helper: merge skill_tasks from one task slug into another
-- Moves mappings, keeps the higher relevance_score on conflict
DO $$
DECLARE
  pairs TEXT[][] := ARRAY[
    -- [keep_slug, dupe_slug]
    ['web-search',         'search-web'],
    ['web-scraping',       'scrape-web-pages'],
    ['database-queries',   'query-databases'],
    ['browser-automation', 'automate-browser'],
    ['repo-management',    'manage-repositories'],
    ['crm-management',     'manage-crm'],
    ['ticket-triage',      'manage-tickets'],
    ['payment-processing', 'process-payments'],
    ['cms-publishing',     'manage-content'],
    ['error-monitoring',   'monitor-errors'],
    ['lead-enrichment',    'enrich-leads'],
    ['email-automation',   'send-emails'],
    ['infra-management',   'deploy-infrastructure'],
    ['calendar-management','schedule-meetings']
  ];
  p TEXT[];
  keep_id UUID;
  dupe_id UUID;
BEGIN
  FOREACH p SLICE 1 IN ARRAY pairs LOOP
    -- Look up both task IDs
    SELECT id INTO keep_id FROM tasks WHERE slug = p[1];
    SELECT id INTO dupe_id FROM tasks WHERE slug = p[2];

    -- Skip if either doesn't exist
    IF keep_id IS NULL OR dupe_id IS NULL THEN
      CONTINUE;
    END IF;

    -- Copy skill_tasks from dupe → keep (skip conflicts)
    INSERT INTO skill_tasks (skill_id, task_id, relevance_score)
    SELECT st.skill_id, keep_id, st.relevance_score
    FROM skill_tasks st
    WHERE st.task_id = dupe_id
    ON CONFLICT DO NOTHING;

    -- Copy task_workflows from dupe → keep (if table has that FK)
    BEGIN
      INSERT INTO task_workflows (task_id, workflow_id)
      SELECT keep_id, tw.workflow_id
      FROM task_workflows tw
      WHERE tw.task_id = dupe_id
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN undefined_table THEN
      -- task_workflows may not exist, skip
      NULL;
    END;

    -- Delete dupe skill_tasks
    DELETE FROM skill_tasks WHERE task_id = dupe_id;

    -- Delete dupe task_workflows
    BEGIN
      DELETE FROM task_workflows WHERE task_id = dupe_id;
    EXCEPTION WHEN undefined_table THEN
      NULL;
    END;

    -- Delete the dupe task
    DELETE FROM tasks WHERE id = dupe_id;

    RAISE NOTICE 'Merged task "%" into "%" and deleted duplicate', p[2], p[1];
  END LOOP;
END $$;


-- ═══════════════════════════════════════════════
-- 2. ENSURE ALL ACTIVE SKILLS HAVE SKILL_SCORES
--    Insert default scores for any skill missing a row
-- ═══════════════════════════════════════════════

INSERT INTO skill_scores (
  skill_id, output_score, reliability_score, efficiency_score,
  cost_score, trust_score, value_score, overall_score,
  adoption_score, freshness_score, setup_score,
  score_version, updated_at
)
SELECT
  s.id,
  5.00,  -- output: neutral default
  5.00,  -- reliability
  5.00,  -- efficiency
  5.00,  -- cost
  5.00,  -- trust
  5.00,  -- value_score (will be recalculated)
  5.00,  -- overall_score
  5.00,  -- adoption
  5.00,  -- freshness
  5.00,  -- setup
  '2.1-default',
  NOW()
FROM skills s
WHERE s.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM skill_scores ss WHERE ss.skill_id = s.id
  );


-- ═══════════════════════════════════════════════
-- 3. ENSURE ALL ACTIVE SKILLS HAVE SKILL_METRICS
--    Insert default metrics for any skill missing a row
-- ═══════════════════════════════════════════════

INSERT INTO skill_metrics (
  skill_id, github_stars, weekly_downloads,
  days_since_last_commit, open_issues,
  updated_at
)
SELECT
  s.id,
  0,     -- github_stars
  0,     -- weekly_downloads
  30,    -- days_since_last_commit (assume 30 days)
  0,     -- open_issues
  NOW()
FROM skills s
WHERE s.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM skill_metrics sm WHERE sm.skill_id = s.id
  );


-- ═══════════════════════════════════════════════
-- 4. FIX ANY SKILLS WITH WRONG STATUS
--    Ensure all skills from our catalogs are active
-- ═══════════════════════════════════════════════

UPDATE skills SET status = 'active'
WHERE status != 'active'
  AND slug IN (
    -- Original 10
    'context7', 'playwright-mcp', 'github-mcp-server', 'firecrawl-mcp',
    'exa-mcp-server', 'aws-mcp', 'figma-context-mcp', 'atlassian-mcp',
    'notion-mcp-server', 'genai-toolbox',
    -- Expanded 42
    'gitlab-mcp', 'linear-mcp', 'sentry-mcp', 'brave-search-mcp',
    'tavily-mcp', 'perplexity-mcp', 'browserbase-mcp', 'puppeteer-mcp',
    'storybook-mcp', 'tailwindcss-mcp', 'obsidian-mcp', 'confluence-mcp',
    'terraform-mcp', 'kubernetes-mcp', 'cloudflare-mcp', 'supabase-mcp',
    'neon-mcp', 'zendesk-mcp', 'intercom-mcp', 'hubspot-mcp',
    'apollo-mcp', 'salesforce-mcp', 'wordpress-mcp', 'sanity-mcp',
    'ghost-mcp', 'google-ads-mcp', 'mailchimp-mcp', 'semrush-mcp',
    'stripe-mcp', 'quickbooks-mcp', 'plaid-mcp', 'docusign-mcp',
    'legalforce-mcp', 'courtlistener-mcp', 'greenhouse-mcp', 'lever-mcp',
    'bamboohr-mcp', 'shopify-mcp', 'woocommerce-mcp', 'amazon-seller-mcp',
    'snyk-mcp', 'sonarqube-mcp', 'trivy-mcp', 'google-calendar-mcp',
    'slack-mcp', 'gmail-mcp'
  );


-- ═══════════════════════════════════════════════
-- 5. RECALCULATE VALUE + OVERALL SCORES for defaults
--    Any skill with score_version '2.1-default' gets
--    proper value_score computed from its dimensions
-- ═══════════════════════════════════════════════

UPDATE skill_scores SET
  value_score = ROUND(
    0.35 * COALESCE(output_score, 5.0) +
    0.25 * COALESCE(reliability_score, 5.0) +
    0.15 * COALESCE(efficiency_score, 5.0) +
    0.15 * COALESCE(cost_score, 5.0) +
    0.10 * COALESCE(trust_score, 5.0),
    2
  ),
  overall_score = ROUND(
    (0.35 * COALESCE(output_score, 5.0) +
     0.25 * COALESCE(reliability_score, 5.0) +
     0.15 * COALESCE(efficiency_score, 5.0) +
     0.15 * COALESCE(cost_score, 5.0) +
     0.10 * COALESCE(trust_score, 5.0)) * 0.6 +
    COALESCE(adoption_score, 5.0) * 0.2 +
    COALESCE(freshness_score, 5.0) * 0.2,
    2
  ),
  updated_at = NOW()
WHERE score_version = '2.1-default';


-- ═══════════════════════════════════════════════
-- 6. UPDATE DISPLAY ORDER for remaining tasks
--    Ensures clean ordering after dedup
-- ═══════════════════════════════════════════════

WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY display_order, name) AS new_order
  FROM tasks
)
UPDATE tasks SET display_order = ordered.new_order
FROM ordered WHERE tasks.id = ordered.id;
