-- Migration 024: Atomic counter increment RPCs
-- Fixes race conditions on claimed_count, completed_count, submission_count

-- ── Mission: atomic claim increment ────────────────────────
CREATE OR REPLACE FUNCTION increment_mission_claimed(p_mission_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_count int;
  v_max_claims int;
  v_new_status text;
BEGIN
  UPDATE benchmark_missions
  SET claimed_count = claimed_count + 1
  WHERE id = p_mission_id
  RETURNING claimed_count, max_claims INTO v_new_count, v_max_claims;

  IF v_new_count IS NULL THEN
    RETURN jsonb_build_object('error', 'Mission not found');
  END IF;

  v_new_status := CASE WHEN v_new_count >= v_max_claims THEN 'fully_claimed' ELSE 'available' END;

  UPDATE benchmark_missions SET status = v_new_status WHERE id = p_mission_id;

  RETURN jsonb_build_object(
    'claimed_count', v_new_count,
    'status', v_new_status
  );
END;
$$;

-- ── Mission: atomic complete increment ─────────────────────
CREATE OR REPLACE FUNCTION increment_mission_completed(p_mission_id uuid)
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_count int;
BEGIN
  UPDATE benchmark_missions
  SET completed_count = completed_count + 1
  WHERE id = p_mission_id
  RETURNING completed_count INTO v_new_count;

  RETURN COALESCE(v_new_count, 0);
END;
$$;

-- ── Challenge: atomic submission increment ─────────────────
CREATE OR REPLACE FUNCTION increment_challenge_submissions(p_challenge_id uuid)
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_count int;
BEGIN
  UPDATE workflow_challenges
  SET submission_count = submission_count + 1
  WHERE id = p_challenge_id
  RETURNING submission_count INTO v_new_count;

  RETURN COALESCE(v_new_count, 0);
END;
$$;
