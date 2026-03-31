-- Migration 040: Continuous Bidirectional Agent Trust Score
--
-- Replaces the reputation-only, one-directional trust_tier system with
-- a continuous trust_score (0–100) that moves in both directions.
-- trust_tier is now derived automatically via trigger — never set directly.
--
-- Shadow mode: trust_score < 25 → agent's reports are recorded and credited
-- normally (agent sees no difference) but carry zero weight in routing score
-- updates. Neither the agent nor the API response reveals shadow mode.
--
-- Tier mapping (trigger-derived, enterprise = manual-only):
--   [75, 100] → production
--   [50,  75) → trusted
--   [25,  50) → baseline
--   [ 0,  25) → unverified + shadow_mode = true

-- ── 1. New columns on agent_identities ──────────────────────────────────────

ALTER TABLE agent_identities
  ADD COLUMN IF NOT EXISTS trust_score            NUMERIC(5,2) NOT NULL DEFAULT 50.0
    CHECK (trust_score >= 0 AND trust_score <= 100),
  ADD COLUMN IF NOT EXISTS shadow_mode            BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trust_score_updated_at TIMESTAMPTZ DEFAULT NOW();

-- Back-fill from existing tier (midpoints of each band)
UPDATE agent_identities SET trust_score = CASE trust_tier
  WHEN 'enterprise'  THEN 92.0
  WHEN 'production'  THEN 82.0
  WHEN 'trusted'     THEN 62.0
  WHEN 'baseline'    THEN 37.0
  ELSE                    12.0
END;

CREATE INDEX IF NOT EXISTS idx_agent_trust_score
  ON agent_identities(trust_score);

CREATE INDEX IF NOT EXISTS idx_agent_shadow
  ON agent_identities(shadow_mode)
  WHERE shadow_mode = true;

-- ── 2. Trigger: derive trust_tier + shadow_mode from trust_score ─────────────

CREATE OR REPLACE FUNCTION sync_trust_tier_from_score()
RETURNS TRIGGER AS $$
BEGIN
  -- Enterprise is manual-only — trigger never auto-promotes or demotes to/from it
  IF OLD.trust_tier = 'enterprise' THEN
    NEW.shadow_mode            := (NEW.trust_score < 25.0);
    NEW.trust_score_updated_at := NOW();
    RETURN NEW;
  END IF;

  NEW.trust_tier := CASE
    WHEN NEW.trust_score >= 75.0 THEN 'production'
    WHEN NEW.trust_score >= 50.0 THEN 'trusted'
    WHEN NEW.trust_score >= 25.0 THEN 'baseline'
    ELSE 'unverified'
  END;
  NEW.shadow_mode            := (NEW.trust_score < 25.0);
  NEW.trust_score_updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_sync_trust_tier
  BEFORE UPDATE OF trust_score ON agent_identities
  FOR EACH ROW EXECUTE FUNCTION sync_trust_tier_from_score();

-- ── 3. adjust_trust_score RPC ────────────────────────────────────────────────
-- Atomic, clamped to [1, 100]. Returns before/after state for logging.

CREATE OR REPLACE FUNCTION adjust_trust_score(
  p_agent_id UUID,
  p_delta    NUMERIC,
  p_reason   TEXT DEFAULT NULL
) RETURNS TABLE(
  new_score    NUMERIC,
  old_score    NUMERIC,
  shadow_mode  BOOLEAN,
  tier_changed BOOLEAN,
  old_tier     TEXT,
  new_tier     TEXT
) AS $$
DECLARE
  v_old_score NUMERIC(5,2);
  v_old_tier  TEXT;
  v_new_score NUMERIC(5,2);
  v_new_tier  TEXT;
  v_shadow    BOOLEAN;
BEGIN
  SELECT trust_score, trust_tier
  INTO v_old_score, v_old_tier
  FROM agent_identities
  WHERE id = p_agent_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agent not found: %', p_agent_id;
  END IF;

  -- Floor at 1.0 so weight (score/50) is never truly zero for registered agents.
  -- Shadow mode (< 25) still excludes from routing aggregates, but agent stays live.
  v_new_score := GREATEST(1.0, LEAST(100.0, v_old_score + p_delta));

  UPDATE agent_identities
  SET trust_score = v_new_score
  WHERE id = p_agent_id
  RETURNING trust_tier, shadow_mode
  INTO v_new_tier, v_shadow;

  RETURN QUERY SELECT
    v_new_score,
    v_old_score,
    v_shadow,
    (v_old_tier IS DISTINCT FROM v_new_tier),
    v_old_tier,
    v_new_tier;
END;
$$ LANGUAGE plpgsql;

-- ── 4. update_agent_stats — replace with backward-compat no-op ───────────────
-- Tier derivation now owned by trig_sync_trust_tier.
-- All existing callers (report/model, contributions, challenges) continue
-- to call this RPC unchanged — it simply does nothing for tier anymore.
-- Reputation points still accumulate in reward_ledgers via calling code.

CREATE OR REPLACE FUNCTION update_agent_stats(
  p_agent_id      UUID,
  p_credits_delta INT,
  p_rep_delta     INT
) RETURNS VOID AS $$
BEGIN
  -- No-op: trust_tier is now derived from trust_score via trig_sync_trust_tier.
  -- Reputation and credits are tracked in reward_ledgers by calling code.
  NULL;
END;
$$ LANGUAGE plpgsql;

-- ── 5. trust_score_events — audit log ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trust_score_events (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_identity_id UUID        NOT NULL REFERENCES agent_identities(id) ON DELETE CASCADE,
  delta             NUMERIC(6,2) NOT NULL,
  reason            TEXT        NOT NULL,
  score_before      NUMERIC(5,2) NOT NULL,
  score_after       NUMERIC(5,2) NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trust_events_agent
  ON trust_score_events(agent_identity_id, created_at DESC);

-- ── 6. get_model_outcome_stats RPC — trust-weighted averages ─────────────────
-- Shadow reporters (trust_score < 25) are excluded from all aggregates.
-- Anonymous reporters (no agent_identity_id) get weight 1.0 (neutral).
-- trust_weighted_quality = Σ(quality × weight) / Σ(weight)
-- where weight = trust_score / 50. Baseline agent (50) = weight 1.0.

CREATE OR REPLACE FUNCTION get_model_outcome_stats(model_ids UUID[])
RETURNS TABLE(
  model_id               UUID,
  avg_quality            NUMERIC,
  success_rate           NUMERIC,
  sample_size            INT,
  trust_weighted_quality NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mor.model_id,

    -- Unweighted average (backward compat)
    ROUND(AVG(mor.output_quality_rating)
      FILTER (WHERE mor.output_quality_rating IS NOT NULL), 2) AS avg_quality,

    -- Success rate
    ROUND(
      COUNT(*) FILTER (WHERE mor.outcome_status = 'success')::NUMERIC
      / NULLIF(COUNT(*), 0),
      4
    ) AS success_rate,

    COUNT(*)::INT AS sample_size,

    -- Trust-weighted quality
    ROUND(
      CASE
        WHEN SUM(
          CASE
            WHEN ai.trust_score IS NULL     THEN 1.0
            WHEN ai.trust_score >= 25.0     THEN ai.trust_score / 50.0
            ELSE 0.0
          END
        ) FILTER (WHERE mor.output_quality_rating IS NOT NULL) > 0
        THEN
          SUM(
            mor.output_quality_rating *
            CASE
              WHEN ai.trust_score IS NULL   THEN 1.0
              WHEN ai.trust_score >= 25.0   THEN ai.trust_score / 50.0
              ELSE 0.0
            END
          ) FILTER (WHERE mor.output_quality_rating IS NOT NULL)
          /
          SUM(
            CASE
              WHEN ai.trust_score IS NULL   THEN 1.0
              WHEN ai.trust_score >= 25.0   THEN ai.trust_score / 50.0
              ELSE 0.0
            END
          ) FILTER (WHERE mor.output_quality_rating IS NOT NULL)
        ELSE NULL
      END,
      2
    ) AS trust_weighted_quality

  FROM model_outcome_records mor
  LEFT JOIN agent_identities ai ON ai.id = mor.agent_identity_id
  WHERE mor.model_id = ANY(model_ids)
    -- Exclude shadow reporters from sample entirely
    AND (ai.id IS NULL OR ai.trust_score >= 25.0 OR ai.trust_score IS NULL)
  GROUP BY mor.model_id;
END;
$$ LANGUAGE plpgsql;

-- ── 7. Add agent_identity_id to outcome_records for skill score weighting ─────

ALTER TABLE outcome_records
  ADD COLUMN IF NOT EXISTS agent_identity_id UUID
    REFERENCES agent_identities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_outcome_records_agent
  ON outcome_records(agent_identity_id)
  WHERE agent_identity_id IS NOT NULL;
