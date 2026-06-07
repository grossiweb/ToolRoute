-- 057_backdoc_agent_feedback_and_surveyed_at.sql
-- Applied via UI at unknown earlier date; back-documented for fresh-rebuild/record
-- only, safe to skip on prod. The objects below ALREADY EXIST in the live DB — this
-- file was NOT applied via apply_migration; it exists so a from-scratch rebuild and
-- the version-controlled record match production. All DDL is idempotent.
--
-- Found by the 2026-06-07 migration<->live-schema reconciliation: these were the
-- only undocumented live objects (applied through the Supabase UI, never committed).
-- They are a coherent pair — an agent satisfaction/survey feature.
--   - agent_feedback                (table)
--   - agent_identities.surveyed_at  (column)
-- Slot 057 is the natural gap in the migration sequence.

CREATE TABLE IF NOT EXISTS agent_feedback (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_identity_id uuid REFERENCES agent_identities(id),
  rating            smallint NOT NULL,
  comment           text,
  star_prompted     boolean DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE agent_identities ADD COLUMN IF NOT EXISTS surveyed_at timestamptz;
