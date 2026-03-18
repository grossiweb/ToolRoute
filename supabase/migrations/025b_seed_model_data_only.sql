-- Migration 025b: Model routing decisions + outcome records + agent stats
-- Run this if 025 failed partway (Part 1 challenge submissions succeeded, Part 2 failed)

-- ════════════════════════════════════════════════════════════════
-- PART 2: Model Routing Decisions (seed 15 routing decisions)
-- ════════════════════════════════════════════════════════════════

INSERT INTO model_routing_decisions (
  task_hash, task_snippet, signals_json, resolved_tier,
  recommended_model_id, recommended_alias, fallback_chain,
  confidence, latency_ms, agent_identity_id
)
SELECT
  md5(task_snippet),
  task_snippet,
  signals::jsonb,
  tier,
  (SELECT id FROM model_registry WHERE slug = model_slug LIMIT 1),
  'toolroute/' || tier,
  '[]'::jsonb,
  confidence,
  latency,
  agent_id
FROM (VALUES
  ('write a python function to parse CSV', '{"tools_needed":false,"structured_output_needed":true,"code_present":true,"complex_reasoning":false}', 'fast_code', 'claude-3-5-sonnet', 0.80, 18, 'b0000000-0000-0000-0000-000000000003'::uuid),
  ('analyze quarterly revenue trends and forecast', '{"tools_needed":false,"structured_output_needed":false,"code_present":false,"complex_reasoning":true}', 'reasoning_pro', 'claude-3-5-sonnet', 0.70, 22, 'b0000000-0000-0000-0000-000000000001'::uuid),
  ('format API response as JSON schema', '{"tools_needed":false,"structured_output_needed":true,"code_present":false,"complex_reasoning":false}', 'cheap_structured', 'gpt-4o-mini', 0.70, 15, 'b0000000-0000-0000-0000-000000000007'::uuid),
  ('call the Stripe API and process webhooks', '{"tools_needed":true,"structured_output_needed":true,"code_present":true,"complex_reasoning":false}', 'tool_agent', 'claude-3-5-sonnet', 0.85, 25, 'b0000000-0000-0000-0000-000000000003'::uuid),
  ('summarize this meeting transcript', '{"tools_needed":false,"structured_output_needed":false,"code_present":false,"complex_reasoning":false}', 'cheap_chat', 'gpt-4o-mini', 0.55, 12, 'b0000000-0000-0000-0000-000000000005'::uuid),
  ('design a microservices architecture for an e-commerce platform', '{"tools_needed":true,"structured_output_needed":false,"code_present":true,"complex_reasoning":true}', 'best_available', 'claude-opus-4', 0.92, 30, 'b0000000-0000-0000-0000-000000000001'::uuid),
  ('extract entities from legal contract', '{"tools_needed":false,"structured_output_needed":true,"code_present":false,"complex_reasoning":true}', 'reasoning_pro', 'gpt-4o', 0.75, 20, 'e0416284-a3f3-42c9-8765-2f44db84e86e'::uuid),
  ('debug this React component rendering issue', '{"tools_needed":false,"structured_output_needed":false,"code_present":true,"complex_reasoning":false}', 'fast_code', 'deepseek-v3', 0.72, 19, 'b0000000-0000-0000-0000-000000000007'::uuid),
  ('translate product descriptions to Spanish', '{"tools_needed":false,"structured_output_needed":false,"code_present":false,"complex_reasoning":false}', 'cheap_chat', 'gemini-2-0-flash-lite', 0.55, 14, 'b0000000-0000-0000-0000-000000000008'::uuid),
  ('generate SQL queries for analytics dashboard', '{"tools_needed":false,"structured_output_needed":true,"code_present":true,"complex_reasoning":false}', 'fast_code', 'codestral', 0.78, 17, 'b0000000-0000-0000-0000-000000000002'::uuid),
  ('orchestrate a multi-tool research workflow', '{"tools_needed":true,"structured_output_needed":false,"code_present":false,"complex_reasoning":true}', 'best_available', 'gpt-4-5-preview', 0.90, 28, 'b0000000-0000-0000-0000-000000000003'::uuid),
  ('classify customer support tickets by priority', '{"tools_needed":false,"structured_output_needed":true,"code_present":false,"complex_reasoning":false}', 'cheap_structured', 'gemini-2-0-flash', 0.68, 16, 'b0000000-0000-0000-0000-000000000005'::uuid),
  ('implement a Redis caching layer in Node.js', '{"tools_needed":false,"structured_output_needed":false,"code_present":true,"complex_reasoning":false}', 'fast_code', 'claude-3-5-sonnet', 0.80, 21, 'b0000000-0000-0000-0000-000000000007'::uuid),
  ('plan a data migration strategy from MongoDB to Postgres', '{"tools_needed":false,"structured_output_needed":false,"code_present":false,"complex_reasoning":true}', 'reasoning_pro', 'deepseek-r1', 0.73, 23, 'b0000000-0000-0000-0000-000000000002'::uuid),
  ('write unit tests for authentication middleware', '{"tools_needed":false,"structured_output_needed":false,"code_present":true,"complex_reasoning":false}', 'fast_code', 'gpt-4o', 0.76, 19, 'b0000000-0000-0000-0000-000000000001'::uuid)
) AS t(task_snippet, signals, tier, model_slug, confidence, latency, agent_id);


-- ════════════════════════════════════════════════════════════════
-- PART 3: Model Outcome Records (12 telemetry reports)
-- ════════════════════════════════════════════════════════════════

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
  ('gemini-2-0-flash', 'success', 350, 900, 400, 0.00025, 7.2, true, NULL, false, false, 'b0000000-0000-0000-0000-000000000005'::uuid),
  ('codestral', 'success', 1400, 1800, 1100, 0.0028, 8.3, true, NULL, false, false, 'b0000000-0000-0000-0000-000000000002'::uuid),
  ('claude-opus-4', 'success', 4500, 6000, 3200, 0.33, 9.5, true, true, false, false, 'b0000000-0000-0000-0000-000000000001'::uuid),
  ('deepseek-r1', 'success', 3800, 3500, 2800, 0.011, 8.1, false, NULL, false, false, 'b0000000-0000-0000-0000-000000000002'::uuid),
  ('gemini-2-0-flash-lite', 'success', 280, 600, 200, 0.0001, 6.5, false, NULL, false, false, 'b0000000-0000-0000-0000-000000000008'::uuid)
) AS t(model_slug, outcome, latency, input_tok, output_tok, cost, quality, structured, tools_ok, halluc, fallback, agent_id);


-- ════════════════════════════════════════════════════════════════
-- PART 4: Update agent stats to reflect new activity
-- ════════════════════════════════════════════════════════════════

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
