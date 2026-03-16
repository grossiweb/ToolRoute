-- NeoSkill Migration 009: Outcome Data & Coverage Gaps
-- Part 1: Seed ~200 realistic outcome records across top 20 skills
-- Part 2: Fill task mapping coverage gaps
-- Part 3: Fill tool_type coverage gaps for leaderboard categories
-- Run AFTER 008_tasks_and_tool_types.sql
-- Version: 1.0 | March 2026

-- ─────────────────────────────────────────────
-- PART 1: SEED ~200 REALISTIC OUTCOME RECORDS
-- Spread across 20 skills, 10 agent hashes, multiple benchmark profiles
-- 85% success, 10% partial, 5% failure
-- ─────────────────────────────────────────────

-- First, add 5 more agent identities for variety (joining existing contributors)
INSERT INTO agent_identities (id, contributor_id, agent_name, agent_kind, host_client_slug, model_family, environment_label, trust_tier, created_at) VALUES
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001',
   'BenchBot-Gemini', 'evaluation-agent', 'vscode', 'gemini-2.0', 'ci-benchmark', 'trusted', NOW() - INTERVAL '30 days'),
  ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000002',
   'FleetRunner-Sonnet', 'autonomous', 'claude-code', 'claude-3.5-sonnet', 'production-fleet', 'production', NOW() - INTERVAL '25 days'),
  ('b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000002',
   'FleetRunner-Mini', 'workflow-agent', 'copilot', 'gpt-4o-mini', 'staging-fleet', 'baseline', NOW() - INTERVAL '20 days'),
  ('b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000003',
   'CommunityAgent-Qwen', 'copilot', 'windsurf', 'qwen-2.5', 'local-dev', 'baseline', NOW() - INTERVAL '18 days'),
  ('b0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000003',
   'CommunityAgent-DeepSeek', 'hybrid', 'cline', 'deepseek-v3', 'local-dev', 'unverified', NOW() - INTERVAL '15 days')
ON CONFLICT (id) DO NOTHING;

-- Generate 200 outcome records using DO block
DO $$
DECLARE
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
  v_created         TIMESTAMP;
  v_grade           TEXT;
  i                 INT;
  v_rand            FLOAT;
  v_skill_id        UUID;
  v_bench_id        UUID;
  v_workflow        TEXT;
  v_fingerprint     TEXT;
  v_skill_version   TEXT;
  v_skill_slug      TEXT;
  -- Skill IDs (top 20)
  v_s_brave         UUID;
  v_s_tavily        UUID;
  v_s_perplexity    UUID;
  v_s_browserbase   UUID;
  v_s_puppeteer     UUID;
  v_s_gitlab        UUID;
  v_s_linear        UUID;
  v_s_sentry        UUID;
  v_s_terraform     UUID;
  v_s_kubernetes    UUID;
  v_s_cloudflare    UUID;
  v_s_supabase      UUID;
  v_s_neon          UUID;
  v_s_hubspot       UUID;
  v_s_salesforce    UUID;
  v_s_stripe        UUID;
  v_s_slack         UUID;
  v_s_shopify       UUID;
  v_s_snyk          UUID;
  v_s_obsidian      UUID;
  -- Benchmark profile IDs
  v_web_research    UUID;
  v_browser_task    UUID;
  v_repo_qa         UUID;
  v_db_query        UUID;
  v_crm_enrich      UUID;
  v_ticket_triage   UUID;
  v_ecommerce_cat   UUID;
  v_automation      UUID;
  v_kb_search       UUID;
  -- Agent IDs array (10 total)
  v_agents          UUID[];
BEGIN
  -- Look up skill IDs
  SELECT id INTO v_s_brave       FROM skills WHERE slug = 'brave-search-mcp';
  SELECT id INTO v_s_tavily      FROM skills WHERE slug = 'tavily-mcp';
  SELECT id INTO v_s_perplexity  FROM skills WHERE slug = 'perplexity-mcp';
  SELECT id INTO v_s_browserbase FROM skills WHERE slug = 'browserbase-mcp';
  SELECT id INTO v_s_puppeteer   FROM skills WHERE slug = 'puppeteer-mcp';
  SELECT id INTO v_s_gitlab      FROM skills WHERE slug = 'gitlab-mcp';
  SELECT id INTO v_s_linear      FROM skills WHERE slug = 'linear-mcp';
  SELECT id INTO v_s_sentry      FROM skills WHERE slug = 'sentry-mcp';
  SELECT id INTO v_s_terraform   FROM skills WHERE slug = 'terraform-mcp';
  SELECT id INTO v_s_kubernetes  FROM skills WHERE slug = 'kubernetes-mcp';
  SELECT id INTO v_s_cloudflare  FROM skills WHERE slug = 'cloudflare-mcp';
  SELECT id INTO v_s_supabase    FROM skills WHERE slug = 'supabase-mcp';
  SELECT id INTO v_s_neon        FROM skills WHERE slug = 'neon-mcp';
  SELECT id INTO v_s_hubspot     FROM skills WHERE slug = 'hubspot-mcp';
  SELECT id INTO v_s_salesforce  FROM skills WHERE slug = 'salesforce-mcp';
  SELECT id INTO v_s_stripe      FROM skills WHERE slug = 'stripe-mcp';
  SELECT id INTO v_s_slack       FROM skills WHERE slug = 'slack-mcp';
  SELECT id INTO v_s_shopify     FROM skills WHERE slug = 'shopify-mcp';
  SELECT id INTO v_s_snyk        FROM skills WHERE slug = 'snyk-mcp';
  SELECT id INTO v_s_obsidian    FROM skills WHERE slug = 'obsidian-mcp';

  -- Look up benchmark profile IDs
  SELECT id INTO v_web_research  FROM benchmark_profiles WHERE slug = 'web-research-profile-v1';
  SELECT id INTO v_browser_task  FROM benchmark_profiles WHERE slug = 'browser-task-completion-v1';
  SELECT id INTO v_repo_qa       FROM benchmark_profiles WHERE slug = 'repo-qa-profile-v1';
  SELECT id INTO v_db_query      FROM benchmark_profiles WHERE slug = 'database-query-analysis-v1';
  SELECT id INTO v_crm_enrich    FROM benchmark_profiles WHERE slug = 'crm-enrichment-v1';
  SELECT id INTO v_ticket_triage FROM benchmark_profiles WHERE slug = 'ticket-triage-v1';
  SELECT id INTO v_ecommerce_cat FROM benchmark_profiles WHERE slug = 'ecommerce-catalog-extraction-v1';
  SELECT id INTO v_automation    FROM benchmark_profiles WHERE slug = 'automation-task-execution-v1';
  SELECT id INTO v_kb_search     FROM benchmark_profiles WHERE slug = 'knowledge-base-search-v1';

  -- Generate 200 outcome records
  FOR i IN 1..200 LOOP
    v_outcome_id := gen_random_uuid();
    v_rand := random();

    -- Assign skill + benchmark + workflow + fingerprint based on index mod 20
    CASE (i % 20)
      WHEN 0 THEN
        v_skill_id := v_s_brave; v_bench_id := v_web_research;
        v_workflow := 'research-competitive-intelligence';
        v_fingerprint := 'brave-search-query-' || LPAD(((i/20) + 1)::text, 3, '0');
        v_skill_version := '1.2.0';
      WHEN 1 THEN
        v_skill_id := v_s_tavily; v_bench_id := v_web_research;
        v_workflow := 'research-competitive-intelligence';
        v_fingerprint := 'tavily-research-' || LPAD(((i/20) + 1)::text, 3, '0');
        v_skill_version := '1.0.3';
      WHEN 2 THEN
        v_skill_id := v_s_perplexity; v_bench_id := v_web_research;
        v_workflow := 'research-competitive-intelligence';
        v_fingerprint := 'perplexity-deep-research-' || LPAD(((i/20) + 1)::text, 3, '0');
        v_skill_version := '0.8.0';
      WHEN 3 THEN
        v_skill_id := v_s_browserbase; v_bench_id := v_browser_task;
        v_workflow := 'qa-testing-automation';
        v_fingerprint := 'browserbase-session-' || LPAD(((i/20) + 1)::text, 3, '0');
        v_skill_version := '2.1.0';
      WHEN 4 THEN
        v_skill_id := v_s_puppeteer; v_bench_id := v_browser_task;
        v_workflow := 'qa-testing-automation';
        v_fingerprint := 'puppeteer-scrape-' || LPAD(((i/20) + 1)::text, 3, '0');
        v_skill_version := '1.5.2';
      WHEN 5 THEN
        v_skill_id := v_s_gitlab; v_bench_id := v_repo_qa;
        v_workflow := 'developer-workflow-code-management';
        v_fingerprint := 'gitlab-mr-review-' || LPAD(((i/20) + 1)::text, 3, '0');
        v_skill_version := '0.7.1';
      WHEN 6 THEN
        v_skill_id := v_s_linear; v_bench_id := v_ticket_triage;
        v_workflow := 'developer-workflow-code-management';
        v_fingerprint := 'linear-issue-triage-' || LPAD(((i/20) + 1)::text, 3, '0');
        v_skill_version := '0.4.0';
      WHEN 7 THEN
        v_skill_id := v_s_sentry; v_bench_id := v_repo_qa;
        v_workflow := 'developer-workflow-code-management';
        v_fingerprint := 'sentry-error-diagnose-' || LPAD(((i/20) + 1)::text, 3, '0');
        v_skill_version := '1.1.0';
      WHEN 8 THEN
        v_skill_id := v_s_terraform; v_bench_id := v_automation;
        v_workflow := 'it-devops-platform-operations';
        v_fingerprint := 'terraform-plan-apply-' || LPAD(((i/20) + 1)::text, 3, '0');
        v_skill_version := '1.0.0';
      WHEN 9 THEN
        v_skill_id := v_s_kubernetes; v_bench_id := v_automation;
        v_workflow := 'it-devops-platform-operations';
        v_fingerprint := 'k8s-pod-inspect-' || LPAD(((i/20) + 1)::text, 3, '0');
        v_skill_version := '0.6.0';
      WHEN 10 THEN
        v_skill_id := v_s_cloudflare; v_bench_id := v_automation;
        v_workflow := 'it-devops-platform-operations';
        v_fingerprint := 'cloudflare-worker-deploy-' || LPAD(((i/20) + 1)::text, 3, '0');
        v_skill_version := '1.3.0';
      WHEN 11 THEN
        v_skill_id := v_s_supabase; v_bench_id := v_db_query;
        v_workflow := 'data-analysis-reporting';
        v_fingerprint := 'supabase-query-exec-' || LPAD(((i/20) + 1)::text, 3, '0');
        v_skill_version := '0.5.0';
      WHEN 12 THEN
        v_skill_id := v_s_neon; v_bench_id := v_db_query;
        v_workflow := 'data-analysis-reporting';
        v_fingerprint := 'neon-branch-query-' || LPAD(((i/20) + 1)::text, 3, '0');
        v_skill_version := '0.3.0';
      WHEN 13 THEN
        v_skill_id := v_s_hubspot; v_bench_id := v_crm_enrich;
        v_workflow := 'sales-research-outreach';
        v_fingerprint := 'hubspot-contact-enrich-' || LPAD(((i/20) + 1)::text, 3, '0');
        v_skill_version := '1.0.1';
      WHEN 14 THEN
        v_skill_id := v_s_salesforce; v_bench_id := v_crm_enrich;
        v_workflow := 'sales-research-outreach';
        v_fingerprint := 'salesforce-lead-update-' || LPAD(((i/20) + 1)::text, 3, '0');
        v_skill_version := '0.9.0';
      WHEN 15 THEN
        v_skill_id := v_s_stripe; v_bench_id := v_db_query;
        v_workflow := 'finance-accounting-automation';
        v_fingerprint := 'stripe-payment-create-' || LPAD(((i/20) + 1)::text, 3, '0');
        v_skill_version := '2.0.0';
      WHEN 16 THEN
        v_skill_id := v_s_slack; v_bench_id := v_ticket_triage;
        v_workflow := 'executive-assistant-productivity';
        v_fingerprint := 'slack-msg-send-' || LPAD(((i/20) + 1)::text, 3, '0');
        v_skill_version := '1.2.0';
      WHEN 17 THEN
        v_skill_id := v_s_shopify; v_bench_id := v_ecommerce_cat;
        v_workflow := 'ecommerce-operations';
        v_fingerprint := 'shopify-product-sync-' || LPAD(((i/20) + 1)::text, 3, '0');
        v_skill_version := '1.1.0';
      WHEN 18 THEN
        v_skill_id := v_s_snyk; v_bench_id := v_repo_qa;
        v_workflow := 'security-operations';
        v_fingerprint := 'snyk-vuln-scan-deep-' || LPAD(((i/20) + 1)::text, 3, '0');
        v_skill_version := '1.4.0';
      WHEN 19 THEN
        v_skill_id := v_s_obsidian; v_bench_id := v_kb_search;
        v_workflow := 'knowledge-management';
        v_fingerprint := 'obsidian-note-search-' || LPAD(((i/20) + 1)::text, 3, '0');
        v_skill_version := '0.5.0';
      ELSE
        v_skill_id := v_s_brave; v_bench_id := v_web_research;
        v_workflow := 'research-competitive-intelligence';
        v_fingerprint := 'misc-outcome-' || i::text;
        v_skill_version := '1.0.0';
    END CASE;

    -- Skip if skill not found
    IF v_skill_id IS NULL THEN
      CONTINUE;
    END IF;

    -- Determine outcome status: 85% success, 10% partial, 5% failure
    IF v_rand < 0.85 THEN
      v_status := 'success';
    ELSIF v_rand < 0.95 THEN
      v_status := 'partial_success';
    ELSE
      v_status := 'failure';
    END IF;

    -- Latency based on skill type
    CASE (i % 20)
      WHEN 3 THEN  v_latency := 2500 + (random() * 10000)::int;  -- browserbase: 2.5-12.5s
      WHEN 4 THEN  v_latency := 2000 + (random() * 8000)::int;   -- puppeteer: 2-10s
      WHEN 8 THEN  v_latency := 3000 + (random() * 5000)::int;   -- terraform: 3-8s
      WHEN 9 THEN  v_latency := 1500 + (random() * 4000)::int;   -- k8s: 1.5-5.5s
      WHEN 10 THEN v_latency := 800 + (random() * 3000)::int;    -- cloudflare: 0.8-3.8s
      WHEN 11 THEN v_latency := 500 + (random() * 2500)::int;    -- supabase: 0.5-3s
      WHEN 12 THEN v_latency := 500 + (random() * 2000)::int;    -- neon: 0.5-2.5s
      WHEN 15 THEN v_latency := 600 + (random() * 2000)::int;    -- stripe: 0.6-2.6s
      WHEN 16 THEN v_latency := 300 + (random() * 1500)::int;    -- slack: 0.3-1.8s
      WHEN 17 THEN v_latency := 800 + (random() * 3000)::int;    -- shopify: 0.8-3.8s
      WHEN 18 THEN v_latency := 3000 + (random() * 5000)::int;   -- snyk: 3-8s
      ELSE          v_latency := 500 + (random() * 3500)::int;    -- search/general: 0.5-4s
    END CASE;

    -- Cost based on skill type
    CASE (i % 20)
      WHEN 3 THEN  v_cost := (0.020 + random() * 0.130)::numeric(10,4);  -- browserbase: $0.02-$0.15
      WHEN 4 THEN  v_cost := (0.005 + random() * 0.050)::numeric(10,4);  -- puppeteer: $0.005-$0.055
      WHEN 8 THEN  v_cost := (0.010 + random() * 0.080)::numeric(10,4);  -- terraform: $0.01-$0.09
      WHEN 15 THEN v_cost := (0.002 + random() * 0.010)::numeric(10,4);  -- stripe: $0.002-$0.012
      WHEN 16 THEN v_cost := (0.001 + random() * 0.005)::numeric(10,4);  -- slack: $0.001-$0.006
      WHEN 18 THEN v_cost := (0.005 + random() * 0.020)::numeric(10,4);  -- snyk: $0.005-$0.025
      ELSE          v_cost := (0.001 + random() * 0.030)::numeric(10,4); -- general: $0.001-$0.031
    END CASE;

    -- Quality correlated with outcome
    CASE v_status
      WHEN 'success'         THEN v_quality := (7.8 + random() * 2.0)::numeric(4,2);  -- 7.8-9.8
      WHEN 'partial_success' THEN v_quality := (6.0 + random() * 2.0)::numeric(4,2);  -- 6.0-8.0
      WHEN 'failure'         THEN v_quality := (2.5 + random() * 3.0)::numeric(4,2);  -- 2.5-5.5
      ELSE                        v_quality := 5.0;
    END CASE;

    -- Proof type: 50% self_reported, 35% client_signed, 15% runtime_signed
    v_rand := random();
    IF v_rand < 0.50 THEN v_proof := 'self_reported';
    ELSIF v_rand < 0.85 THEN v_proof := 'client_signed';
    ELSE v_proof := 'runtime_signed';
    END IF;

    -- Structured output valid
    IF v_status = 'success' THEN
      v_structured := random() < 0.93;
    ELSIF v_status = 'partial_success' THEN
      v_structured := random() < 0.55;
    ELSE
      v_structured := random() < 0.15;
    END IF;

    -- Human correction: ~12% need it
    v_human_corr := random() < 0.12;
    IF v_human_corr THEN
      v_corr_min := (1.5 + random() * 20.0)::numeric(10,2);
    ELSE
      v_corr_min := 0;
    END IF;

    -- Date spread: last 45 days
    v_created := NOW() - (random() * 45)::int * INTERVAL '1 day' - (random() * 86400)::int * INTERVAL '1 second';

    -- Insert outcome record
    INSERT INTO outcome_records (
      id, skill_id, benchmark_profile_id, workflow_slug,
      task_fingerprint, skill_version, outcome_status,
      latency_ms, estimated_cost_usd, retries,
      output_quality_rating, structured_output_valid,
      human_correction_required, human_correction_minutes,
      proof_type, created_at
    ) VALUES (
      v_outcome_id, v_skill_id, v_bench_id, v_workflow,
      v_fingerprint, v_skill_version, v_status,
      v_latency, v_cost, CASE WHEN v_status = 'failure' THEN (random() * 3)::int ELSE 0 END,
      v_quality, v_structured,
      v_human_corr, v_corr_min,
      v_proof, v_created
    );

    -- Calculate outcome scores
    CASE v_status
      WHEN 'success'         THEN v_reliability := 9.0;
      WHEN 'partial_success' THEN v_reliability := 6.0;
      WHEN 'failure'         THEN v_reliability := 2.0;
      ELSE                        v_reliability := 5.0;
    END CASE;

    -- efficiency_score: inversely proportional to latency
    v_efficiency := GREATEST(1.0, LEAST(9.5, (10.0 - (v_latency::numeric / 15000.0) * 9.0)))::numeric(4,2);

    -- cost_score: inversely proportional to cost
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
-- UPDATE SKILL BENCHMARK ROLLUPS for the 20 new-outcome skills
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
  ROUND(AVG(os.quality_score), 2),
  ROUND(AVG(os.reliability_score), 2),
  ROUND(AVG(os.efficiency_score), 2),
  ROUND(AVG(os.cost_score), 2),
  ROUND(AVG(os.trust_score), 2),
  ROUND(AVG(os.value_score), 2),
  ROUND(
    CASE WHEN SUM(CASE WHEN orec.outcome_status = 'success' THEN 1 ELSE 0 END) > 0
    THEN SUM(orec.estimated_cost_usd) / SUM(CASE WHEN orec.outcome_status = 'success' THEN 1 ELSE 0 END)
    ELSE 0 END, 4
  ),
  ROUND(AVG(CASE WHEN orec.human_correction_required THEN orec.human_correction_minutes ELSE 0 END), 2),
  ROUND(
    SUM(CASE WHEN orec.fallback_used_skill_id IS NOT NULL THEN 1 ELSE 0 END)::numeric / COUNT(*), 4
  ),
  ROUND(
    SUM(CASE WHEN orec.outcome_status = 'success' THEN 1 ELSE 0 END)::numeric / COUNT(*), 4
  )
FROM outcome_records orec
JOIN outcome_scores os ON os.outcome_record_id = orec.id
WHERE orec.benchmark_profile_id IS NOT NULL
  AND orec.skill_id IN (
    SELECT id FROM skills WHERE slug IN (
      'brave-search-mcp','tavily-mcp','perplexity-mcp','browserbase-mcp','puppeteer-mcp',
      'gitlab-mcp','linear-mcp','sentry-mcp','terraform-mcp','kubernetes-mcp',
      'cloudflare-mcp','supabase-mcp','neon-mcp','hubspot-mcp','salesforce-mcp',
      'stripe-mcp','slack-mcp','shopify-mcp','snyk-mcp','obsidian-mcp'
    )
  )
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
-- PART 2: FILL TASK MAPPING COVERAGE GAPS
-- Ensure skills with real capabilities have 3-5 task mappings
-- Do NOT fake mappings for tasks with 0 tools (STT, TTS, embeddings, etc.)
-- ─────────────────────────────────────────────

INSERT INTO skill_tasks (skill_id, task_id, relevance_score)
SELECT s.id, tsk.id, rel FROM (
  VALUES
    -- Context7: add summarize-documents (it retrieves docs), extract-text-pdf (doc context)
    ('context7'::text, 'summarize-documents'::text, 7.5),
    ('context7', 'manage-repositories', 7.0),

    -- Firecrawl: add summarize-documents (crawl + extract)
    ('firecrawl-mcp', 'summarize-documents', 7.0),

    -- Exa: add summarize-documents (search + synthesis)
    ('exa-mcp-server', 'summarize-documents', 7.5),
    ('exa-mcp-server', 'enrich-leads', 7.0),

    -- Playwright: add extract-text-pdf (via browser), classify-text (DOM analysis)
    ('playwright-mcp', 'extract-text-pdf', 6.5),

    -- GitHub: add manage-tickets (issues are tickets), monitor-errors (actions)
    ('github-mcp-server', 'manage-tickets', 8.0),
    ('github-mcp-server', 'monitor-errors', 7.0),

    -- GitLab: add analyze-code (CI/CD pipeline review), manage-tickets (issues)
    ('gitlab-mcp', 'analyze-code', 7.5),
    ('gitlab-mcp', 'manage-tickets', 8.0),

    -- Linear: add classify-text (issue categorization)
    ('linear-mcp', 'classify-text', 7.0),

    -- Sentry: add generate-reports (error reports), classify-text (error categorization)
    ('sentry-mcp', 'generate-reports', 8.0),
    ('sentry-mcp', 'classify-text', 7.5),

    -- Brave Search: add summarize-documents (search summaries)
    ('brave-search-mcp', 'summarize-documents', 7.0),
    ('brave-search-mcp', 'scrape-web-pages', 6.5),

    -- Tavily: add scrape-web-pages
    ('tavily-mcp', 'scrape-web-pages', 7.0),

    -- Perplexity: add classify-text (categorized research output)
    ('perplexity-mcp', 'classify-text', 6.5),
    ('perplexity-mcp', 'generate-reports', 7.0),

    -- Browserbase: add extract-text-pdf (via browser rendering)
    ('browserbase-mcp', 'extract-text-pdf', 6.5),

    -- Puppeteer: add extract-text-pdf (PDF gen from pages)
    ('puppeteer-mcp', 'extract-text-pdf', 6.5),

    -- AWS: add monitor-errors (CloudWatch), generate-reports (cost reports)
    ('aws-mcp', 'monitor-errors', 8.0),
    ('aws-mcp', 'generate-reports', 7.5),

    -- Terraform: add generate-reports (plan output), analyze-code (HCL review)
    ('terraform-mcp', 'generate-reports', 7.0),
    ('terraform-mcp', 'analyze-code', 7.5),

    -- Kubernetes: add monitor-errors (pod logs), generate-reports (cluster reports)
    ('kubernetes-mcp', 'monitor-errors', 8.5),
    ('kubernetes-mcp', 'generate-reports', 7.0),

    -- Cloudflare: add generate-reports (analytics), monitor-errors (worker errors)
    ('cloudflare-mcp', 'generate-reports', 7.5),
    ('cloudflare-mcp', 'monitor-errors', 7.5),

    -- Supabase: add generate-reports (query-based reports)
    ('supabase-mcp', 'generate-reports', 8.0),

    -- Neon: add generate-reports (query-based reports)
    ('neon-mcp', 'generate-reports', 7.5),

    -- Figma: add generate-reports (design system reports)
    ('figma-context-mcp', 'generate-reports', 6.5),

    -- Storybook: add generate-reports (component coverage)
    ('storybook-mcp', 'generate-reports', 6.5),

    -- Obsidian: add classify-text (note tagging), summarize-documents (note summarization)
    ('obsidian-mcp', 'classify-text', 7.0),
    ('obsidian-mcp', 'summarize-documents', 7.5),

    -- Confluence: add summarize-documents (page summaries), classify-text (space categorization)
    ('confluence-mcp', 'summarize-documents', 7.5),
    ('confluence-mcp', 'classify-text', 6.5),

    -- Notion: add classify-text (database categorization)
    ('notion-mcp-server', 'classify-text', 7.0),
    ('notion-mcp-server', 'generate-reports', 7.0),

    -- Atlassian: add classify-text (ticket triage classification), generate-reports
    ('atlassian-mcp', 'classify-text', 8.0),
    ('atlassian-mcp', 'generate-reports', 7.0),

    -- Zendesk: add generate-reports (support reports), send-emails (ticket replies)
    ('zendesk-mcp', 'generate-reports', 7.5),
    ('zendesk-mcp', 'send-emails', 7.0),

    -- Intercom: add send-emails (messaging), generate-reports
    ('intercom-mcp', 'send-emails', 7.5),
    ('intercom-mcp', 'generate-reports', 7.0),

    -- HubSpot: add generate-reports (pipeline reports), send-emails (outreach)
    ('hubspot-mcp', 'generate-reports', 8.0),
    ('hubspot-mcp', 'send-emails', 7.5),

    -- Apollo: add search-web (prospect research), send-emails (sequences)
    ('apollo-mcp', 'search-web', 7.0),
    ('apollo-mcp', 'send-emails', 8.0),

    -- Salesforce: add enrich-leads, classify-text (lead scoring)
    ('salesforce-mcp', 'enrich-leads', 8.0),
    ('salesforce-mcp', 'classify-text', 7.0),

    -- Google Ads: add manage-content (ad copy), classify-text (audience segmentation)
    ('google-ads-mcp', 'manage-content', 7.0),
    ('google-ads-mcp', 'classify-text', 7.0),

    -- Mailchimp: add generate-reports (campaign reports), manage-content (templates)
    ('mailchimp-mcp', 'generate-reports', 8.0),
    ('mailchimp-mcp', 'manage-content', 7.5),

    -- SEMrush: add enrich-leads (company research), classify-text (keyword categories)
    ('semrush-mcp', 'enrich-leads', 7.0),
    ('semrush-mcp', 'classify-text', 7.0),

    -- Stripe: add generate-reports (revenue reports), manage-crm (customer management)
    ('stripe-mcp', 'generate-reports', 8.5),
    ('stripe-mcp', 'manage-crm', 7.0),

    -- QuickBooks: add classify-text (expense categorization)
    ('quickbooks-mcp', 'classify-text', 7.0),

    -- Plaid: add generate-reports (financial reports)
    ('plaid-mcp', 'generate-reports', 8.0),

    -- DocuSign: add send-emails (signature requests), classify-text (doc classification)
    ('docusign-mcp', 'send-emails', 7.0),
    ('docusign-mcp', 'classify-text', 7.0),

    -- LegalForce: add classify-text (clause classification), summarize-documents
    ('legalforce-mcp', 'classify-text', 8.0),
    ('legalforce-mcp', 'summarize-documents', 7.5),

    -- CourtListener: add summarize-documents (case summaries), classify-text
    ('courtlistener-mcp', 'summarize-documents', 7.5),
    ('courtlistener-mcp', 'classify-text', 7.0),

    -- Greenhouse: add enrich-leads (candidate enrichment), classify-text (resume screening)
    ('greenhouse-mcp', 'enrich-leads', 7.0),
    ('greenhouse-mcp', 'classify-text', 7.0),

    -- Lever: add enrich-leads, classify-text
    ('lever-mcp', 'enrich-leads', 7.0),
    ('lever-mcp', 'classify-text', 7.0),

    -- BambooHR: add classify-text (employee categorization)
    ('bamboohr-mcp', 'classify-text', 6.5),

    -- Shopify: add generate-reports (sales reports), manage-content (product pages)
    ('shopify-mcp', 'generate-reports', 8.5),
    ('shopify-mcp', 'manage-content', 7.0),

    -- WooCommerce: add generate-reports (sales/order reports)
    ('woocommerce-mcp', 'generate-reports', 7.5),

    -- Amazon Seller: add generate-reports (seller reports)
    ('amazon-seller-mcp', 'generate-reports', 8.0),

    -- Snyk: add generate-reports (vulnerability reports), monitor-errors (security alerts)
    ('snyk-mcp', 'generate-reports', 8.5),
    ('snyk-mcp', 'monitor-errors', 7.5),

    -- SonarQube: add generate-reports (quality reports), monitor-errors (quality gate)
    ('sonarqube-mcp', 'generate-reports', 8.5),
    ('sonarqube-mcp', 'monitor-errors', 7.0),

    -- Trivy: add generate-reports (scan reports), monitor-errors (CVE alerts)
    ('trivy-mcp', 'generate-reports', 8.0),
    ('trivy-mcp', 'monitor-errors', 7.5),

    -- Google Calendar: add generate-reports (availability reports), send-emails (invites)
    ('google-calendar-mcp', 'send-emails', 7.0),
    ('google-calendar-mcp', 'generate-reports', 6.5),

    -- Slack: add classify-text (message triage), manage-tickets (via threads)
    ('slack-mcp', 'classify-text', 7.0),
    ('slack-mcp', 'manage-tickets', 6.5),

    -- Gmail: add generate-reports (email analytics), summarize-documents (email threads)
    ('gmail-mcp', 'generate-reports', 6.5),
    ('gmail-mcp', 'summarize-documents', 7.0)
) AS vals(skill_slug, task_slug, rel)
JOIN skills s ON s.slug = vals.skill_slug
JOIN tasks tsk ON tsk.slug = vals.task_slug
ON CONFLICT DO NOTHING;


-- ─────────────────────────────────────────────
-- Add detect-sentiment mappings (currently only via classify-text overlap)
-- These tools can do sentiment detection as part of their text analysis
-- ─────────────────────────────────────────────

INSERT INTO skill_tasks (skill_id, task_id, relevance_score)
SELECT s.id, tsk.id, rel FROM (
  VALUES
    ('perplexity-mcp'::text, 'detect-sentiment'::text, 7.0),
    ('tavily-mcp', 'detect-sentiment', 6.5),
    ('zendesk-mcp', 'detect-sentiment', 7.5),
    ('intercom-mcp', 'detect-sentiment', 7.0),
    ('hubspot-mcp', 'detect-sentiment', 7.0),
    ('slack-mcp', 'detect-sentiment', 6.5),
    ('gmail-mcp', 'detect-sentiment', 6.5)
) AS vals(skill_slug, task_slug, rel)
JOIN skills s ON s.slug = vals.skill_slug
JOIN tasks tsk ON tsk.slug = vals.task_slug
ON CONFLICT DO NOTHING;


-- ─────────────────────────────────────────────
-- PART 3: FILL TOOL TYPE COVERAGE GAPS
-- Map skills to additional tool_type categories beyond 'mcp-servers'
-- ─────────────────────────────────────────────

-- Search tools → also 'search-engines'
INSERT INTO skill_tool_types (skill_id, tool_type_id)
SELECT s.id, tt.id FROM (
  VALUES
    ('exa-mcp-server'::text),
    ('brave-search-mcp'),
    ('tavily-mcp'),
    ('perplexity-mcp'),
    ('semrush-mcp'),
    ('firecrawl-mcp')
) AS vals(skill_slug)
JOIN skills s ON s.slug = vals.skill_slug
CROSS JOIN tool_types tt
WHERE tt.slug = 'search-engines'
ON CONFLICT DO NOTHING;

-- Security tools → also 'security-tools'
INSERT INTO skill_tool_types (skill_id, tool_type_id)
SELECT s.id, tt.id FROM (
  VALUES
    ('snyk-mcp'::text),
    ('sonarqube-mcp'),
    ('trivy-mcp')
) AS vals(skill_slug)
JOIN skills s ON s.slug = vals.skill_slug
CROSS JOIN tool_types tt
WHERE tt.slug = 'security-tools'
ON CONFLICT DO NOTHING;

-- Data tools → also 'data-pipelines'
INSERT INTO skill_tool_types (skill_id, tool_type_id)
SELECT s.id, tt.id FROM (
  VALUES
    ('genai-toolbox'::text),
    ('supabase-mcp'),
    ('neon-mcp'),
    ('plaid-mcp'),
    ('quickbooks-mcp')
) AS vals(skill_slug)
JOIN skills s ON s.slug = vals.skill_slug
CROSS JOIN tool_types tt
WHERE tt.slug = 'data-pipelines'
ON CONFLICT DO NOTHING;

-- Automation tools → also 'automation-platforms'
INSERT INTO skill_tool_types (skill_id, tool_type_id)
SELECT s.id, tt.id FROM (
  VALUES
    ('slack-mcp'::text),
    ('gmail-mcp'),
    ('google-calendar-mcp'),
    ('shopify-mcp'),
    ('hubspot-mcp'),
    ('salesforce-mcp')
) AS vals(skill_slug)
JOIN skills s ON s.slug = vals.skill_slug
CROSS JOIN tool_types tt
WHERE tt.slug = 'automation-platforms'
ON CONFLICT DO NOTHING;

-- Code analysis tools → also 'code-generation'
INSERT INTO skill_tool_types (skill_id, tool_type_id)
SELECT s.id, tt.id FROM (
  VALUES
    ('context7'::text),
    ('github-mcp-server'),
    ('gitlab-mcp'),
    ('sonarqube-mcp')
) AS vals(skill_slug)
JOIN skills s ON s.slug = vals.skill_slug
CROSS JOIN tool_types tt
WHERE tt.slug = 'code-generation'
ON CONFLICT DO NOTHING;

-- Observability tools
INSERT INTO skill_tool_types (skill_id, tool_type_id)
SELECT s.id, tt.id FROM (
  VALUES
    ('sentry-mcp'::text),
    ('cloudflare-mcp'),
    ('aws-mcp')
) AS vals(skill_slug)
JOIN skills s ON s.slug = vals.skill_slug
CROSS JOIN tool_types tt
WHERE tt.slug = 'observability'
ON CONFLICT DO NOTHING;

-- RAG tools (knowledge retrieval)
INSERT INTO skill_tool_types (skill_id, tool_type_id)
SELECT s.id, tt.id FROM (
  VALUES
    ('context7'::text),
    ('obsidian-mcp'),
    ('notion-mcp-server'),
    ('confluence-mcp')
) AS vals(skill_slug)
JOIN skills s ON s.slug = vals.skill_slug
CROSS JOIN tool_types tt
WHERE tt.slug = 'rag-tools'
ON CONFLICT DO NOTHING;

-- Design tools → also under figma/storybook/tailwind
INSERT INTO skill_tool_types (skill_id, tool_type_id)
SELECT s.id, tt.id FROM (
  VALUES
    ('figma-context-mcp'::text),
    ('storybook-mcp'),
    ('tailwindcss-mcp')
) AS vals(skill_slug)
JOIN skills s ON s.slug = vals.skill_slug
CROSS JOIN tool_types tt
WHERE tt.slug = 'code-generation'
ON CONFLICT DO NOTHING;

-- Browser automation tools → also 'agent-frameworks'
INSERT INTO skill_tool_types (skill_id, tool_type_id)
SELECT s.id, tt.id FROM (
  VALUES
    ('playwright-mcp'::text),
    ('browserbase-mcp'),
    ('puppeteer-mcp')
) AS vals(skill_slug)
JOIN skills s ON s.slug = vals.skill_slug
CROSS JOIN tool_types tt
WHERE tt.slug = 'agent-frameworks'
ON CONFLICT DO NOTHING;


-- ─────────────────────────────────────────────
-- DONE — Migration 009
-- Part 1: ~200 outcome records across 20 skills with realistic data
-- Part 2: ~90 additional task mappings filling coverage gaps
-- Part 3: ~40 additional tool_type mappings across 9 categories
-- ─────────────────────────────────────────────
