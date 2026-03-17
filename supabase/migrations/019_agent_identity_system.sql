-- ToolRoute Migration 019: Agent Identity System
-- Adds RPC function for updating agent stats, credit balance view,
-- and indexes for agent lookup performance.

-- ─────────────────────────────────────────────
-- View: agent_credit_balances
-- Aggregates reward_ledgers per agent for quick balance lookups
-- ─────────────────────────────────────────────

CREATE OR REPLACE VIEW agent_credit_balances AS
SELECT
  ai.id AS agent_identity_id,
  ai.agent_name,
  ai.trust_tier,
  ai.is_active,
  COALESCE(SUM(rl.routing_credits), 0)::INT AS total_routing_credits,
  COALESCE(SUM(rl.economic_credits_usd), 0)::NUMERIC(10,4) AS total_economic_credits_usd,
  COALESCE(SUM(rl.reputation_points), 0)::INT AS total_reputation_points,
  COUNT(rl.id)::INT AS total_contributions
FROM agent_identities ai
LEFT JOIN reward_ledgers rl ON rl.agent_identity_id = ai.id
GROUP BY ai.id, ai.agent_name, ai.trust_tier, ai.is_active;

-- ─────────────────────────────────────────────
-- RPC: update_agent_stats
-- Called after telemetry is accepted to update agent credit totals
-- and auto-promote trust tier based on reputation
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_agent_stats(
  p_agent_id UUID,
  p_credits_delta INT,
  p_rep_delta INT
) RETURNS VOID AS $$
DECLARE
  v_total_rep INT;
  v_new_tier TEXT;
BEGIN
  -- Get current reputation total from ledger
  SELECT COALESCE(SUM(reputation_points), 0) INTO v_total_rep
  FROM reward_ledgers
  WHERE agent_identity_id = p_agent_id;

  v_total_rep := v_total_rep + p_rep_delta;

  -- Auto-promote trust tier based on accumulated reputation
  v_new_tier := CASE
    WHEN v_total_rep >= 1000 THEN 'production'
    WHEN v_total_rep >= 250  THEN 'trusted'
    WHEN v_total_rep >= 50   THEN 'baseline'
    ELSE 'unverified'
  END;

  -- Only upgrade, never downgrade automatically
  UPDATE agent_identities
  SET trust_tier = v_new_tier
  WHERE id = p_agent_id
    AND CASE trust_tier
      WHEN 'enterprise' THEN 5
      WHEN 'production' THEN 4
      WHEN 'trusted' THEN 3
      WHEN 'baseline' THEN 2
      WHEN 'unverified' THEN 1
      ELSE 0
    END < CASE v_new_tier
      WHEN 'enterprise' THEN 5
      WHEN 'production' THEN 4
      WHEN 'trusted' THEN 3
      WHEN 'baseline' THEN 2
      WHEN 'unverified' THEN 1
      ELSE 0
    END;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────
-- RPC: get_agent_leaderboard
-- Returns top agents by reputation points
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_agent_leaderboard(p_limit INT DEFAULT 25)
RETURNS TABLE (
  agent_identity_id UUID,
  agent_name TEXT,
  trust_tier TEXT,
  total_routing_credits BIGINT,
  total_reputation_points BIGINT,
  total_contributions BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ai.id,
    ai.agent_name,
    ai.trust_tier,
    COALESCE(SUM(rl.routing_credits), 0) AS total_routing_credits,
    COALESCE(SUM(rl.reputation_points), 0) AS total_reputation_points,
    COUNT(rl.id) AS total_contributions
  FROM agent_identities ai
  LEFT JOIN reward_ledgers rl ON rl.agent_identity_id = ai.id
  WHERE ai.is_active = true
  GROUP BY ai.id, ai.agent_name, ai.trust_tier
  ORDER BY total_reputation_points DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────
-- Indexes for agent lookup performance
-- ─────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_agent_identities_name ON agent_identities(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_identities_host ON agent_identities(host_client_slug);
CREATE INDEX IF NOT EXISTS idx_reward_ledgers_agent ON reward_ledgers(agent_identity_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_agent ON agent_runs(agent_identity_id);
