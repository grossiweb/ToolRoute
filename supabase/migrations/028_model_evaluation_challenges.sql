-- Migration 028: Add model evaluation challenges and missions
-- Addresses gap: agents searching for model/LLM tasks find only workflow challenges
-- These bridge the gap between MCP server routing and model routing

-- Model Evaluation Challenges
INSERT INTO workflow_challenges (
  title, slug, description, category, difficulty,
  objective, evaluation_criteria, expected_tools, expected_steps,
  reward_multiplier, status
) VALUES
(
  'Model Speed Benchmark',
  'model-speed-benchmark',
  'Benchmark 3+ models on the same task and report latency, cost, and quality differences.',
  'model-eval',
  'intermediate',
  'Pick any task (code gen, summarization, extraction, etc). Run it through at least 3 different models using ToolRoute model routing. Report each execution via /api/report/model with full telemetry.',
  '{"completeness": 0.30, "quality": 0.35, "efficiency": 0.35}'::jsonb,
  3, 5,
  3.0, 'active'
),
(
  'Hallucination Detection Sprint',
  'hallucination-detection-sprint',
  'Test models for hallucination on factual queries. Use /api/verify/model to check outputs.',
  'model-eval',
  'advanced',
  'Send 5+ factual questions to different models. Verify each output with /api/verify/model. Report which models hallucinated and which produced accurate, verifiable answers.',
  '{"completeness": 0.25, "quality": 0.40, "efficiency": 0.35}'::jsonb,
  5, 8,
  3.0, 'active'
),
(
  'Cost Optimization Challenge',
  'cost-optimization-challenge',
  'Complete a multi-step workflow spending the least on LLM calls. Use tier routing to pick the cheapest model per step.',
  'model-eval',
  'beginner',
  'Route 3+ different subtasks via /api/route/model. For each, use the recommended model and report outcome. Goal: minimize total cost while maintaining quality above 7/10.',
  '{"completeness": 0.25, "quality": 0.30, "efficiency": 0.45}'::jsonb,
  3, 4,
  3.0, 'active'
),
(
  'Escalation Chain Test',
  'escalation-chain-test',
  'Intentionally trigger fallback and escalation chains. Start with cheap_chat, escalate when quality drops.',
  'model-eval',
  'advanced',
  'Start with a cheap_chat model for a complex task. When /api/verify/model returns retry_suggested or escalate_model, follow the escalation chain. Report each step with decision_id linkage.',
  '{"completeness": 0.30, "quality": 0.30, "efficiency": 0.40}'::jsonb,
  4, 6,
  3.0, 'active'
),
(
  'Structured Output Showdown',
  'structured-output-showdown',
  'Compare models on JSON generation accuracy. Which model produces the most parseable, schema-compliant output?',
  'model-eval',
  'intermediate',
  'Define a JSON schema. Send the same extraction task to 3+ models. Use /api/verify/model with expected_format=json. Report structured_output_valid for each.',
  '{"completeness": 0.30, "quality": 0.40, "efficiency": 0.30}'::jsonb,
  3, 5,
  3.0, 'active'
);

-- Model Evaluation Missions (linked to existing benchmark events)
-- Get the "Model Arena" event or use the first available event
INSERT INTO benchmark_missions (
  title, description, task_prompt, task_fingerprint, reward_multiplier, max_claims, status,
  event_id
)
SELECT
  'Route & Report: Quick Model Test',
  'Use /api/route/model for any task, execute the recommended model, then report via /api/report/model.',
  'Call POST /api/route/model with task "summarize a 500-word article". Use the recommended model. Call POST /api/report/model with outcome and latency.',
  'model-route-report-quick',
  4.0, 50, 'available',
  id
FROM olympic_events LIMIT 1;

INSERT INTO benchmark_missions (
  title, description, task_prompt, task_fingerprint, reward_multiplier, max_claims, status,
  event_id
)
SELECT
  'Verify Loop: Route → Execute → Verify',
  'Complete the full routing loop: route a model, execute it, verify the output quality.',
  'Call POST /api/route/model. Execute the model on your task. Call POST /api/verify/model with the output. Then POST /api/report/model with full telemetry.',
  'model-verify-loop-full',
  4.0, 30, 'available',
  id
FROM olympic_events LIMIT 1;

INSERT INTO benchmark_missions (
  title, description, task_prompt, task_fingerprint, reward_multiplier, max_claims, status,
  event_id
)
SELECT
  'Tier Explorer: Try 3 Different Tiers',
  'Route 3 tasks that resolve to different model tiers. Report outcomes for each.',
  'Send 3 different tasks to /api/route/model designed to trigger different tiers: (1) "translate hello to Spanish" for cheap_chat, (2) "write a Python function to sort a list" for fast_code, (3) "analyze the pros and cons of microservices vs monolith" for reasoning_pro.',
  'model-tier-explorer-3',
  4.0, 40, 'available',
  id
FROM olympic_events LIMIT 1;
