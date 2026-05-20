-- Migration 054: skill_routing_decisions log + RLS
--
-- Skill-side counterpart to model_routing_decisions (migration 053).
-- Every /api/route POST writes one row, fire-and-forget. Powers
-- getSkillRoutingMemory() — "what MCP server has this agent used most
-- recently for similar tasks?"
--
-- Tier 1 sensitive per migration 047 — service_role-only access.

CREATE TABLE IF NOT EXISTS skill_routing_decisions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_identity_id      UUID REFERENCES agent_identities(id) ON DELETE SET NULL,
  task_snippet           TEXT,
  task_hash              TEXT,
  task_cluster           TEXT,
  recommended_skill_id   UUID REFERENCES skills(id) ON DELETE SET NULL,
  recommended_skill_slug TEXT,
  approach               TEXT,   -- direct_llm | mcp_server | multi_tool
  confidence             NUMERIC(4,2),
  signals_json           JSONB,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skill_routing_decisions_agent_cluster
  ON skill_routing_decisions (agent_identity_id, task_cluster, created_at DESC)
  WHERE agent_identity_id IS NOT NULL AND task_cluster IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_skill_routing_decisions_created
  ON skill_routing_decisions (created_at DESC);

-- RLS: service_role full access, no anon/authenticated. Mirrors
-- model_routing_decisions in migration 047.
ALTER TABLE skill_routing_decisions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_054_service_role ON skill_routing_decisions;
CREATE POLICY rls_054_service_role ON skill_routing_decisions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
