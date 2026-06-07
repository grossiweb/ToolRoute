-- 061_add_recommended_model_slug.sql
-- Applied via Supabase (MCP apply_migration) on 2026-06-07; verified column present.
--
-- Fix for silently-dead routing-decision logging (no writes since 2026-05-20).
-- Root cause (same shape as the /api/report/model 500): /api/route/model logs the
-- decision fire-and-forget and writes recommended_model_id = primary.id, where
-- primary.id became a `models`-table text slug as of commit c5eac8f (2026-05-20,
-- candidate source switched from model_registry to models). The column is
-- uuid NOT NULL (FK to legacy model_registry) -> insert throws -> swallowed by
-- the .then() fire-and-forget -> 200 returned, no row.
--
-- Non-destructive, forward-only: drop NOT NULL on the legacy uuid column and add a
-- text slug column. Handler writes recommended_model_slug; readers (routing-memory,
-- agents/[id]/memory) read it. Preserves the 12,573 historical rows (they keep
-- recommended_model_id; recommended_model_slug stays null on them).
--
-- APPLY FIRST. The route/model handler + reader edits (which write/read
-- recommended_model_slug) must deploy AFTER this so the column exists at runtime.

ALTER TABLE model_routing_decisions ALTER COLUMN recommended_model_id DROP NOT NULL;
ALTER TABLE model_routing_decisions ADD COLUMN recommended_model_slug text REFERENCES models(id);
