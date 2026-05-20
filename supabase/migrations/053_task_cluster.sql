-- Migration 053: Task clustering on model routing decisions
--
-- task_cluster is a short normalized label combining the resolved tier
-- with the top 2 active signal keys, e.g.
--   "cheap_chat"                              (no signals fired)
--   "fast_code:code_present+structured_output_needed"
-- It becomes the join key for getRoutingMemory(): "show me what model
-- this agent picked the last N times it routed a similar task."
--
-- Note: signals_json already exists on this table (migration 023). We
-- reuse it as the signal payload rather than adding a duplicate
-- task_signals column.

ALTER TABLE model_routing_decisions
  ADD COLUMN IF NOT EXISTS task_cluster TEXT;

-- Hot path: (agent, cluster) → recent decisions DESC.
CREATE INDEX IF NOT EXISTS idx_model_routing_decisions_agent_cluster
  ON model_routing_decisions(agent_identity_id, task_cluster, created_at DESC)
  WHERE agent_identity_id IS NOT NULL AND task_cluster IS NOT NULL;
