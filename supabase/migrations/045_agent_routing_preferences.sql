-- ============================================================
-- 045_agent_routing_preferences.sql
-- ============================================================
-- Strategy D Phase 2 — adds per-agent routing preferences.
--
-- Stores two opt-in toggles on agent_identities:
--   * allow_china          — boolean. When true, China-residency models
--                            (DeepSeek family) become eligible.
--   * regulated_industries — text[]. When non-empty, the routing layer
--                            uses the 'regulated' profile and excludes
--                            models flagged unsafe for that industry.
--
-- The actual mapping from preferences → routing profile lives in code
-- (src/lib/routing/tiers.ts). This migration only persists the toggles.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS + CREATE INDEX IF NOT EXISTS.
-- Existing rows receive the default value automatically when the column
-- is added with a DEFAULT.
-- ============================================================

ALTER TABLE agent_identities
  ADD COLUMN IF NOT EXISTS routing_preferences JSONB
    NOT NULL
    DEFAULT '{"allow_china": false, "regulated_industries": []}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_agent_identities_allow_china
  ON agent_identities ((routing_preferences->>'allow_china'));

CREATE INDEX IF NOT EXISTS idx_agent_identities_regulated_industries
  ON agent_identities USING GIN ((routing_preferences->'regulated_industries'));

-- ============================================================
-- Verification (run after migration completes):
--
--   SELECT column_name, data_type, column_default
--   FROM information_schema.columns
--   WHERE table_name = 'agent_identities' AND column_name = 'routing_preferences';
--
--   SELECT id, routing_preferences FROM agent_identities LIMIT 3;
--   -- Expected: every row shows {"allow_china": false, "regulated_industries": []}
-- ============================================================
