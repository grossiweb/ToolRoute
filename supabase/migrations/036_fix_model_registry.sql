-- Migration 036: Fix model registry inconsistencies
--
-- Issues:
--   1. Duplicate Gemini Flash: gemini-2-0-flash (023) vs gemini-2-flash (035, benchmark-tested)
--   2. creative_writing tier has zero aliases — any creative task returns 404
--   3. Wrong tier primaries: ON CONFLICT DO NOTHING in 035 left 023 priorities intact
--      cheap_chat primary is still gpt-4o-mini (should be gemini-2-flash, benchmark winner)
--      fast_code primary is still claude-3-5-sonnet (should be deepseek-v3, benchmark winner)
--      cheap_structured primary is still gpt-4o-mini (should be gemini-2-flash)
--   4. model_aliases rows from 023 never set active — may be NULL, filtered out by .eq('active', true)

-- ============================================================
-- 1. Ensure all existing alias rows are active
-- ============================================================
UPDATE model_aliases SET active = true WHERE active IS NULL;

-- ============================================================
-- 2. Deprecate superseded models
-- ============================================================
UPDATE model_registry
SET status = 'deprecated'
WHERE slug IN ('gemini-2-0-flash', 'gemini-2-0-flash-lite');

-- ============================================================
-- 3. Migrate aliases from gemini-2-0-flash → gemini-2-flash
--    (gemini-2-flash is the benchmark-tested version with accurate latency)
-- ============================================================
UPDATE model_aliases
SET model_id = (SELECT id FROM model_registry WHERE slug = 'gemini-2-flash')
WHERE model_id = (SELECT id FROM model_registry WHERE slug = 'gemini-2-0-flash');

-- Deactivate any aliases still pointing at deprecated models
UPDATE model_aliases
SET active = false
WHERE model_id IN (SELECT id FROM model_registry WHERE status = 'deprecated');

-- ============================================================
-- 4. Fix cheap_chat primary → Gemini 2.0 Flash
--    Claudia benchmark: fastest (2.5s) + cheapest ($0.10/Mtok), 7.7 avg quality
-- ============================================================
UPDATE model_aliases
SET priority = 3, is_fallback = true
WHERE tier = 'cheap_chat'
  AND model_id = (SELECT id FROM model_registry WHERE slug = 'gpt-4o-mini');

UPDATE model_aliases
SET priority = 0, is_fallback = false
WHERE tier = 'cheap_chat'
  AND model_id = (SELECT id FROM model_registry WHERE slug = 'gemini-2-flash');

-- ============================================================
-- 5. Fix fast_code primary → DeepSeek V3
--    Claudia benchmark: 8.0 avg quality on code tasks, very_high code_strength, $0.14/Mtok
-- ============================================================
UPDATE model_aliases
SET priority = 2, is_fallback = true
WHERE tier = 'fast_code'
  AND model_id = (SELECT id FROM model_registry WHERE slug = 'claude-3-5-sonnet');

UPDATE model_aliases
SET priority = 0, is_fallback = false
WHERE tier = 'fast_code'
  AND model_id = (SELECT id FROM model_registry WHERE slug = 'deepseek-v3');

-- ============================================================
-- 6. Fix cheap_structured primary → Gemini 2.0 Flash
--    Claudia benchmark: all models tied at 8.4 on structured tasks; Gemini cheapest + fastest
-- ============================================================
UPDATE model_aliases
SET priority = 3, is_fallback = true
WHERE tier = 'cheap_structured'
  AND model_id = (SELECT id FROM model_registry WHERE slug = 'gpt-4o-mini');

UPDATE model_aliases
SET priority = 0, is_fallback = false
WHERE tier = 'cheap_structured'
  AND model_id = (SELECT id FROM model_registry WHERE slug = 'gemini-2-flash');

-- ============================================================
-- 7. Add creative_writing tier — was never seeded, causes 404
--    Claude 3.5 Sonnet: best creative quality; GPT-4o solid fallback
-- ============================================================
INSERT INTO model_aliases (tier, alias_name, model_id, priority, is_fallback, active)
VALUES
  ('creative_writing', 'toolroute/creative_writing',
   (SELECT id FROM model_registry WHERE slug = 'claude-3-5-sonnet'), 0, false, true),
  ('creative_writing', 'toolroute/creative_writing_fb1',
   (SELECT id FROM model_registry WHERE slug = 'gpt-4o'), 1, true, true),
  ('creative_writing', 'toolroute/creative_writing_fb2',
   (SELECT id FROM model_registry WHERE slug = 'minimax-m1'), 2, true, true),
  ('creative_writing', 'toolroute/creative_writing_fb3',
   (SELECT id FROM model_registry WHERE slug = 'llama-3-3-70b'), 3, true, true)
ON CONFLICT DO NOTHING;
