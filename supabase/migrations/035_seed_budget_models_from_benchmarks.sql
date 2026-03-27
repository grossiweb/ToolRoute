-- Migration 035: Seed budget models from Claudia's A/B benchmark data
--
-- Claudia tested 5 models across 12 tasks (60 executions). Results:
--   MiniMax M1:    8.1 avg, $0.40/1M in, $2.20/1M out, ~9s latency
--   DeepSeek V3:   8.0 avg, $0.14/1M in, $0.28/1M out, ~15s latency
--   Haiku 3.5:     7.9 avg, $0.80/1M in, $4.00/1M out, ~5.5s latency
--   GPT-4o Mini:   7.7 avg, $0.15/1M in, $0.60/1M out, ~9.5s latency
--   Gemini Flash:  7.7 avg, $0.10/1M in, $0.40/1M out, ~2.5s latency (FASTEST)
--
-- Key insight: Budget models (Gemini Flash, DeepSeek V3) score within 5%
-- of mid-tier models at 1/8th the cost. The routing should prefer them
-- for standard tasks, reserving premium models for complex reasoning.

-- Add new models to registry (skip if already exist)
INSERT INTO model_registry (slug, display_name, provider, provider_model_id, status,
  input_cost_per_mtok, output_cost_per_mtok, context_window, max_output_tokens,
  avg_latency_ms, tokens_per_second,
  supports_tool_calling, supports_structured_output, supports_vision,
  reasoning_strength, code_strength)
VALUES
  ('gemini-2-flash', 'Gemini 2.0 Flash', 'google', 'google/gemini-2.0-flash-001', 'active',
   0.10, 0.40, 1048576, 8192, 2500, 150,
   true, true, true, 'medium', 'medium'),
  ('deepseek-v3', 'DeepSeek V3', 'deepseek', 'deepseek/deepseek-chat-v3-0324', 'active',
   0.14, 0.28, 131072, 8192, 15000, 80,
   true, true, false, 'high', 'very_high'),
  ('gpt-4o-mini', 'GPT-4o Mini', 'openai', 'openai/gpt-4o-mini', 'active',
   0.15, 0.60, 128000, 16384, 9500, 100,
   true, true, true, 'medium', 'medium'),
  ('minimax-m1', 'MiniMax M1', 'minimax', 'minimax/minimax-m1', 'active',
   0.40, 2.20, 1000000, 8192, 9000, 90,
   true, true, false, 'high', 'high')
ON CONFLICT (slug) DO UPDATE SET
  input_cost_per_mtok = EXCLUDED.input_cost_per_mtok,
  output_cost_per_mtok = EXCLUDED.output_cost_per_mtok,
  avg_latency_ms = EXCLUDED.avg_latency_ms,
  status = 'active';

-- Assign budget models to cheap_chat tier (best value for simple tasks)
INSERT INTO model_aliases (tier, alias_name, model_id, priority, is_fallback, active)
SELECT 'cheap_chat', 'toolroute/cheap_chat', id,
  CASE slug
    WHEN 'gemini-2-flash' THEN 1    -- Best value: cheapest + fastest
    WHEN 'deepseek-v3' THEN 2       -- Second best value
    WHEN 'gpt-4o-mini' THEN 3       -- Solid all-rounder
    WHEN 'minimax-m1' THEN 4        -- Highest quality but 4x cost of Gemini
  END,
  CASE slug WHEN 'gemini-2-flash' THEN false ELSE true END,
  true
FROM model_registry
WHERE slug IN ('gemini-2-flash', 'deepseek-v3', 'gpt-4o-mini', 'minimax-m1')
ON CONFLICT DO NOTHING;

-- Assign code-capable models to fast_code tier
INSERT INTO model_aliases (tier, alias_name, model_id, priority, is_fallback, active)
SELECT 'fast_code', 'toolroute/fast_code', id,
  CASE slug
    WHEN 'deepseek-v3' THEN 1       -- Best at code per Claudia's tests (tied with MiniMax)
    WHEN 'minimax-m1' THEN 2        -- Tied for code quality
    WHEN 'gemini-2-flash' THEN 3    -- Cheapest option for simple code
    WHEN 'gpt-4o-mini' THEN 4       -- Solid fallback
  END,
  CASE slug WHEN 'deepseek-v3' THEN false ELSE true END,
  true
FROM model_registry
WHERE slug IN ('deepseek-v3', 'minimax-m1', 'gemini-2-flash', 'gpt-4o-mini')
ON CONFLICT DO NOTHING;

-- Assign to cheap_structured tier (JSON, CSV, parsing)
INSERT INTO model_aliases (tier, alias_name, model_id, priority, is_fallback, active)
SELECT 'cheap_structured', 'toolroute/cheap_structured', id,
  CASE slug
    WHEN 'gemini-2-flash' THEN 1    -- All models tied at 8.4 on structured; Gemini cheapest
    WHEN 'deepseek-v3' THEN 2
    WHEN 'gpt-4o-mini' THEN 3
    WHEN 'minimax-m1' THEN 4
  END,
  CASE slug WHEN 'gemini-2-flash' THEN false ELSE true END,
  true
FROM model_registry
WHERE slug IN ('gemini-2-flash', 'deepseek-v3', 'gpt-4o-mini', 'minimax-m1')
ON CONFLICT DO NOTHING;
