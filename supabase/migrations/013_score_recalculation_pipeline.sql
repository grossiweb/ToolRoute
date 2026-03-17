-- ─────────────────────────────────────────────────────────────
-- Migration 013: Score Recalculation Pipeline
-- Bridges outcome_records → skill_scores + skill_benchmark_rollups
-- ─────────────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════
-- 1. recalculate_skill_scores()
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION recalculate_skill_scores()
RETURNS TABLE(skill_id UUID, records_used INT, new_value_score NUMERIC) AS $$
DECLARE
  rec RECORD;
  v_output        NUMERIC(4,2);
  v_reliability    NUMERIC(4,2);
  v_efficiency     NUMERIC(4,2);
  v_cost           NUMERIC(4,2);
  v_trust          NUMERIC(4,2);
  v_value          NUMERIC(4,2);
  v_overall        NUMERIC(4,2);
  v_avg_latency    NUMERIC;
  v_avg_cost       NUMERIC;
  v_success_count  INT;
  v_total_count    INT;
  v_existing       RECORD;
  v_blend_new      NUMERIC := 0.60;
  v_blend_old      NUMERIC := 0.40;
BEGIN
  FOR rec IN
    SELECT
      o.skill_id AS sid,
      COUNT(*)::INT AS total,
      COUNT(*) FILTER (WHERE o.outcome_status = 'success')::INT AS successes,
      AVG(o.output_quality_rating) FILTER (WHERE o.output_quality_rating IS NOT NULL) AS avg_quality,
      AVG(o.latency_ms) FILTER (WHERE o.latency_ms IS NOT NULL) AS avg_latency,
      AVG(o.estimated_cost_usd) FILTER (WHERE o.estimated_cost_usd IS NOT NULL) AS avg_cost
    FROM outcome_records o
    GROUP BY o.skill_id
    HAVING COUNT(*) >= 3
  LOOP
    v_total_count   := rec.total;
    v_success_count := rec.successes;

    -- Output score: direct average of quality ratings (already 0-10)
    v_output := COALESCE(rec.avg_quality, 5.00);

    -- Reliability score: success rate mapped to 0-10
    v_reliability := ROUND((v_success_count::NUMERIC / v_total_count) * 10, 2);

    -- Efficiency score: latency-based tiers
    v_avg_latency := COALESCE(rec.avg_latency, 5000);
    v_efficiency := CASE
      WHEN v_avg_latency <   500 THEN 10.00
      WHEN v_avg_latency <  1000 THEN  9.00
      WHEN v_avg_latency <  2000 THEN  8.00
      WHEN v_avg_latency <  5000 THEN  7.00
      WHEN v_avg_latency < 10000 THEN  6.00
      WHEN v_avg_latency < 30000 THEN  5.00
      WHEN v_avg_latency < 60000 THEN  4.00
      ELSE                              3.00
    END;

    -- Cost score: price-based tiers
    v_avg_cost := COALESCE(rec.avg_cost, 0);
    v_cost := CASE
      WHEN v_avg_cost  = 0     THEN 10.00
      WHEN v_avg_cost  < 0.001 THEN  9.50
      WHEN v_avg_cost  < 0.005 THEN  9.00
      WHEN v_avg_cost  < 0.01  THEN  8.00
      WHEN v_avg_cost  < 0.05  THEN  7.00
      WHEN v_avg_cost  < 0.10  THEN  6.00
      WHEN v_avg_cost  < 0.50  THEN  5.00
      ELSE                           4.00
    END;

    -- Fetch existing scores for blending
    SELECT * INTO v_existing FROM skill_scores ss WHERE ss.skill_id = rec.sid;

    IF v_existing IS NOT NULL THEN
      -- Blend: 60% outcome-derived + 40% existing (preserves GitHub-derived trust etc.)
      v_output      := ROUND(v_blend_new * v_output      + v_blend_old * COALESCE(v_existing.output_score,      v_output),      2);
      v_reliability := ROUND(v_blend_new * v_reliability  + v_blend_old * COALESCE(v_existing.reliability_score, v_reliability),  2);
      v_efficiency  := ROUND(v_blend_new * v_efficiency   + v_blend_old * COALESCE(v_existing.efficiency_score,  v_efficiency),   2);
      v_cost        := ROUND(v_blend_new * v_cost         + v_blend_old * COALESCE(v_existing.cost_score,        v_cost),         2);
      v_trust       := COALESCE(v_existing.trust_score, 5.00);  -- trust preserved from external sources
    ELSE
      v_trust := 5.00;  -- default trust for skills without prior scores
    END IF;

    -- Value Score = 0.35*Output + 0.25*Reliability + 0.15*Efficiency + 0.15*Cost + 0.10*Trust
    v_value := ROUND(
      0.35 * v_output +
      0.25 * v_reliability +
      0.15 * v_efficiency +
      0.15 * v_cost +
      0.10 * v_trust,
      2
    );

    -- Overall Score = value_score * 0.6 + adoption_score * 0.2 + freshness_score * 0.2
    v_overall := ROUND(
      v_value * 0.6 +
      COALESCE(v_existing.adoption_score,  5.00) * 0.2 +
      COALESCE(v_existing.freshness_score, 5.00) * 0.2,
      2
    );

    -- UPSERT into skill_scores
    INSERT INTO skill_scores (
      skill_id, output_score, reliability_score, efficiency_score, cost_score,
      trust_score, value_score, overall_score,
      adoption_score, freshness_score, setup_score,
      score_version, updated_at
    ) VALUES (
      rec.sid, v_output, v_reliability, v_efficiency, v_cost,
      v_trust, v_value, v_overall,
      COALESCE(v_existing.adoption_score,  5.00),
      COALESCE(v_existing.freshness_score, 5.00),
      COALESCE(v_existing.setup_score,     5.00),
      '2.0-pipeline',
      NOW()
    )
    ON CONFLICT (skill_id) DO UPDATE SET
      output_score      = EXCLUDED.output_score,
      reliability_score = EXCLUDED.reliability_score,
      efficiency_score  = EXCLUDED.efficiency_score,
      cost_score        = EXCLUDED.cost_score,
      trust_score       = EXCLUDED.trust_score,
      value_score       = EXCLUDED.value_score,
      overall_score     = EXCLUDED.overall_score,
      score_version     = EXCLUDED.score_version,
      updated_at        = NOW();

    -- Return row for summary
    skill_id       := rec.sid;
    records_used   := v_total_count;
    new_value_score := v_value;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION recalculate_skill_scores() IS
  'Aggregates outcome_records into skill_scores. Blends 60% outcome-derived + 40% existing. Minimum 3 records required.';


-- ═══════════════════════════════════════════════
-- 2. recalculate_benchmark_rollups()
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION recalculate_benchmark_rollups()
RETURNS TABLE(skill_id UUID, benchmark_profile_id UUID, sample_size INT) AS $$
BEGIN
  RETURN QUERY
  INSERT INTO skill_benchmark_rollups (
    skill_id,
    benchmark_profile_id,
    sample_size,
    avg_quality_score,
    avg_reliability_score,
    avg_efficiency_score,
    avg_cost_score,
    avg_trust_score,
    avg_value_score,
    cost_per_useful_outcome_usd,
    avg_human_correction_minutes,
    fallback_rate,
    success_rate,
    last_updated_at
  )
  SELECT
    o.skill_id,
    o.benchmark_profile_id,
    COUNT(*)::INT AS sample_size,

    -- avg_quality_score: direct average of output_quality_rating
    ROUND(AVG(o.output_quality_rating) FILTER (WHERE o.output_quality_rating IS NOT NULL), 2),

    -- avg_reliability_score: success rate * 10
    ROUND(
      (COUNT(*) FILTER (WHERE o.outcome_status = 'success')::NUMERIC / COUNT(*)) * 10,
      2
    ),

    -- avg_efficiency_score: average of per-record latency tiers
    ROUND(AVG(
      CASE
        WHEN o.latency_ms <   500 THEN 10.0
        WHEN o.latency_ms <  1000 THEN  9.0
        WHEN o.latency_ms <  2000 THEN  8.0
        WHEN o.latency_ms <  5000 THEN  7.0
        WHEN o.latency_ms < 10000 THEN  6.0
        WHEN o.latency_ms < 30000 THEN  5.0
        WHEN o.latency_ms < 60000 THEN  4.0
        ELSE                             3.0
      END
    ) FILTER (WHERE o.latency_ms IS NOT NULL), 2),

    -- avg_cost_score: average of per-record cost tiers
    ROUND(AVG(
      CASE
        WHEN o.estimated_cost_usd IS NULL OR o.estimated_cost_usd = 0 THEN 10.0
        WHEN o.estimated_cost_usd < 0.001 THEN  9.5
        WHEN o.estimated_cost_usd < 0.005 THEN  9.0
        WHEN o.estimated_cost_usd < 0.01  THEN  8.0
        WHEN o.estimated_cost_usd < 0.05  THEN  7.0
        WHEN o.estimated_cost_usd < 0.10  THEN  6.0
        WHEN o.estimated_cost_usd < 0.50  THEN  5.0
        ELSE                                     4.0
      END
    ), 2),

    -- avg_trust_score: higher for runtime_signed/hybrid proofs, lower for self_reported
    ROUND(AVG(
      CASE o.proof_type
        WHEN 'runtime_signed' THEN 9.0
        WHEN 'hybrid'         THEN 8.0
        WHEN 'client_signed'  THEN 7.0
        WHEN 'self_reported'  THEN 5.0
        ELSE                       5.0
      END
    ), 2),

    -- avg_value_score: 0.35*quality + 0.25*reliability + 0.15*efficiency + 0.15*cost + 0.10*trust
    -- (computed inline using the same components)
    ROUND(
      0.35 * COALESCE(AVG(o.output_quality_rating) FILTER (WHERE o.output_quality_rating IS NOT NULL), 5.0) +
      0.25 * ((COUNT(*) FILTER (WHERE o.outcome_status = 'success')::NUMERIC / COUNT(*)) * 10) +
      0.15 * COALESCE(AVG(
        CASE
          WHEN o.latency_ms <   500 THEN 10.0
          WHEN o.latency_ms <  1000 THEN  9.0
          WHEN o.latency_ms <  2000 THEN  8.0
          WHEN o.latency_ms <  5000 THEN  7.0
          WHEN o.latency_ms < 10000 THEN  6.0
          WHEN o.latency_ms < 30000 THEN  5.0
          WHEN o.latency_ms < 60000 THEN  4.0
          ELSE                             3.0
        END
      ) FILTER (WHERE o.latency_ms IS NOT NULL), 5.0) +
      0.15 * AVG(
        CASE
          WHEN o.estimated_cost_usd IS NULL OR o.estimated_cost_usd = 0 THEN 10.0
          WHEN o.estimated_cost_usd < 0.001 THEN  9.5
          WHEN o.estimated_cost_usd < 0.005 THEN  9.0
          WHEN o.estimated_cost_usd < 0.01  THEN  8.0
          WHEN o.estimated_cost_usd < 0.05  THEN  7.0
          WHEN o.estimated_cost_usd < 0.10  THEN  6.0
          WHEN o.estimated_cost_usd < 0.50  THEN  5.0
          ELSE                                     4.0
        END
      ) +
      0.10 * AVG(
        CASE o.proof_type
          WHEN 'runtime_signed' THEN 9.0
          WHEN 'hybrid'         THEN 8.0
          WHEN 'client_signed'  THEN 7.0
          WHEN 'self_reported'  THEN 5.0
          ELSE                       5.0
        END
      ),
      2
    ),

    -- cost_per_useful_outcome_usd: total cost / successful outcomes
    ROUND(
      COALESCE(
        SUM(o.estimated_cost_usd) FILTER (WHERE o.outcome_status IN ('success','partial_success'))
        / NULLIF(COUNT(*) FILTER (WHERE o.outcome_status IN ('success','partial_success')), 0),
        0
      ),
      4
    ),

    -- avg_human_correction_minutes
    ROUND(AVG(o.human_correction_minutes) FILTER (WHERE o.human_correction_required = true), 2),

    -- fallback_rate
    ROUND(
      COUNT(*) FILTER (WHERE o.fallback_used_skill_id IS NOT NULL)::NUMERIC / COUNT(*),
      4
    ),

    -- success_rate
    ROUND(
      COUNT(*) FILTER (WHERE o.outcome_status = 'success')::NUMERIC / COUNT(*),
      4
    ),

    NOW()

  FROM outcome_records o
  WHERE o.benchmark_profile_id IS NOT NULL
  GROUP BY o.skill_id, o.benchmark_profile_id

  ON CONFLICT (skill_id, benchmark_profile_id) DO UPDATE SET
    sample_size                  = EXCLUDED.sample_size,
    avg_quality_score            = EXCLUDED.avg_quality_score,
    avg_reliability_score        = EXCLUDED.avg_reliability_score,
    avg_efficiency_score         = EXCLUDED.avg_efficiency_score,
    avg_cost_score               = EXCLUDED.avg_cost_score,
    avg_trust_score              = EXCLUDED.avg_trust_score,
    avg_value_score              = EXCLUDED.avg_value_score,
    cost_per_useful_outcome_usd  = EXCLUDED.cost_per_useful_outcome_usd,
    avg_human_correction_minutes = EXCLUDED.avg_human_correction_minutes,
    fallback_rate                = EXCLUDED.fallback_rate,
    success_rate                 = EXCLUDED.success_rate,
    last_updated_at              = NOW()

  RETURNING
    skill_benchmark_rollups.skill_id,
    skill_benchmark_rollups.benchmark_profile_id,
    skill_benchmark_rollups.sample_size;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION recalculate_benchmark_rollups() IS
  'Aggregates outcome_records into skill_benchmark_rollups per (skill, benchmark_profile) pair.';


-- ═══════════════════════════════════════════════
-- 3. recalculate_all()
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION recalculate_all()
RETURNS JSON AS $$
DECLARE
  v_scores_count   INT;
  v_rollups_count  INT;
  v_started_at     TIMESTAMP := NOW();
BEGIN
  -- Run skill scores recalculation
  SELECT COUNT(*) INTO v_scores_count
  FROM recalculate_skill_scores();

  -- Run benchmark rollups recalculation
  SELECT COUNT(*) INTO v_rollups_count
  FROM recalculate_benchmark_rollups();

  RETURN json_build_object(
    'status',           'complete',
    'skills_updated',   v_scores_count,
    'rollups_updated',  v_rollups_count,
    'started_at',       v_started_at,
    'completed_at',     NOW(),
    'duration_ms',      EXTRACT(MILLISECOND FROM (NOW() - v_started_at))
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION recalculate_all() IS
  'Runs recalculate_skill_scores() then recalculate_benchmark_rollups() and returns a JSON summary.';


-- ═══════════════════════════════════════════════
-- 4. agent_credit_balances view
-- ═══════════════════════════════════════════════
CREATE OR REPLACE VIEW agent_credit_balances AS
SELECT
  contributor_id,
  agent_identity_id,
  SUM(routing_credits)       AS total_routing_credits,
  SUM(economic_credits_usd)  AS total_economic_credits_usd,
  SUM(reputation_points)     AS total_reputation_points,
  COUNT(*)                   AS total_rewards,
  MAX(created_at)            AS last_reward_at
FROM reward_ledgers
GROUP BY contributor_id, agent_identity_id;

COMMENT ON VIEW agent_credit_balances IS
  'Aggregated credit balances per contributor/agent from the reward_ledgers table.';
