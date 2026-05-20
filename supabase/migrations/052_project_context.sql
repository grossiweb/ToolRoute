-- Migration 052: Agent project context
--
-- Optional project fingerprint declared at registration. Stored as JSONB
-- so the keys can evolve (framework, language, project_type, stack_tags,
-- and future additions like deployment_target, llm_budget_tier, etc).
-- Default '{}' keeps every existing row valid.
--
-- A GIN index supports future filters like:
--   WHERE project_context @> '{"language":"typescript"}'

ALTER TABLE agent_identities
  ADD COLUMN IF NOT EXISTS project_context JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_agent_identities_project_context_gin
  ON agent_identities USING gin (project_context jsonb_path_ops);
