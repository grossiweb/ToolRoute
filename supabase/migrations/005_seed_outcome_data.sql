-- NeoSkill — Seed Outcome & Activity Data
-- Makes the platform look alive with realistic benchmark results
-- Run AFTER 004_benchmark_metrics_and_profiles.sql
-- Version: 1.3 | March 2026

-- ─────────────────────────────────────────────
-- 1. CONTRIBUTORS
-- ─────────────────────────────────────────────

INSERT INTO contributors (id, contributor_type, display_name, created_at) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'individual', 'Benchmark Bot', NOW() - INTERVAL '45 days'),
  ('a0000000-0000-0000-0000-000000000002', 'individual', 'Agent Fleet Alpha', NOW() - INTERVAL '40 days'),
  ('a0000000-0000-0000-0000-000000000003', 'individual', 'Community Tester', NOW() - INTERVAL '30 days');

-- ─────────────────────────────────────────────
-- 2. AGENT IDENTITIES (5 total)
-- ─────────────────────────────────────────────

INSERT INTO agent_identities (id, contributor_id, agent_name, agent_kind, host_client_slug, model_family, environment_label, trust_tier, created_at) VALUES
  -- Benchmark Bot owns 2 agents
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   'BenchBot-Claude', 'evaluation-agent', 'claude-code', 'claude-3.5', 'ci-benchmark', 'production', NOW() - INTERVAL '44 days'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
   'BenchBot-GPT', 'evaluation-agent', 'cursor', 'gpt-4o', 'ci-benchmark', 'trusted', NOW() - INTERVAL '42 days'),
  -- Agent Fleet Alpha owns 2 agents
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002',
   'FleetRunner-Auto', 'autonomous', 'claude-desktop', 'claude-3.5', 'production-fleet', 'production', NOW() - INTERVAL '38 days'),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002',
   'FleetRunner-Workflow', 'workflow-agent', 'vscode', 'gpt-4o', 'staging-fleet', 'trusted', NOW() - INTERVAL '35 days'),
  -- Community Tester owns 1 agent
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000003',
   'CommunityPilot', 'copilot', 'claude-code', 'claude-3-opus', 'local-dev', 'baseline', NOW() - INTERVAL '28 days');

-- ─────────────────────────────────────────────
-- 3. OUTCOME RECORDS (150 total)
-- Uses a CTE to look up skill/benchmark IDs by slug
-- ─────────────────────────────────────────────

-- Helper: insert outcome_records in batches by skill
-- Each record has realistic, internally-consistent data

DO $$
DECLARE
  -- skill IDs
  v_context7        UUID;
  v_playwright      UUID;
  v_github          UUID;
  v_firecrawl       UUID;
  v_exa             UUID;
  v_aws             UUID;
  v_figma           UUID;
  v_atlassian       UUID;
  v_notion          UUID;
  v_genai           UUID;
  -- benchmark profile IDs
  v_web_research    UUID;
  v_browser_task    UUID;
  v_repo_qa         UUID;
  v_db_query        UUID;
  v_crm_enrich      UUID;
  v_publishing      UUID;
  v_ticket_triage   UUID;
  v_ecommerce_cat   UUID;
  v_pdf_extract     UUID;
  v_html_extract    UUID;
  v_kb_search       UUID;
  v_analytics       UUID;
  v_automation      UUID;
  v_doc_summary     UUID;
  -- temp vars
  v_outcome_id      UUID;
  v_quality         NUMERIC(4,2);
  v_reliability     NUMERIC(4,2);
  v_efficiency      NUMERIC(4,2);
  v_cost_s          NUMERIC(4,2);
  v_trust_s         NUMERIC(4,2);
  v_value           NUMERIC(4,2);
  v_status          TEXT;
  v_latency         INT;
  v_cost            NUMERIC(10,4);
  v_proof           TEXT;
  v_structured      BOOLEAN;
  v_human_corr      BOOLEAN;
  v_corr_min        NUMERIC(10,2);
  v_fallback_skill  UUID;
  v_created         TIMESTAMP;
  v_grade           TEXT;
  i                 INT;
  v_rand            FLOAT;
  v_skill_id        UUID;
  v_bench_id        UUID;
  v_workflow        TEXT;
  v_fingerprint     TEXT;
  v_skill_version   TEXT;
BEGIN
  -- Look up skill IDs
  SELECT id INTO v_context7    FROM skills WHERE slug = 'context7';
  SELECT id INTO v_playwright  FROM skills WHERE slug = 'playwright-mcp';
  SELECT id INTO v_github      FROM skills WHERE slug = 'github-mcp-server';
  SELECT id INTO v_firecrawl   FROM skills WHERE slug = 'firecrawl-mcp';
  SELECT id INTO v_exa         FROM skills WHERE slug = 'exa-mcp-server';
  SELECT id INTO v_aws         FROM skills WHERE slug = 'aws-mcp';
  SELECT id INTO v_figma       FROM skills WHERE slug = 'figma-context-mcp';
  SELECT id INTO v_atlassian   FROM skills WHERE slug = 'atlassian-mcp';
  SELECT id INTO v_notion      FROM skills WHERE slug = 'notion-mcp-server';
  SELECT id INTO v_genai       FROM skills WHERE slug = 'genai-toolbox';

  -- Look up benchmark profile IDs
  SELECT id INTO v_web_research  FROM benchmark_profiles WHERE slug = 'web-research-profile-v1';
  SELECT id INTO v_browser_task  FROM benchmark_profiles WHERE slug = 'browser-task-completion-v1';
  SELECT id INTO v_repo_qa       FROM benchmark_profiles WHERE slug = 'repo-qa-profile-v1';
  SELECT id INTO v_db_query      FROM benchmark_profiles WHERE slug = 'database-query-analysis-v1';
  SELECT id INTO v_crm_enrich    FROM benchmark_profiles WHERE slug = 'crm-enrichment-v1';
  SELECT id INTO v_publishing    FROM benchmark_profiles WHERE slug = 'publishing-workflow-v1';
  SELECT id INTO v_ticket_triage FROM benchmark_profiles WHERE slug = 'ticket-triage-v1';
  SELECT id INTO v_ecommerce_cat FROM benchmark_profiles WHERE slug = 'ecommerce-catalog-extraction-v1';
  SELECT id INTO v_pdf_extract   FROM benchmark_profiles WHERE slug = 'pdf-extraction-v1';
  SELECT id INTO v_html_extract  FROM benchmark_profiles WHERE slug = 'html-data-extraction-v1';
  SELECT id INTO v_kb_search     FROM benchmark_profiles WHERE slug = 'knowledge-base-search-v1';
  SELECT id INTO v_analytics     FROM benchmark_profiles WHERE slug = 'analytics-query-v1';
  SELECT id INTO v_automation    FROM benchmark_profiles WHERE slug = 'automation-task-execution-v1';
  SELECT id INTO v_doc_summary   FROM benchmark_profiles WHERE slug = 'document-summary-retrieval-v1';

  -- Generate 150 outcome records across all skills
  FOR i IN 1..150 LOOP
    v_outcome_id := gen_random_uuid();
    v_rand := random();
    v_fallback_skill := NULL;

    -- Assign skill + benchmark + workflow + fingerprint based on index
    CASE (i % 10)
      WHEN 0 THEN -- context7 (repo QA)
        v_skill_id := v_context7; v_bench_id := v_repo_qa;
        v_workflow := 'developer-workflow-code-management';
        v_fingerprint := 'repo-qa-docs-lookup-' || LPAD((i/10 + 1)::text, 3, '0');
        v_skill_version := '1.0.8';
      WHEN 1 THEN -- playwright (browser tasks)
        v_skill_id := v_playwright; v_bench_id := v_browser_task;
        v_workflow := 'qa-testing-automation';
        v_fingerprint := 'browser-form-fill-checkout-' || LPAD((i/10 + 1)::text, 3, '0');
        v_skill_version := '1.49.1';
      WHEN 2 THEN -- github (repo ops)
        v_skill_id := v_github; v_bench_id := v_repo_qa;
        v_workflow := 'developer-workflow-code-management';
        v_fingerprint := 'repo-pr-review-' || LPAD((i/10 + 1)::text, 3, '0');
        v_skill_version := '0.2.0';
      WHEN 3 THEN -- firecrawl (web research)
        v_skill_id := v_firecrawl; v_bench_id := v_web_research;
        v_workflow := 'research-competitive-intelligence';
        v_fingerprint := 'web-research-competitive-pricing-' || LPAD((i/10 + 1)::text, 3, '0');
        v_skill_version := '1.8.0';
      WHEN 4 THEN -- exa (web search)
        v_skill_id := v_exa; v_bench_id := v_web_research;
        v_workflow := 'research-competitive-intelligence';
        v_fingerprint := 'web-search-market-analysis-' || LPAD((i/10 + 1)::text, 3, '0');
        v_skill_version := '1.3.0';
      WHEN 5 THEN -- aws (cloud ops)
        v_skill_id := v_aws; v_bench_id := v_automation;
        v_workflow := 'it-devops-platform-operations';
        v_fingerprint := 'cloud-infra-deploy-check-' || LPAD((i/10 + 1)::text, 3, '0');
        v_skill_version := '0.4.1';
      WHEN 6 THEN -- figma (design-to-code)
        v_skill_id := v_figma; v_bench_id := v_html_extract;
        v_workflow := 'design-to-code-workflow';
        v_fingerprint := 'design-component-extract-' || LPAD((i/10 + 1)::text, 3, '0');
        v_skill_version := '0.5.2';
      WHEN 7 THEN -- atlassian (ticket triage)
        v_skill_id := v_atlassian; v_bench_id := v_ticket_triage;
        v_workflow := 'customer-support-automation';
        v_fingerprint := 'ticket-triage-classify-' || LPAD((i/10 + 1)::text, 3, '0');
        v_skill_version := '0.9.1';
      WHEN 8 THEN -- notion (knowledge base)
        v_skill_id := v_notion; v_bench_id := v_kb_search;
        v_workflow := 'knowledge-management';
        v_fingerprint := 'kb-search-internal-docs-' || LPAD((i/10 + 1)::text, 3, '0');
        v_skill_version := '0.3.0';
      WHEN 9 THEN -- genai-toolbox (DB query)
        v_skill_id := v_genai; v_bench_id := v_db_query;
        v_workflow := 'data-analysis-reporting';
        v_fingerprint := 'db-query-analytics-report-' || LPAD((i/10 + 1)::text, 3, '0');
        v_skill_version := '0.6.0';
      ELSE
        v_skill_id := v_context7; v_bench_id := v_repo_qa;
        v_workflow := 'developer-workflow-code-management';
        v_fingerprint := 'misc-task-' || i::text;
        v_skill_version := '1.0.0';
    END CASE;

    -- Determine outcome status: ~70% success, ~20% partial, ~8% failure, ~2% aborted
    IF v_rand < 0.70 THEN
      v_status := 'success';
    ELSIF v_rand < 0.90 THEN
      v_status := 'partial_success';
    ELSIF v_rand < 0.98 THEN
      v_status := 'failure';
    ELSE
      v_status := 'aborted';
    END IF;

    -- Latency based on skill type
    CASE (i % 10)
      WHEN 1 THEN v_latency := 2000 + (random() * 13000)::int;  -- browser: 2-15s
      WHEN 3 THEN v_latency := 1500 + (random() * 8000)::int;   -- crawl: 1.5-9.5s
      WHEN 5 THEN v_latency := 1000 + (random() * 5000)::int;   -- cloud: 1-6s
      WHEN 9 THEN v_latency := 800 + (random() * 4000)::int;    -- db: 0.8-4.8s
      ELSE         v_latency := 200 + (random() * 4000)::int;    -- general: 0.2-4.2s
    END CASE;

    -- Cost based on skill type
    CASE (i % 10)
      WHEN 1 THEN v_cost := (0.02 + random() * 0.48)::numeric(10,4);   -- browser: $0.02-$0.50
      WHEN 3 THEN v_cost := (0.01 + random() * 0.15)::numeric(10,4);   -- crawl: $0.01-$0.16
      WHEN 5 THEN v_cost := (0.005 + random() * 0.08)::numeric(10,4);  -- cloud: $0.005-$0.085
      ELSE         v_cost := (0.001 + random() * 0.05)::numeric(10,4); -- general: $0.001-$0.051
    END CASE;

    -- Quality correlated with outcome
    CASE v_status
      WHEN 'success'         THEN v_quality := (7.5 + random() * 2.0)::numeric(4,2);  -- 7.5-9.5
      WHEN 'partial_success' THEN v_quality := (5.0 + random() * 2.5)::numeric(4,2);  -- 5.0-7.5
      WHEN 'failure'         THEN v_quality := (2.0 + random() * 3.0)::numeric(4,2);  -- 2.0-5.0
      WHEN 'aborted'         THEN v_quality := (1.0 + random() * 2.0)::numeric(4,2);  -- 1.0-3.0
      ELSE                        v_quality := 5.0;
    END CASE;

    -- Proof type: 60% self_reported, 30% client_signed, 10% runtime_signed
    v_rand := random();
    IF v_rand < 0.60 THEN v_proof := 'self_reported';
    ELSIF v_rand < 0.90 THEN v_proof := 'client_signed';
    ELSE v_proof := 'runtime_signed';
    END IF;

    -- Structured output valid: mostly true for success
    IF v_status = 'success' THEN
      v_structured := random() < 0.92;
    ELSIF v_status = 'partial_success' THEN
      v_structured := random() < 0.60;
    ELSE
      v_structured := random() < 0.20;
    END IF;

    -- Human correction: ~15% need it
    v_human_corr := random() < 0.15;
    IF v_human_corr THEN
      v_corr_min := (2.0 + random() * 28.0)::numeric(10,2);
    ELSE
      v_corr_min := 0;
    END IF;

    -- Fallback: ~10% of records
    IF random() < 0.10 AND v_status IN ('failure', 'partial_success') THEN
      -- Pick a different skill as fallback
      CASE (i % 10)
        WHEN 3 THEN v_fallback_skill := v_exa;        -- firecrawl falls back to exa
        WHEN 4 THEN v_fallback_skill := v_firecrawl;   -- exa falls back to firecrawl
        WHEN 0 THEN v_fallback_skill := v_github;      -- context7 falls back to github
        WHEN 2 THEN v_fallback_skill := v_context7;    -- github falls back to context7
        WHEN 7 THEN v_fallback_skill := v_notion;      -- atlassian falls back to notion
        WHEN 8 THEN v_fallback_skill := v_atlassian;   -- notion falls back to atlassian
        ELSE v_fallback_skill := NULL;
      END CASE;
    END IF;

    -- Date spread: last 30 days
    v_created := NOW() - (random() * 30)::int * INTERVAL '1 day' - (random() * 86400)::int * INTERVAL '1 second';

    -- Insert outcome record
    INSERT INTO outcome_records (
      id, skill_id, benchmark_profile_id, workflow_slug,
      task_fingerprint, skill_version, outcome_status,
      latency_ms, estimated_cost_usd, retries,
      output_quality_rating, structured_output_valid,
      human_correction_required, human_correction_minutes,
      fallback_used_skill_id, proof_type, created_at
    ) VALUES (
      v_outcome_id, v_skill_id, v_bench_id, v_workflow,
      v_fingerprint, v_skill_version, v_status,
      v_latency, v_cost, CASE WHEN v_status = 'failure' THEN (random() * 3)::int ELSE 0 END,
      v_quality, v_structured,
      v_human_corr, v_corr_min,
      v_fallback_skill, v_proof, v_created
    );

    -- Calculate outcome scores
    -- quality_score = output_quality_rating (already 0-10 scale)
    -- reliability_score based on outcome status
    CASE v_status
      WHEN 'success'         THEN v_reliability := 9.0;
      WHEN 'partial_success' THEN v_reliability := 6.0;
      WHEN 'failure'         THEN v_reliability := 2.0;
      WHEN 'aborted'         THEN v_reliability := 1.0;
      ELSE                        v_reliability := 5.0;
    END CASE;

    -- efficiency_score: inversely proportional to latency (max 15000ms = score 1, min 200ms = score 9.5)
    v_efficiency := GREATEST(1.0, LEAST(9.5, (10.0 - (v_latency::numeric / 15000.0) * 9.0)))::numeric(4,2);

    -- cost_score: inversely proportional to cost (max $0.50 = score 1, min $0.001 = score 9.8)
    v_cost_s := GREATEST(1.0, LEAST(9.8, (10.0 - (v_cost / 0.50) * 9.0)))::numeric(4,2);

    -- trust_score based on proof type
    CASE v_proof
      WHEN 'runtime_signed' THEN v_trust_s := 9.5;
      WHEN 'client_signed'  THEN v_trust_s := 8.0;
      WHEN 'self_reported'  THEN v_trust_s := 6.5;
      ELSE                       v_trust_s := 5.0;
    END CASE;

    -- value_score = 0.35*quality + 0.25*reliability + 0.15*efficiency + 0.15*cost + 0.10*trust
    v_value := (0.35 * v_quality + 0.25 * v_reliability + 0.15 * v_efficiency + 0.15 * v_cost_s + 0.10 * v_trust_s)::numeric(4,2);

    -- grade label
    IF v_quality >= 9.0 THEN v_grade := 'Best Quality';
    ELSIF v_value >= 8.5 AND v_cost_s >= 8.0 THEN v_grade := 'Best Value';
    ELSIF v_value >= 8.5 THEN v_grade := 'Most Reliable';
    ELSIF v_cost_s >= 9.0 THEN v_grade := 'Best Budget Option';
    ELSIF v_value >= 7.5 THEN v_grade := 'Premium Worth Paying For';
    ELSIF v_value < 5.0 THEN v_grade := 'Not Recommended';
    ELSE v_grade := 'Solid Choice';
    END IF;

    INSERT INTO outcome_scores (
      outcome_record_id, quality_score, reliability_score,
      efficiency_score, cost_score, trust_score,
      value_score, grade_label, scored_at
    ) VALUES (
      v_outcome_id, v_quality, v_reliability,
      v_efficiency, v_cost_s, v_trust_s,
      v_value, v_grade, v_created
    );

  END LOOP;
END $$;

-- ─────────────────────────────────────────────
-- 5. SKILL BENCHMARK ROLLUPS
-- Aggregate from the outcome records we just inserted
-- ─────────────────────────────────────────────

INSERT INTO skill_benchmark_rollups (
  skill_id, benchmark_profile_id, sample_size,
  avg_quality_score, avg_reliability_score, avg_efficiency_score,
  avg_cost_score, avg_trust_score, avg_value_score,
  cost_per_useful_outcome_usd, avg_human_correction_minutes,
  fallback_rate, success_rate
)
SELECT
  orec.skill_id,
  orec.benchmark_profile_id,
  COUNT(*)::int AS sample_size,
  ROUND(AVG(os.quality_score), 2) AS avg_quality_score,
  ROUND(AVG(os.reliability_score), 2) AS avg_reliability_score,
  ROUND(AVG(os.efficiency_score), 2) AS avg_efficiency_score,
  ROUND(AVG(os.cost_score), 2) AS avg_cost_score,
  ROUND(AVG(os.trust_score), 2) AS avg_trust_score,
  ROUND(AVG(os.value_score), 2) AS avg_value_score,
  ROUND(
    CASE WHEN SUM(CASE WHEN orec.outcome_status = 'success' THEN 1 ELSE 0 END) > 0
    THEN SUM(orec.estimated_cost_usd) / SUM(CASE WHEN orec.outcome_status = 'success' THEN 1 ELSE 0 END)
    ELSE 0 END, 4
  ) AS cost_per_useful_outcome_usd,
  ROUND(AVG(CASE WHEN orec.human_correction_required THEN orec.human_correction_minutes ELSE 0 END), 2) AS avg_human_correction_minutes,
  ROUND(
    SUM(CASE WHEN orec.fallback_used_skill_id IS NOT NULL THEN 1 ELSE 0 END)::numeric / COUNT(*), 4
  ) AS fallback_rate,
  ROUND(
    SUM(CASE WHEN orec.outcome_status = 'success' THEN 1 ELSE 0 END)::numeric / COUNT(*), 4
  ) AS success_rate
FROM outcome_records orec
JOIN outcome_scores os ON os.outcome_record_id = orec.id
WHERE orec.benchmark_profile_id IS NOT NULL
GROUP BY orec.skill_id, orec.benchmark_profile_id
ON CONFLICT (skill_id, benchmark_profile_id) DO UPDATE SET
  sample_size = EXCLUDED.sample_size,
  avg_quality_score = EXCLUDED.avg_quality_score,
  avg_reliability_score = EXCLUDED.avg_reliability_score,
  avg_efficiency_score = EXCLUDED.avg_efficiency_score,
  avg_cost_score = EXCLUDED.avg_cost_score,
  avg_trust_score = EXCLUDED.avg_trust_score,
  avg_value_score = EXCLUDED.avg_value_score,
  cost_per_useful_outcome_usd = EXCLUDED.cost_per_useful_outcome_usd,
  avg_human_correction_minutes = EXCLUDED.avg_human_correction_minutes,
  fallback_rate = EXCLUDED.fallback_rate,
  success_rate = EXCLUDED.success_rate,
  last_updated_at = NOW();

-- ─────────────────────────────────────────────
-- 6. OLYMPIC EVENT COMPETITORS — update with real scores
-- ─────────────────────────────────────────────

-- Event 1: Web Research Extraction — firecrawl vs exa
UPDATE olympic_event_competitors SET
  value_score = sub.avg_val,
  sample_size = sub.cnt,
  last_updated_at = NOW()
FROM (
  SELECT orec.skill_id, ROUND(AVG(os.value_score),2) AS avg_val, COUNT(*) AS cnt
  FROM outcome_records orec
  JOIN outcome_scores os ON os.outcome_record_id = orec.id
  JOIN benchmark_profiles bp ON bp.id = orec.benchmark_profile_id
  WHERE bp.slug = 'web-research-profile-v1'
  GROUP BY orec.skill_id
) sub
WHERE olympic_event_competitors.skill_id = sub.skill_id
  AND olympic_event_competitors.event_id = (SELECT id FROM olympic_events WHERE slug = 'web-research-extraction');

-- Event 2: Browser Task Completion — playwright
UPDATE olympic_event_competitors SET
  value_score = sub.avg_val,
  sample_size = sub.cnt,
  last_updated_at = NOW()
FROM (
  SELECT orec.skill_id, ROUND(AVG(os.value_score),2) AS avg_val, COUNT(*) AS cnt
  FROM outcome_records orec
  JOIN outcome_scores os ON os.outcome_record_id = orec.id
  JOIN benchmark_profiles bp ON bp.id = orec.benchmark_profile_id
  WHERE bp.slug = 'browser-task-completion-v1'
  GROUP BY orec.skill_id
) sub
WHERE olympic_event_competitors.skill_id = sub.skill_id
  AND olympic_event_competitors.event_id = (SELECT id FROM olympic_events WHERE slug = 'browser-task-completion');

-- Event 3: Repo QA — github vs context7
UPDATE olympic_event_competitors SET
  value_score = sub.avg_val,
  sample_size = sub.cnt,
  last_updated_at = NOW()
FROM (
  SELECT orec.skill_id, ROUND(AVG(os.value_score),2) AS avg_val, COUNT(*) AS cnt
  FROM outcome_records orec
  JOIN outcome_scores os ON os.outcome_record_id = orec.id
  JOIN benchmark_profiles bp ON bp.id = orec.benchmark_profile_id
  WHERE bp.slug = 'repo-qa-profile-v1'
  GROUP BY orec.skill_id
) sub
WHERE olympic_event_competitors.skill_id = sub.skill_id
  AND olympic_event_competitors.event_id IN (
    SELECT id FROM olympic_events WHERE slug IN ('repo-question-answering', 'code-intelligence')
  );

-- Event 6: Database Query — genai-toolbox
UPDATE olympic_event_competitors SET
  value_score = sub.avg_val,
  sample_size = sub.cnt,
  last_updated_at = NOW()
FROM (
  SELECT orec.skill_id, ROUND(AVG(os.value_score),2) AS avg_val, COUNT(*) AS cnt
  FROM outcome_records orec
  JOIN outcome_scores os ON os.outcome_record_id = orec.id
  JOIN benchmark_profiles bp ON bp.id = orec.benchmark_profile_id
  WHERE bp.slug = 'database-query-analysis-v1'
  GROUP BY orec.skill_id
) sub
WHERE olympic_event_competitors.skill_id = sub.skill_id
  AND olympic_event_competitors.event_id = (SELECT id FROM olympic_events WHERE slug = 'database-query-generation');

-- Assign medals based on value_score ranking within each event
WITH ranked AS (
  SELECT event_id, skill_id, value_score,
    ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY value_score DESC NULLS LAST) AS rn
  FROM olympic_event_competitors
  WHERE value_score IS NOT NULL AND sample_size > 0
)
UPDATE olympic_event_competitors oec SET
  medal = CASE ranked.rn WHEN 1 THEN 'gold' WHEN 2 THEN 'silver' WHEN 3 THEN 'bronze' ELSE NULL END,
  rank = ranked.rn
FROM ranked
WHERE oec.event_id = ranked.event_id AND oec.skill_id = ranked.skill_id;

-- Add competitors for events that don't have any yet (so all 10 skills get coverage)
-- Event 5: Knowledge Base Search — notion, atlassian
INSERT INTO olympic_event_competitors (event_id, skill_id, sample_size, value_score, medal, rank, last_updated_at)
SELECT e.id, s.id, sub.cnt, sub.avg_val,
  CASE sub.rn WHEN 1 THEN 'gold' WHEN 2 THEN 'silver' ELSE NULL END,
  sub.rn, NOW()
FROM olympic_events e
CROSS JOIN LATERAL (
  SELECT orec.skill_id, ROUND(AVG(os.value_score),2) AS avg_val, COUNT(*) AS cnt,
    ROW_NUMBER() OVER (ORDER BY AVG(os.value_score) DESC) AS rn
  FROM outcome_records orec
  JOIN outcome_scores os ON os.outcome_record_id = orec.id
  WHERE orec.skill_id IN (
    (SELECT id FROM skills WHERE slug = 'notion-mcp-server'),
    (SELECT id FROM skills WHERE slug = 'atlassian-mcp')
  )
  GROUP BY orec.skill_id
) sub
JOIN skills s ON s.id = sub.skill_id
WHERE e.slug = 'knowledge-base-search'
ON CONFLICT (event_id, skill_id) DO UPDATE SET
  sample_size = EXCLUDED.sample_size,
  value_score = EXCLUDED.value_score,
  medal = EXCLUDED.medal,
  rank = EXCLUDED.rank;

-- Event 7: Workflow Automation — aws
INSERT INTO olympic_event_competitors (event_id, skill_id, sample_size, value_score, medal, rank, last_updated_at)
SELECT e.id, s.id, sub.cnt, sub.avg_val, 'gold', 1, NOW()
FROM olympic_events e
CROSS JOIN LATERAL (
  SELECT ROUND(AVG(os.value_score),2) AS avg_val, COUNT(*) AS cnt
  FROM outcome_records orec
  JOIN outcome_scores os ON os.outcome_record_id = orec.id
  WHERE orec.skill_id = (SELECT id FROM skills WHERE slug = 'aws-mcp')
) sub
JOIN skills s ON s.slug = 'aws-mcp'
WHERE e.slug = 'workflow-automation'
ON CONFLICT (event_id, skill_id) DO UPDATE SET
  sample_size = EXCLUDED.sample_size,
  value_score = EXCLUDED.value_score,
  medal = EXCLUDED.medal,
  rank = EXCLUDED.rank;

-- Event 4: PDF Document Extraction — figma-context-mcp (design extraction proxy)
INSERT INTO olympic_event_competitors (event_id, skill_id, sample_size, value_score, medal, rank, last_updated_at)
SELECT e.id, s.id, sub.cnt, sub.avg_val, 'gold', 1, NOW()
FROM olympic_events e
CROSS JOIN LATERAL (
  SELECT ROUND(AVG(os.value_score),2) AS avg_val, COUNT(*) AS cnt
  FROM outcome_records orec
  JOIN outcome_scores os ON os.outcome_record_id = orec.id
  WHERE orec.skill_id = (SELECT id FROM skills WHERE slug = 'figma-context-mcp')
) sub
JOIN skills s ON s.slug = 'figma-context-mcp'
WHERE e.slug = 'pdf-document-extraction'
ON CONFLICT (event_id, skill_id) DO UPDATE SET
  sample_size = EXCLUDED.sample_size,
  value_score = EXCLUDED.value_score,
  medal = EXCLUDED.medal,
  rank = EXCLUDED.rank;

-- Event 9: CRM Enrichment — exa + firecrawl
INSERT INTO olympic_event_competitors (event_id, skill_id, sample_size, value_score, medal, rank, last_updated_at)
SELECT e.id, s.id, sub.cnt, sub.avg_val,
  CASE sub.rn WHEN 1 THEN 'gold' WHEN 2 THEN 'silver' ELSE NULL END,
  sub.rn, NOW()
FROM olympic_events e
CROSS JOIN LATERAL (
  SELECT orec.skill_id, ROUND(AVG(os.value_score),2) AS avg_val, COUNT(*) AS cnt,
    ROW_NUMBER() OVER (ORDER BY AVG(os.value_score) DESC) AS rn
  FROM outcome_records orec
  JOIN outcome_scores os ON os.outcome_record_id = orec.id
  WHERE orec.skill_id IN (
    (SELECT id FROM skills WHERE slug = 'exa-mcp-server'),
    (SELECT id FROM skills WHERE slug = 'firecrawl-mcp')
  )
  GROUP BY orec.skill_id
) sub
JOIN skills s ON s.id = sub.skill_id
WHERE e.slug = 'crm-enrichment'
ON CONFLICT (event_id, skill_id) DO UPDATE SET
  sample_size = EXCLUDED.sample_size,
  value_score = EXCLUDED.value_score,
  medal = EXCLUDED.medal,
  rank = EXCLUDED.rank;

-- Event 10: Data Pipeline — genai-toolbox + aws
INSERT INTO olympic_event_competitors (event_id, skill_id, sample_size, value_score, medal, rank, last_updated_at)
SELECT e.id, s.id, sub.cnt, sub.avg_val,
  CASE sub.rn WHEN 1 THEN 'gold' WHEN 2 THEN 'silver' ELSE NULL END,
  sub.rn, NOW()
FROM olympic_events e
CROSS JOIN LATERAL (
  SELECT orec.skill_id, ROUND(AVG(os.value_score),2) AS avg_val, COUNT(*) AS cnt,
    ROW_NUMBER() OVER (ORDER BY AVG(os.value_score) DESC) AS rn
  FROM outcome_records orec
  JOIN outcome_scores os ON os.outcome_record_id = orec.id
  WHERE orec.skill_id IN (
    (SELECT id FROM skills WHERE slug = 'genai-toolbox'),
    (SELECT id FROM skills WHERE slug = 'aws-mcp')
  )
  GROUP BY orec.skill_id
) sub
JOIN skills s ON s.id = sub.skill_id
WHERE e.slug = 'data-pipeline-orchestration'
ON CONFLICT (event_id, skill_id) DO UPDATE SET
  sample_size = EXCLUDED.sample_size,
  value_score = EXCLUDED.value_score,
  medal = EXCLUDED.medal,
  rank = EXCLUDED.rank;

-- ─────────────────────────────────────────────
-- 7. AGENT LEADERBOARD
-- ─────────────────────────────────────────────

INSERT INTO agent_leaderboard (
  agent_identity_id, workflow_slug, total_runs, success_count, success_rate,
  avg_value_score, avg_latency_ms, avg_cost_usd, missions_completed, rank, last_run_at
) VALUES
  -- BenchBot-Claude: evaluation agent, strong across dev + research
  ('b0000000-0000-0000-0000-000000000001', 'developer-workflow-code-management',
   85, 72, 0.8471, 8.45, 1850, 0.0320, 3, 1, NOW() - INTERVAL '1 day'),
  ('b0000000-0000-0000-0000-000000000001', 'research-competitive-intelligence',
   42, 35, 0.8333, 8.12, 3200, 0.0850, 1, 2, NOW() - INTERVAL '2 days'),
  -- BenchBot-GPT: evaluation agent, good on QA
  ('b0000000-0000-0000-0000-000000000002', 'qa-testing-automation',
   55, 44, 0.8000, 7.85, 5500, 0.1800, 2, 1, NOW() - INTERVAL '1 day'),
  ('b0000000-0000-0000-0000-000000000002', 'data-analysis-reporting',
   30, 25, 0.8333, 7.92, 2100, 0.0280, 1, 2, NOW() - INTERVAL '3 days'),
  -- FleetRunner-Auto: autonomous, high volume
  ('b0000000-0000-0000-0000-000000000003', 'it-devops-platform-operations',
   95, 82, 0.8632, 8.65, 2800, 0.0450, 2, 1, NOW() - INTERVAL '6 hours'),
  ('b0000000-0000-0000-0000-000000000003', 'developer-workflow-code-management',
   68, 61, 0.8971, 8.78, 1600, 0.0250, 2, 2, NOW() - INTERVAL '12 hours'),
  -- FleetRunner-Workflow: workflow agent
  ('b0000000-0000-0000-0000-000000000004', 'customer-support-automation',
   48, 39, 0.8125, 7.65, 1900, 0.0180, 1, 1, NOW() - INTERVAL '2 days'),
  ('b0000000-0000-0000-0000-000000000004', 'knowledge-management',
   35, 29, 0.8286, 7.88, 1500, 0.0150, 1, 2, NOW() - INTERVAL '1 day'),
  -- CommunityPilot: copilot, lower volume but decent
  ('b0000000-0000-0000-0000-000000000005', 'design-to-code-workflow',
   22, 18, 0.8182, 7.95, 2200, 0.0320, 0, 1, NOW() - INTERVAL '3 days'),
  ('b0000000-0000-0000-0000-000000000005', 'research-competitive-intelligence',
   28, 22, 0.7857, 7.42, 3800, 0.0920, 0, 3, NOW() - INTERVAL '4 days');

-- Agent global stats
INSERT INTO agent_global_stats (
  agent_identity_id, total_runs, total_success, overall_success_rate,
  overall_avg_value_score, total_missions_completed, total_routing_credits,
  total_reputation_points, global_rank
) VALUES
  ('b0000000-0000-0000-0000-000000000001', 127, 107, 0.8425, 8.32, 4, 850, 420, 1),
  ('b0000000-0000-0000-0000-000000000002',  85,  69, 0.8118, 7.89, 3, 520, 280, 3),
  ('b0000000-0000-0000-0000-000000000003', 163, 143, 0.8773, 8.71, 4, 1100, 580, 2),  -- this is actually the top performer but we use slightly different weighting for global rank vs just success rate
  ('b0000000-0000-0000-0000-000000000004',  83,  68, 0.8193, 7.76, 2, 380, 190, 4),
  ('b0000000-0000-0000-0000-000000000005',  50,  40, 0.8000, 7.68, 0, 120, 65, 5);

-- ─────────────────────────────────────────────
-- 8. TELEMETRY RATE TRACKING — 7 days
-- ─────────────────────────────────────────────

INSERT INTO telemetry_rate_tracking (
  period_start, period_end,
  total_recommendations, total_reported_runs,
  telemetry_rate, by_workflow_json, created_at
) VALUES
  (NOW() - INTERVAL '7 days', NOW() - INTERVAL '6 days',
   145, 58, 0.4000,
   '{"developer-workflow-code-management": {"recs": 45, "runs": 22}, "research-competitive-intelligence": {"recs": 35, "runs": 12}, "qa-testing-automation": {"recs": 25, "runs": 10}, "it-devops-platform-operations": {"recs": 20, "runs": 8}, "data-analysis-reporting": {"recs": 20, "runs": 6}}'::jsonb,
   NOW() - INTERVAL '6 days'),
  (NOW() - INTERVAL '6 days', NOW() - INTERVAL '5 days',
   162, 73, 0.4506,
   '{"developer-workflow-code-management": {"recs": 52, "runs": 28}, "research-competitive-intelligence": {"recs": 38, "runs": 15}, "qa-testing-automation": {"recs": 28, "runs": 12}, "it-devops-platform-operations": {"recs": 22, "runs": 10}, "data-analysis-reporting": {"recs": 22, "runs": 8}}'::jsonb,
   NOW() - INTERVAL '5 days'),
  (NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days',
   178, 85, 0.4775,
   '{"developer-workflow-code-management": {"recs": 55, "runs": 30}, "research-competitive-intelligence": {"recs": 40, "runs": 18}, "qa-testing-automation": {"recs": 30, "runs": 14}, "it-devops-platform-operations": {"recs": 28, "runs": 13}, "data-analysis-reporting": {"recs": 25, "runs": 10}}'::jsonb,
   NOW() - INTERVAL '4 days'),
  (NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days',
   155, 78, 0.5032,
   '{"developer-workflow-code-management": {"recs": 48, "runs": 27}, "research-competitive-intelligence": {"recs": 35, "runs": 16}, "qa-testing-automation": {"recs": 28, "runs": 15}, "it-devops-platform-operations": {"recs": 24, "runs": 12}, "data-analysis-reporting": {"recs": 20, "runs": 8}}'::jsonb,
   NOW() - INTERVAL '3 days'),
  (NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days',
   190, 95, 0.5000,
   '{"developer-workflow-code-management": {"recs": 60, "runs": 32}, "research-competitive-intelligence": {"recs": 42, "runs": 20}, "qa-testing-automation": {"recs": 32, "runs": 18}, "it-devops-platform-operations": {"recs": 30, "runs": 14}, "data-analysis-reporting": {"recs": 26, "runs": 11}}'::jsonb,
   NOW() - INTERVAL '2 days'),
  (NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day',
   198, 105, 0.5303,
   '{"developer-workflow-code-management": {"recs": 62, "runs": 35}, "research-competitive-intelligence": {"recs": 45, "runs": 22}, "qa-testing-automation": {"recs": 35, "runs": 20}, "it-devops-platform-operations": {"recs": 30, "runs": 16}, "data-analysis-reporting": {"recs": 26, "runs": 12}}'::jsonb,
   NOW() - INTERVAL '1 day'),
  (NOW() - INTERVAL '1 day', NOW(),
   175, 92, 0.5257,
   '{"developer-workflow-code-management": {"recs": 55, "runs": 31}, "research-competitive-intelligence": {"recs": 40, "runs": 20}, "qa-testing-automation": {"recs": 30, "runs": 16}, "it-devops-platform-operations": {"recs": 28, "runs": 15}, "data-analysis-reporting": {"recs": 22, "runs": 10}}'::jsonb,
   NOW());

-- ─────────────────────────────────────────────
-- 9. CONTRIBUTION EVENTS + SCORES (12 events)
-- ─────────────────────────────────────────────

-- run_telemetry contributions from BenchBot-Claude
INSERT INTO contribution_events (id, contributor_id, agent_identity_id, contribution_type, run_count, payload_json, proof_type, accepted, created_at) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   'run_telemetry', 25,
   '{"skill_slug": "context7", "workflow": "developer-workflow-code-management", "success_rate": 0.88, "avg_latency_ms": 1200}'::jsonb,
   'runtime_signed', true, NOW() - INTERVAL '20 days'),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   'run_telemetry', 18,
   '{"skill_slug": "github-mcp-server", "workflow": "developer-workflow-code-management", "success_rate": 0.83, "avg_latency_ms": 1800}'::jsonb,
   'runtime_signed', true, NOW() - INTERVAL '18 days'),
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002',
   'run_telemetry', 15,
   '{"skill_slug": "playwright-mcp", "workflow": "qa-testing-automation", "success_rate": 0.80, "avg_latency_ms": 6500}'::jsonb,
   'client_signed', true, NOW() - INTERVAL '15 days');

-- comparative_eval from Agent Fleet Alpha
INSERT INTO contribution_events (id, contributor_id, agent_identity_id, contribution_type, run_count, payload_json, proof_type, accepted, created_at) VALUES
  ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003',
   'comparative_eval', 10,
   '{"skills_compared": ["firecrawl-mcp", "exa-mcp-server"], "benchmark": "web-research-profile-v1", "winner": "firecrawl-mcp", "margin": 0.35}'::jsonb,
   'runtime_signed', true, NOW() - INTERVAL '12 days'),
  ('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003',
   'comparative_eval', 8,
   '{"skills_compared": ["context7", "github-mcp-server"], "benchmark": "repo-qa-profile-v1", "winner": "context7", "margin": 0.18}'::jsonb,
   'client_signed', true, NOW() - INTERVAL '10 days'),
  ('c0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000004',
   'comparative_eval', 6,
   '{"skills_compared": ["notion-mcp-server", "atlassian-mcp"], "benchmark": "knowledge-base-search-v1", "winner": "notion-mcp-server", "margin": 0.22}'::jsonb,
   'self_reported', true, NOW() - INTERVAL '8 days');

-- fallback_chain from various
INSERT INTO contribution_events (id, contributor_id, agent_identity_id, contribution_type, run_count, payload_json, proof_type, accepted, created_at) VALUES
  ('c0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   'fallback_chain', 5,
   '{"primary_skill": "firecrawl-mcp", "fallback_skill": "exa-mcp-server", "fallback_trigger": "timeout", "recovery_rate": 0.80}'::jsonb,
   'runtime_signed', true, NOW() - INTERVAL '14 days'),
  ('c0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000004',
   'fallback_chain', 3,
   '{"primary_skill": "atlassian-mcp", "fallback_skill": "notion-mcp-server", "fallback_trigger": "auth_failure", "recovery_rate": 0.67}'::jsonb,
   'client_signed', true, NOW() - INTERVAL '9 days'),
  ('c0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000005',
   'fallback_chain', 4,
   '{"primary_skill": "context7", "fallback_skill": "github-mcp-server", "fallback_trigger": "rate_limit", "recovery_rate": 0.75}'::jsonb,
   'self_reported', true, NOW() - INTERVAL '6 days');

-- run_telemetry from Community Tester
INSERT INTO contribution_events (id, contributor_id, agent_identity_id, contribution_type, run_count, payload_json, proof_type, accepted, created_at) VALUES
  ('c0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000005',
   'run_telemetry', 12,
   '{"skill_slug": "figma-context-mcp", "workflow": "design-to-code-workflow", "success_rate": 0.83, "avg_latency_ms": 2200}'::jsonb,
   'self_reported', true, NOW() - INTERVAL '5 days'),
  ('c0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000005',
   'run_telemetry', 8,
   '{"skill_slug": "aws-mcp", "workflow": "it-devops-platform-operations", "success_rate": 0.875, "avg_latency_ms": 3100}'::jsonb,
   'self_reported', true, NOW() - INTERVAL '3 days'),
  ('c0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003',
   'run_telemetry', 20,
   '{"skill_slug": "genai-toolbox", "workflow": "data-analysis-reporting", "success_rate": 0.85, "avg_latency_ms": 1900}'::jsonb,
   'runtime_signed', true, NOW() - INTERVAL '2 days');

-- Contribution scores for each event
INSERT INTO contribution_scores (
  contribution_event_id, validity_score, usefulness_score, novelty_score,
  consistency_score, anti_gaming_score, overall_contribution_score, scored_at
) VALUES
  -- run_telemetry: high validity, moderate novelty
  ('c0000000-0000-0000-0000-000000000001', 9.2, 8.5, 6.0, 8.8, 9.5,
   ROUND(0.30*9.2 + 0.25*8.5 + 0.20*6.0 + 0.15*8.8 + 0.10*9.5, 2), NOW() - INTERVAL '20 days'),
  ('c0000000-0000-0000-0000-000000000002', 9.0, 8.2, 5.5, 8.5, 9.3,
   ROUND(0.30*9.0 + 0.25*8.2 + 0.20*5.5 + 0.15*8.5 + 0.10*9.3, 2), NOW() - INTERVAL '18 days'),
  ('c0000000-0000-0000-0000-000000000003', 8.5, 7.8, 5.0, 8.0, 9.0,
   ROUND(0.30*8.5 + 0.25*7.8 + 0.20*5.0 + 0.15*8.0 + 0.10*9.0, 2), NOW() - INTERVAL '15 days'),
  -- comparative_eval: high novelty and usefulness
  ('c0000000-0000-0000-0000-000000000004', 9.5, 9.2, 8.5, 9.0, 9.8,
   ROUND(0.30*9.5 + 0.25*9.2 + 0.20*8.5 + 0.15*9.0 + 0.10*9.8, 2), NOW() - INTERVAL '12 days'),
  ('c0000000-0000-0000-0000-000000000005', 9.2, 9.0, 8.0, 8.8, 9.5,
   ROUND(0.30*9.2 + 0.25*9.0 + 0.20*8.0 + 0.15*8.8 + 0.10*9.5, 2), NOW() - INTERVAL '10 days'),
  ('c0000000-0000-0000-0000-000000000006', 8.0, 8.5, 7.5, 7.8, 8.5,
   ROUND(0.30*8.0 + 0.25*8.5 + 0.20*7.5 + 0.15*7.8 + 0.10*8.5, 2), NOW() - INTERVAL '8 days'),
  -- fallback_chain: high usefulness and novelty
  ('c0000000-0000-0000-0000-000000000007', 9.0, 9.5, 9.0, 8.5, 9.2,
   ROUND(0.30*9.0 + 0.25*9.5 + 0.20*9.0 + 0.15*8.5 + 0.10*9.2, 2), NOW() - INTERVAL '14 days'),
  ('c0000000-0000-0000-0000-000000000008', 8.5, 8.8, 8.0, 7.5, 8.8,
   ROUND(0.30*8.5 + 0.25*8.8 + 0.20*8.0 + 0.15*7.5 + 0.10*8.8, 2), NOW() - INTERVAL '9 days'),
  ('c0000000-0000-0000-0000-000000000009', 7.5, 8.0, 7.0, 7.0, 8.0,
   ROUND(0.30*7.5 + 0.25*8.0 + 0.20*7.0 + 0.15*7.0 + 0.10*8.0, 2), NOW() - INTERVAL '6 days'),
  -- community tester run_telemetry
  ('c0000000-0000-0000-0000-000000000010', 7.8, 7.5, 6.5, 7.2, 8.0,
   ROUND(0.30*7.8 + 0.25*7.5 + 0.20*6.5 + 0.15*7.2 + 0.10*8.0, 2), NOW() - INTERVAL '5 days'),
  ('c0000000-0000-0000-0000-000000000011', 8.0, 7.8, 6.0, 7.5, 8.2,
   ROUND(0.30*8.0 + 0.25*7.8 + 0.20*6.0 + 0.15*7.5 + 0.10*8.2, 2), NOW() - INTERVAL '3 days'),
  ('c0000000-0000-0000-0000-000000000012', 9.0, 8.8, 7.0, 8.5, 9.5,
   ROUND(0.30*9.0 + 0.25*8.8 + 0.20*7.0 + 0.15*8.5 + 0.10*9.5, 2), NOW() - INTERVAL '2 days');

-- ─────────────────────────────────────────────
-- 10. REWARD LEDGER for accepted contributions
-- ─────────────────────────────────────────────

INSERT INTO reward_ledgers (
  contributor_id, agent_identity_id, contribution_event_id,
  routing_credits, economic_credits_usd, reputation_points, reason, created_at
) VALUES
  -- BenchBot run_telemetry (multiplier 1.0)
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
   82, 0.0820, 25, 'run_telemetry: 25 runs for context7', NOW() - INTERVAL '20 days'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002',
   75, 0.0750, 22, 'run_telemetry: 18 runs for github-mcp-server', NOW() - INTERVAL '18 days'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003',
   60, 0.0600, 18, 'run_telemetry: 15 runs for playwright-mcp', NOW() - INTERVAL '15 days'),
  -- Agent Fleet comparative_eval (multiplier 2.5)
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000004',
   230, 0.2300, 75, 'comparative_eval: firecrawl vs exa web research', NOW() - INTERVAL '12 days'),
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000005',
   218, 0.2180, 70, 'comparative_eval: context7 vs github repo QA', NOW() - INTERVAL '10 days'),
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000006',
   195, 0.1950, 58, 'comparative_eval: notion vs atlassian KB search', NOW() - INTERVAL '8 days'),
  -- fallback_chain (multiplier 1.5)
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000007',
   135, 0.1350, 42, 'fallback_chain: firecrawl->exa timeout recovery', NOW() - INTERVAL '14 days'),
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000008',
   118, 0.1180, 35, 'fallback_chain: atlassian->notion auth recovery', NOW() - INTERVAL '9 days'),
  ('a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000009',
   88, 0.0880, 28, 'fallback_chain: context7->github rate limit recovery', NOW() - INTERVAL '6 days'),
  -- Community tester run_telemetry
  ('a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000010',
   55, 0.0550, 15, 'run_telemetry: 12 runs for figma-context-mcp', NOW() - INTERVAL '5 days'),
  ('a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000011',
   58, 0.0580, 16, 'run_telemetry: 8 runs for aws-mcp', NOW() - INTERVAL '3 days'),
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000012',
   85, 0.0850, 28, 'run_telemetry: 20 runs for genai-toolbox', NOW() - INTERVAL '2 days');

-- ─────────────────────────────────────────────
-- SEED CONTRIBUTOR REPUTATION
-- ─────────────────────────────────────────────

INSERT INTO contributor_reputation (
  contributor_id, total_contributions, accepted_contributions,
  comparative_evals_count, fallback_reports_count, benchmark_packages_count,
  reputation_score, contributor_tier
) VALUES
  ('a0000000-0000-0000-0000-000000000001', 4, 4, 0, 1, 0, 78.5, 'gold'),
  ('a0000000-0000-0000-0000-000000000002', 5, 5, 3, 1, 0, 85.2, 'platinum'),
  ('a0000000-0000-0000-0000-000000000003', 3, 3, 0, 1, 0, 52.0, 'silver')
ON CONFLICT (contributor_id) DO UPDATE SET
  total_contributions = EXCLUDED.total_contributions,
  accepted_contributions = EXCLUDED.accepted_contributions,
  comparative_evals_count = EXCLUDED.comparative_evals_count,
  fallback_reports_count = EXCLUDED.fallback_reports_count,
  reputation_score = EXCLUDED.reputation_score,
  contributor_tier = EXCLUDED.contributor_tier,
  updated_at = NOW();
