-- 074_tier_cost_summary_rpc.sql
-- Applied via Supabase (MCP) on 2026-06-14.
--
-- Read-only RPC for the admin "Cost Savings Est." card. Counts routing decisions
-- per resolved_tier over the window. Driven by resolved_tier (≈100% coverage),
-- NOT recommended_model_slug (87% of 30d rows are legacy pre-2026-05-20 nulls,
-- before migration 061 populated the slug). The tier→model→price mapping lives in
-- src/lib/routing/tiers.ts (TIER_MAP), not the DB (models.tier is a different
-- taxonomy: budget/mid/flagship), so this RPC returns counts only and the
-- endpoint resolves prices.

CREATE OR REPLACE FUNCTION admin_tier_cost_summary(p_days int DEFAULT 30)
RETURNS TABLE(tier text, decisions bigint)
LANGUAGE sql STABLE AS $$
  SELECT resolved_tier, count(*)
  FROM model_routing_decisions
  WHERE created_at > now() - (p_days || ' days')::interval
    AND resolved_tier IS NOT NULL
  GROUP BY resolved_tier
  ORDER BY 2 DESC;
$$;
