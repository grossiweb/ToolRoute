-- Migration 037: Fix cheap_chat primary model
--
-- Root cause: alias_name has a UNIQUE constraint (not tier+model_id).
-- Migration 035 tried inserting gemini-2-flash with alias_name='toolroute/cheap_chat'
-- but that name was already taken by gpt-4o-mini (from migration 023).
-- ON CONFLICT DO NOTHING silently dropped all four cheap_chat inserts.
-- Migration 036's UPDATE then found 0 rows for gemini-2-flash in cheap_chat.
--
-- Result: claude-3-5-haiku (priority=1, the only remaining active row) became
-- the de facto primary despite costing 8x more than gemini-2-flash.
--
-- Fix: insert gemini-2-flash with a distinct alias_name, demote haiku.

-- Insert gemini-2-flash as cheap_chat primary
INSERT INTO model_aliases (tier, alias_name, model_id, priority, is_fallback, active)
VALUES (
  'cheap_chat',
  'toolroute/cheap_chat_primary',
  (SELECT id FROM model_registry WHERE slug = 'gemini-2-flash'),
  0,
  false,
  true
) ON CONFLICT (alias_name) DO UPDATE
  SET model_id = EXCLUDED.model_id, priority = 0, is_fallback = false, active = true;

-- Insert deepseek-v3 as fallback (also missed in 035 due to same conflict)
INSERT INTO model_aliases (tier, alias_name, model_id, priority, is_fallback, active)
VALUES (
  'cheap_chat',
  'toolroute/cheap_chat_deepseek',
  (SELECT id FROM model_registry WHERE slug = 'deepseek-v3'),
  2,
  true,
  true
) ON CONFLICT (alias_name) DO NOTHING;

-- Demote haiku — it was acting as primary only because nothing else was active
UPDATE model_aliases
SET priority = 4, is_fallback = true
WHERE tier = 'cheap_chat'
  AND model_id = (SELECT id FROM model_registry WHERE slug = 'claude-3-5-haiku');
