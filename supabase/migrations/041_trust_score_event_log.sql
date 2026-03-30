-- Migration 041: Write to trust_score_events inside adjust_trust_score
--
-- Replaces the 040 version of adjust_trust_score with an identical body
-- that additionally INSERTs an audit row into trust_score_events on every
-- call. Atomic — the event row and the score update are in the same txn.

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
  v_new_score := GREATEST(1.0, LEAST(100.0, v_old_score + p_delta));

  UPDATE agent_identities
  SET trust_score = v_new_score
  WHERE id = p_agent_id
  RETURNING trust_tier, shadow_mode
  INTO v_new_tier, v_shadow;

  -- Audit log — every delta, positive or negative
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
