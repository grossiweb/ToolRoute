-- ============================================================
-- 044_add_gpt_5_5_models.sql
-- ============================================================
-- Adds GPT-5.5 and GPT-5.5 Pro to the model catalog.
-- Released by OpenAI on 2026-04-23 (API available 2026-04-24).
--
-- TIER_MAP is intentionally NOT modified by this migration.
-- The new models are reachable via explicit constraint
-- (require_effort_level on Pro) but won't be the default for
-- any tier yet. Telemetry will guide future placement.
--
-- Idempotent: ON CONFLICT (id) DO NOTHING — these IDs should
-- not collide with any existing row.
-- ============================================================

INSERT INTO models (
  id, provider, display_name, family, tier,
  input_price_per_m, output_price_per_m,
  context_window, max_output_tokens,
  supports_tool_use, supports_vision, supports_reasoning,
  us_only_multiplier,
  released_at, is_routable, source
) VALUES
('gpt-5.5',     'openai', 'GPT-5.5',     'gpt', 'mid',       5.00,  30.00, 1000000, 128000, true, true, true, 1.10, '2026-04-23T00:00:00Z', true, 'seed'),
('gpt-5.5-pro', 'openai', 'GPT-5.5 Pro', 'gpt', 'flagship', 30.00, 180.00, 1000000, 128000, true, true, true, 1.10, '2026-04-23T00:00:00Z', true, 'seed')
ON CONFLICT (id) DO NOTHING;

-- Pricing history: one snapshot row per new model
INSERT INTO model_pricing_history (
  model_id, input_price_per_m, output_price_per_m, source
) VALUES
('gpt-5.5',      5.00,  30.00, 'seed'),
('gpt-5.5-pro', 30.00, 180.00, 'seed');

-- ============================================================
-- Verification query (run after migration completes):
--
--   SELECT id, provider, tier, input_price_per_m, output_price_per_m,
--          context_window, supports_tool_use, supports_vision,
--          supports_reasoning, us_only_multiplier, source
--   FROM models
--   WHERE id IN ('gpt-5.5', 'gpt-5.5-pro');
--   -- Expected: 2 rows, $5/$30 and $30/$180, 1M context, all caps true
-- ============================================================
