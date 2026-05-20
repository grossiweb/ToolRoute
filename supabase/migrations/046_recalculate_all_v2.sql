-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 046: recalculate_all() v2 — TS-parity scoring
-- ─────────────────────────────────────────────────────────────────────────────
-- Replaces the simpler scoring function from migration 013 with the
-- trust-weighted, multi-component algorithm used by the TS fallback path
-- in src/app/api/cron/recalculate-scores/route.ts
-- (manualRecalculation → computeScoresFromOutcomes, now extracted to
-- src/lib/recalculate-scores.ts).
--
-- Per-skill gate:        minimum 3 outcome records
-- Per-(skill, bp) gate:  any pair with >= 1 record
-- Blend:                 60% new + 40% existing per component,
--                        then recompute value from blended components
--
-- Trust-weighted quality:
--     weight  = NULL → 1.0
--             < 25  → 0.0  (shadow reporter, excluded)
--             else  → trust_score / 50.0  (baseline = 1.0, max = 2.0)
--     twq     = Σ(quality × weight) / Σ(weight) on 0-10 scale
--     if Σ(weight) = 0: fall back to simple mean of non-null ratings
--     if no ratings at all: fall back to 0.5 (already on 0-1 scale)
--
-- Scoring formulas (must remain in sync with src/lib/recalculate-scores.ts):
--
--   output       = (0.35 * avg_completion
--                 + 0.25 * (twq / 10)
--                 + 0.20 * structured_valid_rate
--                 + 0.20 * (1 - correction_burden)) * 10
--
--   reliability  = (0.50 * success_or_partial_rate
--                 + 0.20 * (1 - min(avg_retries/5, 1))
--                 + 0.15 * latency_stability        — 1 - CV(latencies), default 0.7 if n<2
--                 + 0.15 * (1 - failure_volatility)) * 10
--
--   efficiency   piecewise linear on p50 latency (default 5.0 if no latencies):
--                    <= 1000 ms:  9 + (1 - p50/1000)
--                    <= 5000 ms:  7 + 2*(1 - (p50-1000)/4000)
--                    <= 30000 ms: 4 + 3*(1 - (p50-5000)/25000)
--                    else:        max(1.0, 4*(1 - (p50-30000)/60000))
--
--   cost         piecewise linear on mean cost (default 7.0 if no costs):
--                    = 0:         10
--                    <= 0.01:     9 + (1 - cost/0.01)
--                    <= 0.10:     7 + 2*(1 - (cost-0.01)/0.09)
--                    <= 1.00:     4 + 3*(1 - (cost-0.10)/0.90)
--                    else:        max(1.0, 4*(1 - (cost-1.0)/10.0))
--
--   trust        = max((1 - 0.5*human_correction_rate - 0.3*fallback_rate) * 10, 1.0)
--                  (i.e. inner value floored at 0.1, output floored at 1.0 on 0-10 scale)
--
--   value        = 0.35*output + 0.25*reliability + 0.15*efficiency
--                + 0.15*cost   + 0.10*trust
--
-- All component scores clamped to [0, 10] before blending.
-- Rollup field success_rate is success-only (NOT including partial_success);
-- the reliability formula above uses success-or-partial.
-- ─────────────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS recalculate_all();

CREATE FUNCTION recalculate_all() RETURNS JSON AS $$
DECLARE
  v_started_at TIMESTAMP := NOW();
  v_skills_updated  INT := 0;
  v_rollups_updated INT := 0;
  v_total_records   INT;
  v_skills_skipped  INT;
  rec     RECORD;
  bp_rec  RECORD;
  v_existing RECORD;
BEGIN
  SELECT COUNT(*) INTO v_total_records FROM outcome_records;
  SELECT COUNT(*) INTO v_skills_skipped
    FROM (SELECT skill_id FROM outcome_records GROUP BY skill_id HAVING COUNT(*) < 3) sub;

  FOR rec IN
    WITH skill_rows AS (
      SELECT
        o.skill_id,
        o.outcome_status,
        o.output_quality_rating,
        o.structured_output_valid,
        o.human_correction_required,
        COALESCE(o.human_correction_minutes, 0)::NUMERIC AS hc_min,
        o.latency_ms,
        o.estimated_cost_usd,
        COALESCE(o.retries, 0) AS retries,
        o.fallback_used_skill_id,
        CASE
          WHEN ai.trust_score IS NULL        THEN 1.0
          WHEN ai.trust_score < 25.0         THEN 0.0
          ELSE ai.trust_score / 50.0
        END AS w
      FROM outcome_records o
      LEFT JOIN agent_identities ai ON ai.id = o.agent_identity_id
    ),
    qualifying AS (
      SELECT skill_id FROM skill_rows GROUP BY skill_id HAVING COUNT(*) >= 3
    )
    SELECT
      sr.skill_id,
      COUNT(*) AS n,
      AVG(CASE
        WHEN sr.outcome_status = 'success'         THEN 1.0
        WHEN sr.outcome_status = 'partial_success' THEN 0.6
        WHEN sr.outcome_status = 'failure'         THEN 0.1
        WHEN sr.outcome_status = 'aborted'         THEN 0.0
        ELSE 0.5
      END) AS avg_completion,
      SUM(CASE WHEN sr.output_quality_rating IS NOT NULL AND sr.w > 0
        THEN sr.output_quality_rating * sr.w ELSE 0 END) AS twq_sum,
      SUM(CASE WHEN sr.output_quality_rating IS NOT NULL AND sr.w > 0
        THEN sr.w ELSE 0 END) AS twq_w,
      AVG(sr.output_quality_rating) FILTER (WHERE sr.output_quality_rating IS NOT NULL) AS quality_mean,
      (COUNT(*) FILTER (WHERE sr.structured_output_valid = true))::NUMERIC / COUNT(*) AS struct_rate,
      AVG(sr.hc_min) AS avg_hc_min,
      (COUNT(*) FILTER (WHERE sr.outcome_status IN ('success', 'partial_success')))::NUMERIC / COUNT(*) AS success_or_partial,
      AVG(sr.retries::NUMERIC) AS avg_retries,
      (COUNT(*) FILTER (WHERE sr.outcome_status IN ('failure', 'aborted')))::NUMERIC / COUNT(*) AS failure_vol,
      (COUNT(*) FILTER (WHERE sr.human_correction_required = true))::NUMERIC / COUNT(*) AS hc_rate,
      (COUNT(*) FILTER (WHERE sr.fallback_used_skill_id IS NOT NULL))::NUMERIC / COUNT(*) AS fb_rate,
      ARRAY_AGG(sr.latency_ms ORDER BY sr.latency_ms) FILTER (WHERE sr.latency_ms IS NOT NULL) AS lats,
      ARRAY_AGG(sr.estimated_cost_usd) FILTER (WHERE sr.estimated_cost_usd IS NOT NULL) AS costs
    FROM skill_rows sr
    WHERE sr.skill_id IN (SELECT skill_id FROM qualifying)
    GROUP BY sr.skill_id
  LOOP
    DECLARE
      q       NUMERIC;
      cb      NUMERIC;
      rr      NUMERIC;
      ls      NUMERIC;
      lat_n   INT;
      lat_mn  NUMERIC;
      p50     NUMERIC;
      cost_n  INT;
      avg_c   NUMERIC;
      out_s   NUMERIC;
      rel_s   NUMERIC;
      eff_s   NUMERIC;
      cst_s   NUMERIC;
      tru_s   NUMERIC;
      b_out   NUMERIC;
      b_rel   NUMERIC;
      b_eff   NUMERIC;
      b_cst   NUMERIC;
      b_tru   NUMERIC;
      b_val   NUMERIC;
    BEGIN
      -- Quality on 0-1 scale: twq fallback chain
      q := CASE
        WHEN rec.twq_w > 0                  THEN (rec.twq_sum / rec.twq_w) / 10.0
        WHEN rec.quality_mean IS NOT NULL   THEN rec.quality_mean / 10.0
        ELSE 0.5
      END;
      cb := LEAST(rec.avg_hc_min / 60.0, 1.0);
      out_s := (0.35 * rec.avg_completion + 0.25 * q + 0.20 * rec.struct_rate + 0.20 * (1.0 - cb)) * 10.0;

      -- Reliability
      rr := LEAST(rec.avg_retries / 5.0, 1.0);
      lat_n := COALESCE(array_length(rec.lats, 1), 0);
      IF lat_n >= 2 THEN
        SELECT AVG(l)::NUMERIC INTO lat_mn FROM unnest(rec.lats) l;
        IF lat_mn > 0 THEN
          SELECT GREATEST(1.0 - (stddev_pop(l) / lat_mn), 0.0)::NUMERIC INTO ls FROM unnest(rec.lats) l;
        ELSE
          ls := 0.7;
        END IF;
      ELSE
        ls := 0.7;
      END IF;
      rel_s := (0.50 * rec.success_or_partial + 0.20 * (1.0 - rr) + 0.15 * ls + 0.15 * (1.0 - rec.failure_vol)) * 10.0;

      -- Efficiency on p50 (default 5.0 when no latencies)
      IF lat_n > 0 THEN
        -- JS floor(n*0.5) is 0-indexed → PG 1-indexed equivalent is FLOOR(n*0.5)::INT + 1
        p50 := rec.lats[FLOOR(lat_n * 0.5)::INT + 1];
        eff_s := CASE
          WHEN p50 <= 1000  THEN 9.0 + (1.0 - p50 / 1000.0)
          WHEN p50 <= 5000  THEN 7.0 + 2.0 * (1.0 - (p50 - 1000) / 4000.0)
          WHEN p50 <= 30000 THEN 4.0 + 3.0 * (1.0 - (p50 - 5000) / 25000.0)
          ELSE GREATEST(1.0, 4.0 * (1.0 - (p50 - 30000) / 60000.0))
        END;
      ELSE
        eff_s := 5.0;
      END IF;

      -- Cost on mean cost (default 7.0 when no costs)
      cost_n := COALESCE(array_length(rec.costs, 1), 0);
      IF cost_n > 0 THEN
        SELECT AVG(c)::NUMERIC INTO avg_c FROM unnest(rec.costs) c;
        cst_s := CASE
          WHEN avg_c <= 0     THEN 10.0
          WHEN avg_c <= 0.01  THEN 9.0 + (1.0 - avg_c / 0.01)
          WHEN avg_c <= 0.10  THEN 7.0 + 2.0 * (1.0 - (avg_c - 0.01) / 0.09)
          WHEN avg_c <= 1.0   THEN 4.0 + 3.0 * (1.0 - (avg_c - 0.10) / 0.90)
          ELSE GREATEST(1.0, 4.0 * (1.0 - (avg_c - 1.0) / 10.0))
        END;
      ELSE
        cst_s := 7.0;
      END IF;

      -- Trust (floor 1.0 on 0-10)
      tru_s := GREATEST((1.0 - rec.hc_rate * 0.5 - rec.fb_rate * 0.3) * 10.0, 1.0);

      -- Clamp components 0-10
      out_s := GREATEST(0, LEAST(10, out_s));
      rel_s := GREATEST(0, LEAST(10, rel_s));
      eff_s := GREATEST(0, LEAST(10, eff_s));
      cst_s := GREATEST(0, LEAST(10, cst_s));
      tru_s := GREATEST(0, LEAST(10, tru_s));

      -- Blend 60/40 against existing skill_scores (per-component, NULL existing → use new)
      SELECT * INTO v_existing FROM skill_scores WHERE skill_id = rec.skill_id;
      IF FOUND THEN
        b_out := 0.6 * out_s + 0.4 * COALESCE(v_existing.output_score::NUMERIC,      out_s);
        b_rel := 0.6 * rel_s + 0.4 * COALESCE(v_existing.reliability_score::NUMERIC, rel_s);
        b_eff := 0.6 * eff_s + 0.4 * COALESCE(v_existing.efficiency_score::NUMERIC,  eff_s);
        b_cst := 0.6 * cst_s + 0.4 * COALESCE(v_existing.cost_score::NUMERIC,        cst_s);
        b_tru := 0.6 * tru_s + 0.4 * COALESCE(v_existing.trust_score::NUMERIC,       tru_s);
      ELSE
        b_out := out_s; b_rel := rel_s; b_eff := eff_s; b_cst := cst_s; b_tru := tru_s;
      END IF;
      b_val := 0.35 * b_out + 0.25 * b_rel + 0.15 * b_eff + 0.15 * b_cst + 0.10 * b_tru;
      b_val := GREATEST(0, LEAST(10, b_val));

      INSERT INTO skill_scores (
        skill_id, output_score, reliability_score, efficiency_score, cost_score,
        trust_score, value_score, overall_score, score_version, updated_at
      ) VALUES (
        rec.skill_id,
        ROUND(b_out, 2), ROUND(b_rel, 2), ROUND(b_eff, 2), ROUND(b_cst, 2),
        ROUND(b_tru, 2), ROUND(b_val, 2), ROUND(b_val, 2),
        '2.0-ts-parity', NOW()
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

      v_skills_updated := v_skills_updated + 1;
    END;

    -- Per-(skill, benchmark_profile) rollups, any record count >= 1
    FOR bp_rec IN
      WITH bp_rows AS (
        SELECT
          o.benchmark_profile_id,
          o.outcome_status,
          o.output_quality_rating,
          o.structured_output_valid,
          o.human_correction_required,
          COALESCE(o.human_correction_minutes, 0)::NUMERIC AS hc_min,
          o.latency_ms,
          o.estimated_cost_usd                            AS cost_raw,
          COALESCE(o.estimated_cost_usd, 0)::NUMERIC      AS cost_or_zero,
          COALESCE(o.retries, 0) AS retries,
          o.fallback_used_skill_id,
          CASE
            WHEN ai.trust_score IS NULL  THEN 1.0
            WHEN ai.trust_score < 25.0   THEN 0.0
            ELSE ai.trust_score / 50.0
          END AS w
        FROM outcome_records o
        LEFT JOIN agent_identities ai ON ai.id = o.agent_identity_id
        WHERE o.skill_id = rec.skill_id
          AND o.benchmark_profile_id IS NOT NULL
      )
      SELECT
        benchmark_profile_id,
        COUNT(*) AS bp_n,
        AVG(CASE
          WHEN outcome_status = 'success'         THEN 1.0
          WHEN outcome_status = 'partial_success' THEN 0.6
          WHEN outcome_status = 'failure'         THEN 0.1
          WHEN outcome_status = 'aborted'         THEN 0.0
          ELSE 0.5
        END) AS bp_avg_completion,
        SUM(CASE WHEN output_quality_rating IS NOT NULL AND w > 0
          THEN output_quality_rating * w ELSE 0 END) AS bp_twq_sum,
        SUM(CASE WHEN output_quality_rating IS NOT NULL AND w > 0
          THEN w ELSE 0 END) AS bp_twq_w,
        AVG(output_quality_rating) FILTER (WHERE output_quality_rating IS NOT NULL) AS bp_quality_mean,
        (COUNT(*) FILTER (WHERE structured_output_valid = true))::NUMERIC / COUNT(*) AS bp_struct_rate,
        AVG(hc_min) AS bp_avg_hc_min,
        (COUNT(*) FILTER (WHERE outcome_status IN ('success', 'partial_success')))::NUMERIC / COUNT(*) AS bp_success_or_partial,
        AVG(retries::NUMERIC) AS bp_avg_retries,
        (COUNT(*) FILTER (WHERE outcome_status IN ('failure', 'aborted')))::NUMERIC / COUNT(*) AS bp_failure_vol,
        (COUNT(*) FILTER (WHERE human_correction_required = true))::NUMERIC / COUNT(*) AS bp_hc_rate,
        (COUNT(*) FILTER (WHERE fallback_used_skill_id IS NOT NULL))::NUMERIC / COUNT(*) AS bp_fb_rate,
        ARRAY_AGG(latency_ms ORDER BY latency_ms) FILTER (WHERE latency_ms IS NOT NULL) AS bp_lats,
        ARRAY_AGG(cost_raw) FILTER (WHERE cost_raw IS NOT NULL) AS bp_costs,
        SUM(cost_or_zero) AS bp_total_cost,
        (COUNT(*) FILTER (WHERE outcome_status = 'success'))::INT AS bp_success_only_count
      FROM bp_rows
      GROUP BY benchmark_profile_id
    LOOP
      DECLARE
        bp_q       NUMERIC;
        bp_cb      NUMERIC;
        bp_rr      NUMERIC;
        bp_ls      NUMERIC;
        bp_lat_n   INT;
        bp_lat_mn  NUMERIC;
        bp_p50     NUMERIC;
        bp_cost_n  INT;
        bp_avg_c   NUMERIC;
        bp_out     NUMERIC;
        bp_rel     NUMERIC;
        bp_eff     NUMERIC;
        bp_cst     NUMERIC;
        bp_tru     NUMERIC;
        bp_val     NUMERIC;
        bp_cpu     NUMERIC;
      BEGIN
        bp_q := CASE
          WHEN bp_rec.bp_twq_w > 0                  THEN (bp_rec.bp_twq_sum / bp_rec.bp_twq_w) / 10.0
          WHEN bp_rec.bp_quality_mean IS NOT NULL   THEN bp_rec.bp_quality_mean / 10.0
          ELSE 0.5
        END;
        bp_cb := LEAST(bp_rec.bp_avg_hc_min / 60.0, 1.0);
        bp_out := (0.35 * bp_rec.bp_avg_completion + 0.25 * bp_q + 0.20 * bp_rec.bp_struct_rate + 0.20 * (1.0 - bp_cb)) * 10.0;

        bp_rr := LEAST(bp_rec.bp_avg_retries / 5.0, 1.0);
        bp_lat_n := COALESCE(array_length(bp_rec.bp_lats, 1), 0);
        IF bp_lat_n >= 2 THEN
          SELECT AVG(l)::NUMERIC INTO bp_lat_mn FROM unnest(bp_rec.bp_lats) l;
          IF bp_lat_mn > 0 THEN
            SELECT GREATEST(1.0 - (stddev_pop(l) / bp_lat_mn), 0.0)::NUMERIC INTO bp_ls FROM unnest(bp_rec.bp_lats) l;
          ELSE
            bp_ls := 0.7;
          END IF;
        ELSE
          bp_ls := 0.7;
        END IF;
        bp_rel := (0.50 * bp_rec.bp_success_or_partial + 0.20 * (1.0 - bp_rr) + 0.15 * bp_ls + 0.15 * (1.0 - bp_rec.bp_failure_vol)) * 10.0;

        IF bp_lat_n > 0 THEN
          bp_p50 := bp_rec.bp_lats[FLOOR(bp_lat_n * 0.5)::INT + 1];
          bp_eff := CASE
            WHEN bp_p50 <= 1000  THEN 9.0 + (1.0 - bp_p50 / 1000.0)
            WHEN bp_p50 <= 5000  THEN 7.0 + 2.0 * (1.0 - (bp_p50 - 1000) / 4000.0)
            WHEN bp_p50 <= 30000 THEN 4.0 + 3.0 * (1.0 - (bp_p50 - 5000) / 25000.0)
            ELSE GREATEST(1.0, 4.0 * (1.0 - (bp_p50 - 30000) / 60000.0))
          END;
        ELSE
          bp_eff := 5.0;
        END IF;

        bp_cost_n := COALESCE(array_length(bp_rec.bp_costs, 1), 0);
        IF bp_cost_n > 0 THEN
          SELECT AVG(c)::NUMERIC INTO bp_avg_c FROM unnest(bp_rec.bp_costs) c;
          bp_cst := CASE
            WHEN bp_avg_c <= 0     THEN 10.0
            WHEN bp_avg_c <= 0.01  THEN 9.0 + (1.0 - bp_avg_c / 0.01)
            WHEN bp_avg_c <= 0.10  THEN 7.0 + 2.0 * (1.0 - (bp_avg_c - 0.01) / 0.09)
            WHEN bp_avg_c <= 1.0   THEN 4.0 + 3.0 * (1.0 - (bp_avg_c - 0.10) / 0.90)
            ELSE GREATEST(1.0, 4.0 * (1.0 - (bp_avg_c - 1.0) / 10.0))
          END;
        ELSE
          bp_cst := 7.0;
        END IF;

        bp_tru := GREATEST((1.0 - bp_rec.bp_hc_rate * 0.5 - bp_rec.bp_fb_rate * 0.3) * 10.0, 1.0);

        bp_out := GREATEST(0, LEAST(10, bp_out));
        bp_rel := GREATEST(0, LEAST(10, bp_rel));
        bp_eff := GREATEST(0, LEAST(10, bp_eff));
        bp_cst := GREATEST(0, LEAST(10, bp_cst));
        bp_tru := GREATEST(0, LEAST(10, bp_tru));
        bp_val := 0.35 * bp_out + 0.25 * bp_rel + 0.15 * bp_eff + 0.15 * bp_cst + 0.10 * bp_tru;
        bp_val := GREATEST(0, LEAST(10, bp_val));

        -- cost_per_useful_outcome_usd = total cost (incl. failures) / success-only count
        bp_cpu := CASE
          WHEN bp_rec.bp_success_only_count > 0
            THEN ROUND(bp_rec.bp_total_cost / bp_rec.bp_success_only_count, 4)
          ELSE NULL
        END;

        INSERT INTO skill_benchmark_rollups (
          skill_id, benchmark_profile_id, sample_size,
          avg_quality_score, avg_reliability_score, avg_efficiency_score,
          avg_cost_score, avg_trust_score, avg_value_score,
          cost_per_useful_outcome_usd, avg_human_correction_minutes,
          fallback_rate, success_rate, last_updated_at
        ) VALUES (
          rec.skill_id, bp_rec.benchmark_profile_id, bp_rec.bp_n,
          ROUND(bp_out, 2), ROUND(bp_rel, 2), ROUND(bp_eff, 2),
          ROUND(bp_cst, 2), ROUND(bp_tru, 2), ROUND(bp_val, 2),
          bp_cpu,
          ROUND(bp_rec.bp_avg_hc_min, 2),
          ROUND(bp_rec.bp_fb_rate, 4),
          ROUND(bp_rec.bp_success_only_count::NUMERIC / bp_rec.bp_n, 4),
          NOW()
        )
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
          last_updated_at              = NOW();

        v_rollups_updated := v_rollups_updated + 1;
      END;
    END LOOP;
  END LOOP;

  RETURN json_build_object(
    'status',                          'complete',
    'skills_updated',                  v_skills_updated,
    'rollups_updated',                 v_rollups_updated,
    'total_records_processed',         v_total_records,
    'skills_skipped_insufficient_data', v_skills_skipped,
    'duration_ms',                     EXTRACT(MILLISECOND FROM (NOW() - v_started_at)),
    'started_at',                      v_started_at,
    'completed_at',                    NOW(),
    'score_version',                   '2.0-ts-parity'
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION recalculate_all() IS
  'v2: trust-weighted multi-component scoring matching TS manualRecalculation() in src/app/api/cron/recalculate-scores/route.ts. Replaces the simpler scoring from migration 013. Requires >= 3 outcome records per skill, blends 60% new / 40% existing per component.';
