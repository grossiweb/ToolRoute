-- Migration 038: Trustless quality verification
--
-- Replaces reliance on agent-asserted output_quality_rating with a
-- three-tier hierarchy:
--   verified_quality  (LLM evaluator, weight 1.0)  ← most trusted
--   computed_quality  (structural signals, weight 0.85)
--   self_reported     (output_quality_rating, weight 0.5) ← least trusted
--
-- outcome_records gets: output_snippet, task_context, computed_quality,
--   verified_quality, quality_method, retry_count, agent_identity_id
-- model_outcome_records gets the same set
-- New table: agent_gaming_flags for anti-gaming detection

-- ============================================================
-- 1. outcome_records — add quality verification columns
-- ============================================================
ALTER TABLE outcome_records
  ADD COLUMN IF NOT EXISTS output_snippet    TEXT,
  ADD COLUMN IF NOT EXISTS task_context      TEXT,
  ADD COLUMN IF NOT EXISTS computed_quality  NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS verified_quality  NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS quality_method    TEXT,
  ADD COLUMN IF NOT EXISTS retry_count       INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS agent_identity_id UUID REFERENCES agent_identities(id) ON DELETE SET NULL;

-- task_fingerprint was NOT NULL with no DEFAULT — relax for new rows
ALTER TABLE outcome_records
  ALTER COLUMN task_fingerprint DROP NOT NULL;
ALTER TABLE outcome_records
  ALTER COLUMN task_fingerprint SET DEFAULT '';

-- ============================================================
-- 2. model_outcome_records — add same quality verification columns
-- ============================================================
ALTER TABLE model_outcome_records
  ADD COLUMN IF NOT EXISTS output_snippet   TEXT,
  ADD COLUMN IF NOT EXISTS task_context     TEXT,
  ADD COLUMN IF NOT EXISTS computed_quality NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS verified_quality NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS quality_method   TEXT,
  ADD COLUMN IF NOT EXISTS retry_count      INT DEFAULT 0;
-- agent_identity_id already exists on model_outcome_records (from prior migration)

-- ============================================================
-- 3. agent_gaming_flags — anti-gaming detection log
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_gaming_flags (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_identity_id  UUID        NOT NULL REFERENCES agent_identities(id) ON DELETE CASCADE,
  flag_type          TEXT        NOT NULL,  -- 'constant_quality' | 'identical_latency' | 'always_success'
  flag_detail        TEXT,
  flagged_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved           BOOLEAN     DEFAULT false
);

-- One active flag per (agent, type) — resolved flags can stack
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_gaming_flag
  ON agent_gaming_flags(agent_identity_id, flag_type)
  WHERE resolved = false;
