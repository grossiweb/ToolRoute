-- 076_drop_model_outcome_model_slug_fk.sql
-- Applied via Supabase (MCP) on 2026-06-18.
--
-- Telemetry must accept outcome reports for ANY model an agent actually ran,
-- not only models in the routing catalog. The FK from
-- model_outcome_records.model_slug -> models(id) rejected uncatalogued slugs
-- (e.g. an OpenRouter model not yet seeded) with a Postgres FK violation that
-- surfaced as a 500. Drop it: the /api/report/model handler now stores the raw
-- slug regardless of catalog membership and reports catalog_model:true|false in
-- the response. Read-side joins to models must tolerate slugs absent from the
-- catalog (LEFT JOIN), since model_slug is no longer guaranteed to reference a
-- models row.
ALTER TABLE model_outcome_records
  DROP CONSTRAINT IF EXISTS model_outcome_records_model_slug_fkey;
