-- 059_add_model_slug.sql
-- Applied via Supabase (MCP apply_migration) on 2026-06-07; verified column present.
--
-- Fix for the /api/report/model 500 (zero writes since 2026-04-23).
-- Root cause: the handler resolves the model from the new `models` table (text
-- slug id) and writes that slug into model_outcome_records.model_id, which is
-- uuid NOT NULL (FK to legacy model_registry) -> insert throws -> 500.
--
-- Non-destructive unblock: stop the legacy uuid FK from hard-failing inserts,
-- and add a forward-only text slug column. Preserves the 219 historical rows
-- (they keep model_id; model_slug stays null on them).
--
-- APPLY FIRST. The report/model + verify/model handler edits (which write
-- model_slug) must deploy AFTER this, and migration 060 (RPC repoint) AFTER that.

ALTER TABLE model_outcome_records ALTER COLUMN model_id DROP NOT NULL;
ALTER TABLE model_outcome_records ADD COLUMN model_slug text REFERENCES models(id);
