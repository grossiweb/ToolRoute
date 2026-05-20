-- ============================================================
-- 050_migration_notices.sql
-- ============================================================
-- Agent-facing notification system. Server pushes structured
-- notices into routing responses so agents learn about schema
-- changes, payload-shape updates, deprecations, and new
-- preferences without needing to re-read docs every session.
--
-- Read path:  /api/route, /api/route/model → getActiveNotices()
--             attaches a `notices` array (and `migration_notice`
--             singular when count = 1) to the response.
--
-- Write path: POST /api/admin/notices (ADMIN_SECRET-gated) is
--             the canonical insert path. Do not INSERT manually
--             except for the two seed rows below.
--
-- Targeting:
--   target_agent_id   NULL = broadcast to every agent
--                      set  = only that agent sees it
--   target_endpoint   NULL = show on any route call
--                      set  = only when that endpoint is hit
--                             (e.g. '/api/contributions')
--
-- Lifecycle:
--   is_active = false  hides immediately (admin endpoint sets
--                      this; DO NOT DELETE rows — audit trail).
--   expires_at         hard cutoff; rows past expiry are filtered
--                      out by getActiveNotices() regardless of
--                      is_active.
-- ============================================================

CREATE TABLE migration_notices (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_agent_id  UUID REFERENCES agent_identities(id) ON DELETE CASCADE,
  target_endpoint  TEXT,
  severity         TEXT NOT NULL CHECK (severity IN ('info','warning','critical')),
  message          TEXT NOT NULL,
  hint             TEXT,
  correct_endpoint TEXT,
  docs_url         TEXT,
  effective_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  expires_at       TIMESTAMPTZ,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Per-agent lookups (fast path when agent_identity_id is present)
CREATE INDEX ON migration_notices (target_agent_id, is_active, expires_at);

-- Broadcast lookups (partial index keeps it tight)
CREATE INDEX ON migration_notices (is_active, expires_at)
  WHERE target_agent_id IS NULL;

-- ============================================================
-- Seed: two broadcast notices that are useful right now
-- ============================================================

-- 1. /api/contributions payload shape change (came up in the audit —
--    callers were sending model telemetry to the skill endpoint).
INSERT INTO migration_notices (
  severity, message, hint, correct_endpoint, docs_url, effective_date
) VALUES (
  'warning',
  '/api/contributions only accepts MCP skill telemetry. run_telemetry requires skill_id or skill_slug inside the payload object.',
  'If you are reporting an LLM model execution, send it to POST /api/report/model instead. Wrap telemetry fields in a `payload` key: { agent_identity_id, contribution_type: "run_telemetry", payload: { skill_slug, outcome_status, latency_ms, ... } }.',
  'POST /api/report/model',
  'https://toolroute.io/api-docs#-api-contributions',
  CURRENT_DATE
);

-- 2. New available_providers preference (migration 049).
INSERT INTO migration_notices (
  severity, message, hint, correct_endpoint, docs_url, effective_date
) VALUES (
  'info',
  'New preference: available_providers. Set the list of LLM providers your infrastructure can reach (e.g. ["anthropic"]) so the router skips fallbacks you cannot call.',
  'POST /api/agents/preferences with { agent_identity_id, preferences: { available_providers: ["anthropic", "openai"] } }. Empty array (default) disables the filter.',
  'POST /api/agents/preferences',
  'https://toolroute.io/api-docs#-api-agents-preferences',
  CURRENT_DATE
);

-- ============================================================
-- Verification queries (run after migration):
--
--   -- Should return 2:
--   SELECT COUNT(*) FROM migration_notices WHERE is_active;
--
--   -- Inspect:
--   SELECT severity, message, correct_endpoint, effective_date
--   FROM migration_notices ORDER BY created_at;
-- ============================================================
