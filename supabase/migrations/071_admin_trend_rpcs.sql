-- 071_admin_trend_rpcs.sql
-- Applied via Supabase (MCP) on 2026-06-12.
--
-- Read-only daily-aggregation RPCs backing the admin dashboard "Trends (30d)"
-- section (/api/admin/trends). date_trunc GROUP BY runs server-side so the
-- endpoint returns only daily buckets, not raw rows. No schema change.
--
-- (a) admin_daily_routing_decisions — count of model_routing_decisions per day
-- (b) admin_daily_verified_quality  — avg(verified_quality) per day
-- (c) admin_daily_semantic_rate     — % of skill routes resolved by the semantic
--     matcher (signals_json.match_method); forward-only — empty until the
--     match_method write (this batch's route.ts change) accumulates data.

CREATE OR REPLACE FUNCTION admin_daily_routing_decisions(p_days int DEFAULT 30)
RETURNS TABLE(day date, count bigint)
LANGUAGE sql STABLE AS $$
  SELECT date_trunc('day', created_at)::date, count(*)
  FROM model_routing_decisions
  WHERE created_at > now() - (p_days || ' days')::interval
  GROUP BY 1 ORDER BY 1;
$$;

CREATE OR REPLACE FUNCTION admin_daily_verified_quality(p_days int DEFAULT 30)
RETURNS TABLE(day date, avg numeric, n bigint)
LANGUAGE sql STABLE AS $$
  SELECT date_trunc('day', created_at)::date, round(avg(verified_quality), 2), count(*)
  FROM model_outcome_records
  WHERE verified_quality IS NOT NULL
    AND created_at > now() - (p_days || ' days')::interval
  GROUP BY 1 ORDER BY 1;
$$;

CREATE OR REPLACE FUNCTION admin_daily_semantic_rate(p_days int DEFAULT 30)
RETURNS TABLE(day date, semantic bigint, total bigint, pct numeric)
LANGUAGE sql STABLE AS $$
  SELECT date_trunc('day', created_at)::date,
         count(*) FILTER (WHERE signals_json->>'match_method' IN ('semantic_task','semantic_task_named_override')),
         count(*) FILTER (WHERE approach = 'mcp_server'),
         round(100.0 * count(*) FILTER (WHERE signals_json->>'match_method' IN ('semantic_task','semantic_task_named_override'))
               / NULLIF(count(*) FILTER (WHERE approach = 'mcp_server'), 0), 1)
  FROM skill_routing_decisions
  WHERE created_at > now() - (p_days || ' days')::interval
  GROUP BY 1 ORDER BY 1;
$$;
