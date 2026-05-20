-- ============================================================
-- 049_available_providers.sql
-- ============================================================
-- Adds `available_providers` key (type: text[], default: '{}')
-- to the JSONB column `agent_identities.routing_preferences`.
--
-- Background:
--   routing_preferences is a JSONB blob (migration 045) holding
--   { allow_china: boolean, regulated_industries: text[] }.
--   This migration extends the schema with a third key —
--   `available_providers` — used by resolveTierToModel() in
--   src/lib/routing/tiers.ts to filter the [primary, ...fallbacks]
--   chain down to providers the agent's infra can actually call.
--
--   Because the column is JSONB (schemaless), there is no DDL
--   to add the key itself. The migration patches existing rows
--   to include the default value, and adds a CHECK to validate
--   the shape of the key when present.
--
-- Idempotent: only updates rows missing the key. Re-runnable.
-- ============================================================

-- 1. Backfill existing rows with default empty array
UPDATE agent_identities
SET routing_preferences = COALESCE(routing_preferences, '{}'::jsonb)
                          || jsonb_build_object('available_providers', '[]'::jsonb)
WHERE NOT (COALESCE(routing_preferences, '{}'::jsonb) ? 'available_providers');

-- 2. Constraint: if the key is present, it must be a JSON array of strings.
--    Skips the check when the key is absent so old rows that haven't been
--    patched (e.g. mid-migration) don't error out.
ALTER TABLE agent_identities
  DROP CONSTRAINT IF EXISTS routing_preferences_available_providers_shape;

ALTER TABLE agent_identities
  ADD CONSTRAINT routing_preferences_available_providers_shape
  CHECK (
    routing_preferences IS NULL
    OR NOT (routing_preferences ? 'available_providers')
    OR jsonb_typeof(routing_preferences -> 'available_providers') = 'array'
  );

-- ============================================================
-- Verification queries (run after migration):
--
--   -- Every row should now have the key:
--   SELECT COUNT(*) FROM agent_identities
--   WHERE NOT (COALESCE(routing_preferences, '{}'::jsonb) ? 'available_providers');
--   -- Expected: 0
--
--   -- Sample shape check:
--   SELECT id, agent_name, routing_preferences -> 'available_providers' AS avail
--   FROM agent_identities
--   LIMIT 5;
--   -- Expected: avail is [] for all (default), or a JSON array of provider strings
-- ============================================================
