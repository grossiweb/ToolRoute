-- 078_agent_identities_last_anomaly_check.sql
-- Applied via Supabase (MCP) on 2026-06-18.
--
-- Cache column for the integration-health / anomaly check. The telemetry
-- endpoints (/api/report/model, /api/report) embed integration_health only
-- when this timestamp is null or older than 6 hours, so the 30-day aggregate
-- RPC (agent_health_30d) runs at most once per agent per 6h on the hot path
-- instead of on every submission.
ALTER TABLE agent_identities
  ADD COLUMN IF NOT EXISTS last_anomaly_check_at timestamptz;
