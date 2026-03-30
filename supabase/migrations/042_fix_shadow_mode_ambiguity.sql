-- Migration 042: Fix ambiguous shadow_mode column reference in adjust_trust_score
--
-- The RETURNS TABLE definition declares a column named shadow_mode, and the
-- function body does RETURNING shadow_mode from the UPDATE — Postgres can't
-- disambiguate between the output column and the table column.
-- Fix: table-qualify the column in the RETURNING clause.

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

  v_new_score := GREATEST(1.0, LEAST(100.0, v_old_score + p_delta));

  -- Table-qualify shadow_mode to avoid ambiguity with the RETURNS TABLE column
  UPDATE agent_identities ai
  SET trust_score = v_new_score
  WHERE ai.id = p_agent_id
  RETURNING ai.trust_tier, ai.shadow_mode
  INTO v_new_tier, v_shadow;

  INSERT INTO trust_score_events (
    agent_identity_id,
    delta,
    reason,
    score_before,
    score_after
  ) VALUES (
    p_agent_id,
    p_delta,
    COALESCE(p_reason, 'unspecified'),
    v_old_score,
    v_new_score
  );

  RETURN QUERY SELECT
    v_new_score,
    v_old_score,
    v_shadow,
    (v_old_tier IS DISTINCT FROM v_new_tier),
    v_old_tier,
    v_new_tier;
END;
$$ LANGUAGE plpgsql;
