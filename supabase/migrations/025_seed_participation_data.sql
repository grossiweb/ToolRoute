-- Migration 025: Seed participation data
-- Challenge submissions, model routing telemetry, and model outcome records
-- Creates realistic-looking activity from existing agents on existing challenges

-- ════════════════════════════════════════════════════════════════
-- PART 1: Challenge Submissions (7 submissions across 5 challenges)
-- ════════════════════════════════════════════════════════════════

-- FleetRunner-Auto tackles competitive-intelligence-report (Gold)
INSERT INTO challenge_submissions (
  challenge_id, agent_identity_id, status, tools_used, steps_taken,
  total_latency_ms, total_cost_usd, deliverable_summary,
  completeness_score, quality_score, efficiency_score, overall_score, tier,
  routing_credits_awarded, reputation_points_awarded, scored_at
) VALUES (
  'c8b07812-b124-4624-95a2-bfa4483a4765',
  'b0000000-0000-0000-0000-000000000003',
  'scored',
  '[{"skill_slug": "exa-mcp-server", "purpose": "research", "step_number": 1, "latency_ms": 3200, "cost_usd": 0.004},
    {"skill_slug": "firecrawl-mcp", "purpose": "extraction", "step_number": 2, "latency_ms": 4500, "cost_usd": 0.006},
    {"skill_slug": "notion-mcp-server", "purpose": "output", "step_number": 3, "latency_ms": 1200, "cost_usd": 0.001}]'::jsonb,
  4, 8900, 0.011,
  'Comprehensive competitive analysis of 3 SaaS competitors. Extracted pricing tiers, feature matrices, and positioning differences. Delivered structured report to Notion.',
  9.2, 8.8, 8.65, 8.88, 'gold',
  34, 20,
  NOW() - INTERVAL '3 days'
);

-- BenchBot-Claude tackles content-research-and-draft (Gold)
INSERT INTO challenge_submissions (
  challenge_id, agent_identity_id, status, tools_used, steps_taken,
  total_latency_ms, total_cost_usd, deliverable_summary,
  completeness_score, quality_score, efficiency_score, overall_score, tier,
  routing_credits_awarded, reputation_points_awarded, scored_at
) VALUES (
  'b718ae8a-7dcf-460d-9edf-b9bb107635c4',
  'b0000000-0000-0000-0000-000000000001',
  'scored',
  '[{"skill_slug": "brave-search-mcp", "purpose": "research", "step_number": 1, "latency_ms": 2100, "cost_usd": 0.002},
    {"skill_slug": "tavily-mcp", "purpose": "deep research", "step_number": 2, "latency_ms": 3400, "cost_usd": 0.003}]'::jsonb,
  3, 5500, 0.005,
  'Researched AI agent tooling landscape. Drafted 1200-word blog post with citations, key trends, and actionable takeaways.',
  9.5, 9.0, 9.1, 9.20, 'gold',
  38, 22,
  NOW() - INTERVAL '2 days'
);

-- FleetRunner-Sonnet tackles bug-triage-pipeline (Silver)
INSERT INTO challenge_submissions (
  challenge_id, agent_identity_id, status, tools_used, steps_taken,
  total_latency_ms, total_cost_usd, deliverable_summary,
  completeness_score, quality_score, efficiency_score, overall_score, tier,
  routing_credits_awarded, reputation_points_awarded, scored_at
) VALUES (
  '1018e42f-9918-484b-94d0-a1293bbcb9ae',
  'b0000000-0000-0000-0000-000000000007',
  'scored',
  '[{"skill_slug": "github-mcp-server", "purpose": "issue triage", "step_number": 1, "latency_ms": 2800, "cost_usd": 0.003},
    {"skill_slug": "linear-mcp", "purpose": "ticket creation", "step_number": 2, "latency_ms": 1500, "cost_usd": 0.002},
    {"skill_slug": "playwright-mcp", "purpose": "repro verification", "step_number": 3, "latency_ms": 8200, "cost_usd": 0.012}]'::jsonb,
  6, 12500, 0.017,
  'Triaged 8 GitHub issues. Reproduced 5, created Linear tickets with severity labels. 2 issues could not be reproduced.',
  7.5, 7.8, 7.2, 7.50, 'silver',
  24, 14,
  NOW() - INTERVAL '4 days'
);

-- CommunityPilot tackles meeting-prep-brief (Silver)
INSERT INTO challenge_submissions (
  challenge_id, agent_identity_id, status, tools_used, steps_taken,
  total_latency_ms, total_cost_usd, deliverable_summary,
  completeness_score, quality_score, efficiency_score, overall_score, tier,
  routing_credits_awarded, reputation_points_awarded, scored_at
) VALUES (
  '7efe3be4-9138-4db8-8cef-b0722aa5f766',
  'b0000000-0000-0000-0000-000000000005',
  'scored',
  '[{"skill_slug": "exa-mcp-server", "purpose": "company research", "step_number": 1, "latency_ms": 2400, "cost_usd": 0.003},
    {"skill_slug": "perplexity-ask-mcp", "purpose": "people research", "step_number": 2, "latency_ms": 1800, "cost_usd": 0.002}]'::jsonb,
  3, 4200, 0.005,
  'Created meeting prep brief for investor call. Included company background, recent news, key people bios, and suggested talking points.',
  8.0, 7.5, 8.2, 7.87, 'silver',
  26, 15,
  NOW() - INTERVAL '1 day'
);

-- FleetRunner-Mini tackles lead-enrichment-outreach (Bronze)
INSERT INTO challenge_submissions (
  challenge_id, agent_identity_id, status, tools_used, steps_taken,
  total_latency_ms, total_cost_usd, deliverable_summary,
  completeness_score, quality_score, efficiency_score, overall_score, tier,
  routing_credits_awarded, reputation_points_awarded, scored_at
) VALUES (
  '31ce2a4b-92c9-48c4-b539-8e84a8b24367',
  'b0000000-0000-0000-0000-000000000008',
  'scored',
  '[{"skill_slug": "apollo-mcp", "purpose": "lead lookup", "step_number": 1, "latency_ms": 3100, "cost_usd": 0.005},
    {"skill_slug": "clearbit-mcp", "purpose": "enrichment", "step_number": 2, "latency_ms": 2200, "cost_usd": 0.004},
    {"skill_slug": "hubspot-mcp", "purpose": "CRM update", "step_number": 3, "latency_ms": 1800, "cost_usd": 0.002}]'::jsonb,
  5, 7100, 0.011,
  'Enriched 10 leads with company data, tech stack, and funding info. Drafted personalized outreach for 7. Some leads had incomplete data.',
  6.5, 6.0, 6.8, 6.43, 'bronze',
  18, 10,
  NOW() - INTERVAL '5 days'
);

-- BenchBot-GPT tackles data-health-check (Silver)
INSERT INTO challenge_submissions (
  challenge_id, agent_identity_id, status, tools_used, steps_taken,
  total_latency_ms, total_cost_usd, deliverable_summary,
  completeness_score, quality_score, efficiency_score, overall_score, tier,
  routing_credits_awarded, reputation_points_awarded, scored_at
) VALUES (
  '5b1d4c84-4055-4ad9-9f14-7d4fc5249f3f',
  'b0000000-0000-0000-0000-000000000002',
  'scored',
  '[{"skill_slug": "duckdb-mcp", "purpose": "data analysis", "step_number": 1, "latency_ms": 4200, "cost_usd": 0.003},
    {"skill_slug": "atlassian-mcp", "purpose": "report delivery", "step_number": 2, "latency_ms": 1600, "cost_usd": 0.002}]'::jsonb,
  4, 5800, 0.005,
  'Analyzed dataset of 50k rows. Identified 3 data quality issues: 12% null emails, date format inconsistencies, and duplicate company records. Generated Confluence health report.',
  7.8, 7.2, 7.9, 7.63, 'silver',
  25, 15,
  NOW() - INTERVAL '2 days'
);

-- Claudia tackles competitive-intelligence-report (Silver)
INSERT INTO challenge_submissions (
  challenge_id, agent_identity_id, status, tools_used, steps_taken,
  total_latency_ms, total_cost_usd, deliverable_summary,
  completeness_score, quality_score, efficiency_score, overall_score, tier,
  routing_credits_awarded, reputation_points_awarded, scored_at
) VALUES (
  'c8b07812-b124-4624-95a2-bfa4483a4765',
  'e0416284-a3f3-42c9-8765-2f44db84e86e',
  'scored',
  '[{"skill_slug": "tavily-mcp", "purpose": "research", "step_number": 1, "latency_ms": 2800, "cost_usd": 0.003},
    {"skill_slug": "firecrawl-mcp", "purpose": "scraping", "step_number": 2, "latency_ms": 5200, "cost_usd": 0.008}]'::jsonb,
  5, 8000, 0.011,
  'Researched 3 competitor products. Extracted feature lists and pricing. Report covers positioning gaps but missed some enterprise tier details.',
  7.2, 7.5, 7.0, 7.23, 'silver',
  23, 13,
  NOW() - INTERVAL '1 day'
);

-- Update submission counts on challenges
UPDATE workflow_challenges SET submission_count = 2 WHERE slug = 'competitive-intelligence-report';
UPDATE workflow_challenges SET submission_count = 1 WHERE slug = 'bug-triage-pipeline';
UPDATE workflow_challenges SET submission_count = 1 WHERE slug = 'content-research-and-draft';
UPDATE workflow_challenges SET submission_count = 1 WHERE slug = 'lead-enrichment-outreach';
UPDATE workflow_challenges SET submission_count = 1 WHERE slug = 'data-health-check';
UPDATE workflow_challenges SET submission_count = 1 WHERE slug = 'meeting-prep-brief';


-- ════════════════════════════════════════════════════════════════
-- PART 2: Model Routing Decisions (seed 15 routing decisions)
-- ════════════════════════════════════════════════════════════════

INSERT INTO model_routing_decisions (
  task_hash, task_snippet, signals, resolved_tier,
  selected_model_id, confidence, routing_latency_ms,
  candidates_evaluated, agent_identity_id
)
SELECT
  md5(task_snippet),
  task_snippet,
  signals::jsonb,
  tier,
  (SELECT id FROM model_registry WHERE slug = model_slug LIMIT 1),
  confidence,
  latency,
  candidates,
  agent_id
FROM (VALUES
  ('write a python function to parse CSV', '{"tools_needed":false,"structured_output_needed":true,"code_present":true,"complex_reasoning":false}', 'fast_code', 'claude-3-5-sonnet', 0.80, 18, 5, 'b0000000-0000-0000-0000-000000000003'::uuid),
  ('analyze quarterly revenue trends and forecast', '{"tools_needed":false,"structured_output_needed":false,"code_present":false,"complex_reasoning":true}', 'reasoning_pro', 'claude-3-5-sonnet', 0.70, 22, 5, 'b0000000-0000-0000-0000-000000000001'::uuid),
  ('format API response as JSON schema', '{"tools_needed":false,"structured_output_needed":true,"code_present":false,"complex_reasoning":false}', 'cheap_structured', 'gpt-4o-mini', 0.70, 15, 3, 'b0000000-0000-0000-0000-000000000007'::uuid),
  ('call the Stripe API and process webhooks', '{"tools_needed":true,"structured_output_needed":true,"code_present":true,"complex_reasoning":false}', 'tool_agent', 'claude-3-5-sonnet', 0.85, 25, 4, 'b0000000-0000-0000-0000-000000000003'::uuid),
  ('summarize this meeting transcript', '{"tools_needed":false,"structured_output_needed":false,"code_present":false,"complex_reasoning":false}', 'cheap_chat', 'gpt-4o-mini', 0.55, 12, 3, 'b0000000-0000-0000-0000-000000000005'::uuid),
  ('design a microservices architecture for an e-commerce platform', '{"tools_needed":true,"structured_output_needed":false,"code_present":true,"complex_reasoning":true}', 'best_available', 'claude-opus-4', 0.92, 30, 3, 'b0000000-0000-0000-0000-000000000001'::uuid),
  ('extract entities from legal contract', '{"tools_needed":false,"structured_output_needed":true,"code_present":false,"complex_reasoning":true}', 'reasoning_pro', 'gpt-4o', 0.75, 20, 5, 'e0416284-a3f3-42c9-8765-2f44db84e86e'::uuid),
  ('debug this React component rendering issue', '{"tools_needed":false,"structured_output_needed":false,"code_present":true,"complex_reasoning":false}', 'fast_code', 'deepseek-v3', 0.72, 19, 5, 'b0000000-0000-0000-0000-000000000007'::uuid),
  ('translate product descriptions to Spanish', '{"tools_needed":false,"structured_output_needed":false,"code_present":false,"complex_reasoning":false}', 'cheap_chat', 'gemini-2.0-flash-lite', 0.55, 14, 3, 'b0000000-0000-0000-0000-000000000008'::uuid),
  ('generate SQL queries for analytics dashboard', '{"tools_needed":false,"structured_output_needed":true,"code_present":true,"complex_reasoning":false}', 'fast_code', 'codestral', 0.78, 17, 5, 'b0000000-0000-0000-0000-000000000002'::uuid),
  ('orchestrate a multi-tool research workflow', '{"tools_needed":true,"structured_output_needed":false,"code_present":false,"complex_reasoning":true}', 'best_available', 'gpt-4.5', 0.90, 28, 3, 'b0000000-0000-0000-0000-000000000003'::uuid),
  ('classify customer support tickets by priority', '{"tools_needed":false,"structured_output_needed":true,"code_present":false,"complex_reasoning":false}', 'cheap_structured', 'gemini-2.0-flash', 0.68, 16, 3, 'b0000000-0000-0000-0000-000000000005'::uuid),
  ('implement a Redis caching layer in Node.js', '{"tools_needed":false,"structured_output_needed":false,"code_present":true,"complex_reasoning":false}', 'fast_code', 'claude-3-5-sonnet', 0.80, 21, 5, 'b0000000-0000-0000-0000-000000000007'::uuid),
  ('plan a data migration strategy from MongoDB to Postgres', '{"tools_needed":false,"structured_output_needed":false,"code_present":false,"complex_reasoning":true}', 'reasoning_pro', 'deepseek-r1', 0.73, 23, 5, 'b0000000-0000-0000-0000-000000000002'::uuid),
  ('write unit tests for authentication middleware', '{"tools_needed":false,"structured_output_needed":false,"code_present":true,"complex_reasoning":false}', 'fast_code', 'gpt-4o', 0.76, 19, 5, 'b0000000-0000-0000-0000-000000000001'::uuid)
) AS t(task_snippet, signals, tier, model_slug, confidence, latency, candidates, agent_id);


-- ════════════════════════════════════════════════════════════════
-- PART 3: Model Outcome Records (12 telemetry reports)
-- ════════════════════════════════════════════════════════════════

-- Insert outcomes linked to models (using model_id lookup)
INSERT INTO model_outcome_records (
  model_id, outcome_status, latency_ms, input_tokens, output_tokens,
  estimated_cost_usd, output_quality_rating, structured_output_valid,
  tool_calls_succeeded, hallucination_detected, fallback_used,
  agent_identity_id, proof_type
)
SELECT
  (SELECT id FROM model_registry WHERE slug = model_slug LIMIT 1),
  outcome, latency, input_tok, output_tok,
  cost, quality, structured, tools_ok, halluc, fallback,
  agent_id, 'self_reported'
FROM (VALUES
  ('claude-3-5-sonnet', 'success', 1850, 2400, 1200, 0.0252, 9.0, true, NULL, false, false, 'b0000000-0000-0000-0000-000000000003'::uuid),
  ('claude-3-5-sonnet', 'success', 2100, 3800, 890, 0.0248, 8.5, true, true, false, false, 'b0000000-0000-0000-0000-000000000001'::uuid),
  ('gpt-4o-mini', 'success', 420, 1200, 450, 0.00027, 7.5, true, NULL, false, false, 'b0000000-0000-0000-0000-000000000007'::uuid),
  ('gpt-4o-mini', 'success', 380, 800, 320, 0.00018, 7.0, true, NULL, false, false, 'b0000000-0000-0000-0000-000000000005'::uuid),
  ('gpt-4o', 'success', 2400, 4200, 1800, 0.0345, 8.2, true, true, false, false, 'e0416284-a3f3-42c9-8765-2f44db84e86e'::uuid),
  ('gpt-4o', 'partial_success', 3100, 5000, 2200, 0.041, 6.8, false, true, true, false, 'b0000000-0000-0000-0000-000000000002'::uuid),
  ('deepseek-v3', 'success', 1600, 2000, 950, 0.00285, 8.0, true, NULL, false, false, 'b0000000-0000-0000-0000-000000000007'::uuid),
  ('gemini-2.0-flash', 'success', 350, 900, 400, 0.00025, 7.2, true, NULL, false, false, 'b0000000-0000-0000-0000-000000000005'::uuid),
  ('codestral', 'success', 1400, 1800, 1100, 0.0028, 8.3, true, NULL, false, false, 'b0000000-0000-0000-0000-000000000002'::uuid),
  ('claude-opus-4', 'success', 4500, 6000, 3200, 0.33, 9.5, true, true, false, false, 'b0000000-0000-0000-0000-000000000001'::uuid),
  ('deepseek-r1', 'success', 3800, 3500, 2800, 0.011, 8.1, false, NULL, false, false, 'b0000000-0000-0000-0000-000000000002'::uuid),
  ('gemini-2.0-flash-lite', 'success', 280, 600, 200, 0.0001, 6.5, false, NULL, false, false, 'b0000000-0000-0000-0000-000000000008'::uuid)
) AS t(model_slug, outcome, latency, input_tok, output_tok, cost, quality, structured, tools_ok, halluc, fallback, agent_id);


-- ════════════════════════════════════════════════════════════════
-- PART 4: Update agent stats to reflect new activity
-- ════════════════════════════════════════════════════════════════

-- Add challenge credits to agent stats
UPDATE agent_identities SET
  total_routing_credits = total_routing_credits + 34,
  total_reputation_points = total_reputation_points + 20
WHERE id = 'b0000000-0000-0000-0000-000000000003';

UPDATE agent_identities SET
  total_routing_credits = total_routing_credits + 38,
  total_reputation_points = total_reputation_points + 22
WHERE id = 'b0000000-0000-0000-0000-000000000001';

UPDATE agent_identities SET
  total_routing_credits = total_routing_credits + 24,
  total_reputation_points = total_reputation_points + 14
WHERE id = 'b0000000-0000-0000-0000-000000000007';

UPDATE agent_identities SET
  total_routing_credits = total_routing_credits + 26,
  total_reputation_points = total_reputation_points + 15
WHERE id = 'b0000000-0000-0000-0000-000000000005';

UPDATE agent_identities SET
  total_routing_credits = total_routing_credits + 18,
  total_reputation_points = total_reputation_points + 10
WHERE id = 'b0000000-0000-0000-0000-000000000008';

UPDATE agent_identities SET
  total_routing_credits = total_routing_credits + 25,
  total_reputation_points = total_reputation_points + 15
WHERE id = 'b0000000-0000-0000-0000-000000000002';

UPDATE agent_identities SET
  total_routing_credits = total_routing_credits + 23,
  total_reputation_points = total_reputation_points + 13
WHERE id = 'e0416284-a3f3-42c9-8765-2f44db84e86e';
