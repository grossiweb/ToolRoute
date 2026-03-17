-- ─────────────────────────────────────────────────────────────
-- Migration 015: Cap all scores at 9.8 and recalculate value_score
--
-- Philosophy: Like Consumer Reports, no tool should ever achieve
-- a perfect 10. There is always room for improvement.
-- Max score: 9.8 (exceptional). Scores above are clamped down.
-- ─────────────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════
-- 1. Cap all existing dimension scores at 9.8
-- ═══════════════════════════════════════════════
UPDATE skill_scores SET
  output_score      = LEAST(output_score, 9.8),
  reliability_score = LEAST(reliability_score, 9.8),
  efficiency_score  = LEAST(efficiency_score, 9.8),
  cost_score        = LEAST(cost_score, 9.8),
  trust_score       = LEAST(trust_score, 9.8)
WHERE output_score > 9.8
   OR reliability_score > 9.8
   OR efficiency_score > 9.8
   OR cost_score > 9.8
   OR trust_score > 9.8;

-- ═══════════════════════════════════════════════
-- 2. Recalculate value_score from capped dimensions
-- ═══════════════════════════════════════════════
UPDATE skill_scores SET
  value_score = ROUND(
    0.35 * COALESCE(output_score, 5.0) +
    0.25 * COALESCE(reliability_score, 5.0) +
    0.15 * COALESCE(efficiency_score, 5.0) +
    0.15 * COALESCE(cost_score, 5.0) +
    0.10 * COALESCE(trust_score, 5.0),
    2
  ),
  overall_score = ROUND(
    (0.35 * COALESCE(output_score, 5.0) +
     0.25 * COALESCE(reliability_score, 5.0) +
     0.15 * COALESCE(efficiency_score, 5.0) +
     0.15 * COALESCE(cost_score, 5.0) +
     0.10 * COALESCE(trust_score, 5.0)) * 0.6 +
    COALESCE(adoption_score, 5.0) * 0.2 +
    COALESCE(freshness_score, 5.0) * 0.2,
    2
  ),
  updated_at = NOW();

-- ═══════════════════════════════════════════════
-- 3. Update recalculation pipeline to enforce cap
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
  v_max_score      NUMERIC := 9.80;  -- No perfect 10s
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

    -- Output score: direct average of quality ratings (already 0-10), capped
    v_output := LEAST(COALESCE(rec.avg_quality, 5.00), v_max_score);

    -- Reliability score: success rate mapped to 0-10, capped
    v_reliability := LEAST(ROUND((v_success_count::NUMERIC / v_total_count) * 10, 2), v_max_score);

    -- Efficiency score: latency-based tiers, capped at 9.5 for fastest tier
    v_avg_latency := COALESCE(rec.avg_latency, 5000);
    v_efficiency := CASE
      WHEN v_avg_latency <   500 THEN 9.50
      WHEN v_avg_latency <  1000 THEN 9.00
      WHEN v_avg_latency <  2000 THEN 8.00
      WHEN v_avg_latency <  5000 THEN 7.00
      WHEN v_avg_latency < 10000 THEN 6.00
      WHEN v_avg_latency < 30000 THEN 5.00
      WHEN v_avg_latency < 60000 THEN 4.00
      ELSE                              3.00
    END;

    -- Cost score: price-based tiers, capped at 9.5 for free
    v_avg_cost := COALESCE(rec.avg_cost, 0);
    v_cost := CASE
      WHEN v_avg_cost  = 0     THEN 9.50
      WHEN v_avg_cost  < 0.001 THEN 9.20
      WHEN v_avg_cost  < 0.005 THEN 8.80
      WHEN v_avg_cost  < 0.01  THEN 8.00
      WHEN v_avg_cost  < 0.05  THEN 7.00
      WHEN v_avg_cost  < 0.10  THEN 6.00
      WHEN v_avg_cost  < 0.50  THEN 5.00
      ELSE                           4.00
    END;

    -- Fetch existing scores for blending
    SELECT * INTO v_existing FROM skill_scores ss WHERE ss.skill_id = rec.sid;

    IF v_existing IS NOT NULL THEN
      -- Blend: 60% outcome-derived + 40% existing (preserves GitHub-derived trust etc.)
      v_output      := LEAST(ROUND(v_blend_new * v_output      + v_blend_old * COALESCE(v_existing.output_score,      v_output),      2), v_max_score);
      v_reliability := LEAST(ROUND(v_blend_new * v_reliability  + v_blend_old * COALESCE(v_existing.reliability_score, v_reliability),  2), v_max_score);
      v_efficiency  := LEAST(ROUND(v_blend_new * v_efficiency   + v_blend_old * COALESCE(v_existing.efficiency_score,  v_efficiency),   2), v_max_score);
      v_cost        := LEAST(ROUND(v_blend_new * v_cost         + v_blend_old * COALESCE(v_existing.cost_score,        v_cost),         2), v_max_score);
      v_trust       := LEAST(COALESCE(v_existing.trust_score, 5.00), v_max_score);
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
      '2.1-capped',
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
  'v2.1: Aggregates outcome_records into skill_scores. All dimensions capped at 9.8. No perfect 10s.';
