-- 079_agent_health_30d_rpc.sql
-- Applied via Supabase (MCP) on 2026-06-18.
--
-- Single-round-trip 30-day activity aggregate for an agent. Powers
-- GET /api/agent/status and the integration_health embed in the telemetry
-- responses. Unions both routing tables (model_ + skill_) and both outcome
-- tables (model_outcome_records + outcome_records) so counts reflect total
-- agent activity regardless of which path produced it. STABLE, read-only.
CREATE OR REPLACE FUNCTION agent_health_30d(p_agent_id uuid)
RETURNS TABLE (
  routing_decisions bigint,
  outcomes_reported bigint,
  contributions_accepted bigint,
  avg_verified_quality numeric,
  success_count bigint,
  outcome_total bigint,
  distinct_quality_values bigint,
  last_activity_at timestamptz
) LANGUAGE sql STABLE AS $$
  WITH outc AS (
    SELECT outcome_status, output_quality_rating, verified_quality, created_at
      FROM model_outcome_records
      WHERE agent_identity_id = p_agent_id AND created_at > now() - interval '30 days'
    UNION ALL
    SELECT outcome_status, output_quality_rating, verified_quality, created_at
      FROM outcome_records
      WHERE agent_identity_id = p_agent_id AND created_at > now() - interval '30 days'
  ),
  rd AS (
    SELECT created_at FROM model_routing_decisions
      WHERE agent_identity_id = p_agent_id AND created_at > now() - interval '30 days'
    UNION ALL
    SELECT created_at FROM skill_routing_decisions
      WHERE agent_identity_id = p_agent_id AND created_at > now() - interval '30 days'
  ),
  ce AS (
    SELECT created_at, accepted FROM contribution_events
      WHERE agent_identity_id = p_agent_id AND created_at > now() - interval '30 days'
  )
  SELECT
    (SELECT COUNT(*) FROM rd),
    (SELECT COUNT(*) FROM outc),
    (SELECT COUNT(*) FROM ce WHERE accepted),
    (SELECT ROUND(AVG(verified_quality), 2) FROM outc WHERE verified_quality IS NOT NULL),
    (SELECT COUNT(*) FILTER (WHERE outcome_status = 'success') FROM outc),
    (SELECT COUNT(*) FROM outc),
    (SELECT COUNT(DISTINCT output_quality_rating) FROM outc WHERE output_quality_rating IS NOT NULL),
    (SELECT GREATEST(
       COALESCE((SELECT MAX(created_at) FROM outc), 'epoch'),
       COALESCE((SELECT MAX(created_at) FROM rd), 'epoch'),
       COALESCE((SELECT MAX(created_at) FROM ce), 'epoch')));
$$;
