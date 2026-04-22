-- Migration 043: Seed models table so classifier slug lookups succeed
--
-- Problem: route.ts reconciles the two model pipelines by matching
--   models.id === model_registry.slug
-- 5 of 7 tier primaries have no matching row in the models table,
-- so model_details is always null on the most common unconstrained paths.
--
-- Fix in two parts:
--   Part 1 — add claude-sonnet-4-6 to model_registry and update
--             model_aliases to replace deprecated claude-3-5-sonnet
--   Part 2 — insert the 7 classifier slugs into the models table

-- ================================================================
-- PART 1: Add claude-sonnet-4-6 to model_registry
-- claude-3-5-sonnet (Oct 2022) is deprecated. Replace it with the
-- current Anthropic Sonnet in all tier alias primaries.
-- ================================================================

INSERT INTO model_registry (
  slug, display_name, provider, provider_model_id,
  supports_tool_calling, supports_structured_output, supports_vision,
  context_window, max_output_tokens,
  input_cost_per_mtok, output_cost_per_mtok,
  avg_latency_ms, tokens_per_second,
  reasoning_strength, code_strength, status
) VALUES (
  'claude-sonnet-4-6',
  'Claude Sonnet 4.6',
  'anthropic',
  'claude-sonnet-4-6-20260301',
  true, true, true,
  200000, 32000,
  3.00, 15.00,
  500, 90,
  'high', 'very_high', 'active'
) ON CONFLICT (slug) DO UPDATE SET
  status = 'active',
  input_cost_per_mtok = EXCLUDED.input_cost_per_mtok,
  output_cost_per_mtok = EXCLUDED.output_cost_per_mtok;

-- ================================================================
-- PART 2: Update model_aliases — replace claude-3-5-sonnet with
-- claude-sonnet-4-6 everywhere it appears as primary or fallback.
-- ================================================================

-- tool_agent primary
UPDATE model_aliases
SET model_id = (SELECT id FROM model_registry WHERE slug = 'claude-sonnet-4-6')
WHERE tier = 'tool_agent'
  AND model_id = (SELECT id FROM model_registry WHERE slug = 'claude-3-5-sonnet' LIMIT 1);

-- creative_writing primary
UPDATE model_aliases
SET model_id = (SELECT id FROM model_registry WHERE slug = 'claude-sonnet-4-6')
WHERE tier = 'creative_writing'
  AND model_id = (SELECT id FROM model_registry WHERE slug = 'claude-3-5-sonnet' LIMIT 1);

-- reasoning_pro — update even if outcome-based ranking demoted it;
-- we want the slug correct if it ever becomes primary again
UPDATE model_aliases
SET model_id = (SELECT id FROM model_registry WHERE slug = 'claude-sonnet-4-6')
WHERE tier = 'reasoning_pro'
  AND model_id = (SELECT id FROM model_registry WHERE slug = 'claude-3-5-sonnet' LIMIT 1);

-- fast_code fallback (was priority 2 after 036 demotion)
UPDATE model_aliases
SET model_id = (SELECT id FROM model_registry WHERE slug = 'claude-sonnet-4-6')
WHERE tier = 'fast_code'
  AND model_id = (SELECT id FROM model_registry WHERE slug = 'claude-3-5-sonnet' LIMIT 1);

-- Verify claude-3-5-sonnet is now fully absent from active aliases:
-- SELECT count(*) FROM model_aliases WHERE active = true
--   AND model_id = (SELECT id FROM model_registry WHERE slug = 'claude-3-5-sonnet');
-- Expected: 0

-- ================================================================
-- PART 3: Seed the models table
-- One row per classifier slug. ON CONFLICT (id) updates pricing
-- and routing fields without overwriting editorial content.
-- ================================================================

-- 1. gemini-2-flash — primary for cheap_chat + cheap_structured
INSERT INTO models (
  id, provider, display_name, tier,
  input_price_per_m, output_price_per_m,
  context_window, max_output_tokens,
  supports_vision, supports_tool_use, supports_reasoning, supports_task_budgets,
  effort_levels, tokenizer_inflation_vs_baseline,
  data_residency, is_routable, deprecated_at,
  best_for, avoid_for, exclude_for_workloads,
  editorial_notes
) VALUES (
  'gemini-2-flash',
  'google',
  'Gemini 2.0 Flash',
  'cheap_chat',
  0.10, 0.40,
  1048576, 8192,
  true, true, false, false,
  '{}', 1.0,
  'global', true, NULL,
  ARRAY['translation', 'summarization', 'structured_output', 'cheap_chat'],
  ARRAY['long_form_reasoning', 'mission_critical'],
  '{}',
  ARRAY[
    'Fastest model in the budget tier — 2.5s median latency.',
    '$0.10/1M input tokens — best value for high-volume tasks.'
  ]
) ON CONFLICT (id) DO UPDATE SET
  input_price_per_m  = EXCLUDED.input_price_per_m,
  output_price_per_m = EXCLUDED.output_price_per_m,
  is_routable        = true,
  deprecated_at      = NULL;

-- 2. deepseek-v3 — primary for fast_code
INSERT INTO models (
  id, provider, display_name, tier,
  input_price_per_m, output_price_per_m,
  context_window, max_output_tokens,
  supports_vision, supports_tool_use, supports_reasoning, supports_task_budgets,
  effort_levels, tokenizer_inflation_vs_baseline,
  data_residency, is_routable, deprecated_at,
  best_for, avoid_for, exclude_for_workloads,
  editorial_notes
) VALUES (
  'deepseek-v3',
  'deepseek',
  'DeepSeek V3',
  'fast_code',
  0.14, 0.28,
  131072, 8192,
  false, true, false, false,
  '{}', 1.0,
  'global', true, NULL,
  ARRAY['code', 'fast_code', 'structured_output'],
  ARRAY['vision', 'image_analysis'],
  '{}',
  ARRAY[
    '81% SWE-bench Verified — top open-weight code model.',
    '$0.14/1M input — best code quality per dollar in this tier.'
  ]
) ON CONFLICT (id) DO UPDATE SET
  input_price_per_m  = EXCLUDED.input_price_per_m,
  output_price_per_m = EXCLUDED.output_price_per_m,
  is_routable        = true,
  deprecated_at      = NULL;

-- 3. claude-sonnet-4-6 — primary for tool_agent, creative_writing,
--    and reasoning_pro (after alias update above)
INSERT INTO models (
  id, provider, display_name, tier,
  input_price_per_m, output_price_per_m,
  context_window, max_output_tokens,
  supports_vision, supports_tool_use, supports_reasoning, supports_task_budgets,
  effort_levels, tokenizer_inflation_vs_baseline,
  data_residency, is_routable, deprecated_at,
  best_for, avoid_for, exclude_for_workloads,
  editorial_notes
) VALUES (
  'claude-sonnet-4-6',
  'anthropic',
  'Claude Sonnet 4.6',
  'tool_agent',
  3.00, 15.00,
  200000, 32000,
  true, true, true, false,
  '{}', 1.0,
  'global', true, NULL,
  ARRAY['tool_use', 'agent_workflows', 'creative_writing', 'reasoning', 'code'],
  '{}',
  '{}',
  ARRAY[
    'Best Anthropic model for tool calling and agent orchestration.',
    'Replaces claude-3-5-sonnet across all standard tiers.'
  ]
) ON CONFLICT (id) DO UPDATE SET
  input_price_per_m  = EXCLUDED.input_price_per_m,
  output_price_per_m = EXCLUDED.output_price_per_m,
  is_routable        = true,
  deprecated_at      = NULL;

-- 4. claude-opus-4 — primary for best_available
INSERT INTO models (
  id, provider, display_name, tier,
  input_price_per_m, output_price_per_m,
  context_window, max_output_tokens,
  supports_vision, supports_tool_use, supports_reasoning, supports_task_budgets,
  effort_levels, tokenizer_inflation_vs_baseline,
  data_residency, is_routable, deprecated_at,
  best_for, avoid_for, exclude_for_workloads,
  editorial_notes
) VALUES (
  'claude-opus-4',
  'anthropic',
  'Claude Opus 4',
  'best_available',
  15.00, 75.00,
  200000, 32000,
  true, true, true, false,
  '{}', 1.0,
  'global', true, NULL,
  ARRAY['best_available', 'complex_reasoning', 'mission_critical', 'whitepaper'],
  '{}',
  '{}',
  ARRAY[
    'Most capable Claude model for mission-critical tasks.',
    'Use when task complexity justifies $15/1M input cost.'
  ]
) ON CONFLICT (id) DO UPDATE SET
  input_price_per_m  = EXCLUDED.input_price_per_m,
  output_price_per_m = EXCLUDED.output_price_per_m,
  is_routable        = true,
  deprecated_at      = NULL;

-- 5. deepseek-r1 — fill in pricing (row already exists, partial)
INSERT INTO models (
  id, provider, display_name, tier,
  input_price_per_m, output_price_per_m,
  context_window, max_output_tokens,
  supports_vision, supports_tool_use, supports_reasoning, supports_task_budgets,
  effort_levels, tokenizer_inflation_vs_baseline,
  data_residency, is_routable, deprecated_at,
  best_for, avoid_for, exclude_for_workloads,
  editorial_notes
) VALUES (
  'deepseek-r1',
  'deepseek',
  'DeepSeek R1',
  'reasoning_pro',
  0.55, 2.19,
  128000, 8192,
  false, false, true, false,
  '{}', 1.0,
  'global', true, NULL,
  ARRAY['reasoning', 'math', 'analysis', 'complex_reasoning'],
  ARRAY['tool_use', 'vision'],
  '{}',
  ARRAY[
    'Strong reasoning at zero cost on OpenRouter free tier.',
    'Fully open-weights — self-hostable.'
  ]
) ON CONFLICT (id) DO UPDATE SET
  input_price_per_m  = EXCLUDED.input_price_per_m,
  output_price_per_m = EXCLUDED.output_price_per_m,
  tier               = EXCLUDED.tier,
  is_routable        = true,
  deprecated_at      = NULL;

-- ================================================================
-- PART 4: Mark claude-3-5-sonnet deprecated in models table
-- if a row exists for it (prevents it being recommended via
-- the constraint filter path even if someone adds it later).
-- ================================================================

UPDATE models
SET deprecated_at = NOW(), is_routable = false
WHERE id = 'claude-3-5-sonnet';

-- ================================================================
-- Verification queries (run manually after applying):
--
-- 1. All 5 new slugs present and routable:
--    SELECT id, tier, input_price_per_m, is_routable
--    FROM models
--    WHERE id IN ('gemini-2-flash','deepseek-v3','claude-sonnet-4-6',
--                 'claude-opus-4','deepseek-r1')
--    ORDER BY id;
--    Expected: 5 rows, all is_routable=true
--
-- 2. claude-3-5-sonnet gone from active model_aliases:
--    SELECT count(*) FROM model_aliases
--    WHERE active = true
--      AND model_id = (SELECT id FROM model_registry
--                      WHERE slug = 'claude-3-5-sonnet');
--    Expected: 0
--
-- 3. Each tier returns a non-null model_details:
--    POST /api/route {"task":"summarize this"}          cheap_chat
--    POST /api/route {"task":"parse JSON to CSV"}       cheap_structured
--    POST /api/route {"task":"write a Python function"} fast_code
--    POST /api/route {"task":"search the web"}          tool_agent
--    POST /api/route {"task":"cold sales email"}        creative_writing
--    POST /api/route {"task":"analyze tradeoffs"}       reasoning_pro
--    POST /api/route {"task":"whitepaper on consensus"} best_available
-- ================================================================
