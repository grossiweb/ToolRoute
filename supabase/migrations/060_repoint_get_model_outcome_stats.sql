-- 060_repoint_get_model_outcome_stats.sql
-- Applied manually via Supabase UI on: __________ (pending — fill in when run)
--
-- Companion to 059. The read/aggregation path was dead from the same
-- uuid-vs-slug mismatch: get_model_outcome_stats took uuid[] and grouped by the
-- uuid model_id, but its only caller (src/app/api/route/model/route.ts:192-198)
-- passes text slugs — the call failed coercion and was silently swallowed.
--
-- Repoint the RPC to read model_slug (text), forward-only. History is NOT
-- bridged: only 3 of the 219 legacy rows map to a current `models` row, so a
-- COALESCE bridge isn't worth the complexity. Stats repopulate as new telemetry
-- flows. The caller already passes/compares slugs, so no code change there.
--
-- APPLY LAST: after 059 and after the handler edits are deployed and writing
-- model_slug (otherwise this aggregates an empty column).

CREATE OR REPLACE FUNCTION public.get_model_outcome_stats(model_ids text[])
 RETURNS TABLE(model_id text, avg_quality numeric, success_rate numeric,
               sample_size integer, trust_weighted_quality numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    mor.model_slug AS model_id,

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

    -- Trust-weighted quality (unchanged from prior definition)
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
  WHERE mor.model_slug = ANY(model_ids)
    -- Exclude shadow reporters from sample entirely
    AND (ai.id IS NULL OR ai.trust_score >= 25.0 OR ai.trust_score IS NULL)
  GROUP BY mor.model_slug;
END;
$function$;
