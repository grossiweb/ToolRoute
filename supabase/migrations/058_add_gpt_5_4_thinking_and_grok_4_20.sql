-- ============================================================
-- 058_add_gpt_5_4_thinking_and_grok_4_20.sql
-- ============================================================
-- Adds two models the May 2026 monthly audit flagged as live
-- upstream but missing from the catalog:
--   - gpt-5.4-thinking (OpenAI reasoning variant of GPT-5.4)
--   - grok-4.20        (xAI flagship, March 2026)
--
-- TIER_MAP is intentionally NOT modified by this migration —
-- same approach as migration 044. The new models become
-- reachable via explicit constraint or future telemetry-driven
-- placement, but won't change any default routing today.
--
-- Idempotent: ON CONFLICT (id) DO NOTHING.
-- ============================================================

INSERT INTO models (
  id, provider, display_name, family, tier,
  input_price_per_m, output_price_per_m,
  context_window, max_output_tokens,
  supports_tool_use, supports_vision, supports_reasoning,
  us_only_multiplier,
  released_at, is_routable, source
) VALUES
('gpt-5.4-thinking', 'openai', 'GPT-5.4 Thinking', 'gpt',  'flagship', 2.50, 15.00, 1050000, 128000, true,  true,  true, 1.10, '2026-03-15T00:00:00Z', true, 'seed'),
('grok-4.20',        'xai',    'Grok 4.20',        'grok', 'flagship', 2.00,  6.00,  256000,  16384, true,  false, true, 1.00, '2026-03-10T00:00:00Z', true, 'seed')
ON CONFLICT (id) DO NOTHING;

-- Pricing history snapshots
INSERT INTO model_pricing_history (
  model_id, input_price_per_m, output_price_per_m, source
) VALUES
('gpt-5.4-thinking', 2.50, 15.00, 'seed'),
('grok-4.20',        2.00,  6.00, 'seed');

-- ============================================================
-- Verification query (run after migration completes):
--
--   SELECT id, provider, tier, input_price_per_m, output_price_per_m,
--          context_window, supports_tool_use, supports_vision,
--          supports_reasoning, us_only_multiplier, source
--   FROM models
--   WHERE id IN ('gpt-5.4-thinking', 'grok-4.20');
--   -- Expected: 2 rows
-- ============================================================
