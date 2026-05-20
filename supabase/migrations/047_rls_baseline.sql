-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 047: Baseline RLS — Tier 1 sensitive, Tier 2 catalog
-- ─────────────────────────────────────────────────────────────────────────────
-- Audit source: all migration files in supabase/migrations/ as of 2026-05-20.
-- Existing RLS coverage in migrations: only `verification_requests` (029) —
-- not touched here.
--
-- The production DB state may diverge from migration source (Supabase dashboard
-- toggles leave no migration trail), so every statement here is written
-- defensively:
--   - ALTER TABLE ... ENABLE ROW LEVEL SECURITY is idempotent in Postgres
--     (running it on an already-enabled table is a no-op).
--   - CREATE POLICY IF NOT EXISTS is NOT supported by any Postgres version.
--     We use DROP POLICY IF EXISTS ... ; CREATE POLICY ... instead — equivalent
--     in effect and safe to re-run.
--
-- API context: production routes use SUPABASE_SERVICE_ROLE_KEY server-side,
-- which bypasses RLS. The exposure RLS closes here is direct PostgREST access
-- via the anon/publishable key.
--
-- ─── Tier 1 — 21 sensitive tables ───────────────────────────────────────────
-- Policy applied: service_role full access only. No anon/authenticated access.
--
--   Table                       Why sensitive
--   --------------------------  --------------------------------------------------
--   agent_identities            agent PII (names, owner emails, public keys, trust scores)
--   contributors                human/org identities tied to agents
--   agent_runs                  per-run telemetry incl. agent_identity_id
--   outcome_records             raw outcomes, latency, cost, agent-linked
--   outcome_scores              derived per-record scoring
--   contribution_events         source of truth for the credit economy
--   contribution_scores         computed credit/reputation values
--   reward_ledgers              the credit ledger
--   contributor_reputation      aggregated reputation, influences routing weight
--   telemetry_events            free-form telemetry payloads
--   telemetry_aggregates        per-agent rollups
--   telemetry_rate_tracking     per-agent rate-limit state
--   benchmark_reports           mission submission payloads
--   mission_claims              active claims per agent
--   agent_leaderboard           per-agent ranking
--   agent_global_stats          per-agent stats
--   challenge_submissions       submitted deliverables, scores, agent-linked
--   model_outcome_records       model outcomes with signed commitments (039)
--   model_routing_decisions     task snippets, agent activity log
--   agent_gaming_flags          anti-fraud flags (exposure reveals detection logic)
--   trust_score_events          trust-score deltas per agent
--
-- ─── Tier 2 — 46 catalog tables ─────────────────────────────────────────────
-- Policy applied: service_role full access AND anon/authenticated SELECT-only.
-- No INSERT/UPDATE/DELETE for non-service-role.
--
--   Core taxonomy (001):
--     skills, skill_versions, capabilities, workflows, verticals,
--     functional_roles, auth_modes, install_methods, transport_types,
--     clients, risk_flags
--   Skill junction tables (001):
--     skill_capabilities, skill_workflows, skill_verticals, skill_roles,
--     skill_auth_modes, skill_install_methods, skill_transport_types,
--     skill_clients, skill_risk_flags
--   Skill metadata (001):
--     skill_metrics, skill_scores, skill_cost_models, skill_benchmark_rollups
--   Combinations / pages (001):
--     combinations, combination_skills, combination_verticals, skill_edges,
--     quotes, vertical_pages
--   Benchmark catalog (001):
--     benchmark_profiles, benchmark_metrics
--   Olympics / missions (003):
--     olympic_events, olympic_event_competitors, benchmark_missions
--   Tasks / tool types (008):
--     tool_types, tasks, skill_tool_types, skill_tasks, task_workflows
--   Challenges (021):
--     workflow_challenges
--   Model routing (023):
--     model_registry, model_aliases
--   Model catalog (043):
--     models, model_pricing_history, model_refresh_runs
--
-- ─── Skipped — already covered ──────────────────────────────────────────────
--   verification_requests (029) — RLS already enabled with explicit policies.
--
-- Policy naming: rls_047_service_role / rls_047_public_read — prefix tags
-- ownership to this migration so future cleanup is grep-friendly.
-- ─────────────────────────────────────────────────────────────────────────────


-- ═══════════════════════════════════════════════════════════════════════════
-- TIER 1 — 21 sensitive tables (service_role only)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE agent_identities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON agent_identities;
CREATE POLICY rls_047_service_role ON agent_identities
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE contributors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON contributors;
CREATE POLICY rls_047_service_role ON contributors
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON agent_runs;
CREATE POLICY rls_047_service_role ON agent_runs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE outcome_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON outcome_records;
CREATE POLICY rls_047_service_role ON outcome_records
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE outcome_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON outcome_scores;
CREATE POLICY rls_047_service_role ON outcome_scores
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE contribution_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON contribution_events;
CREATE POLICY rls_047_service_role ON contribution_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE contribution_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON contribution_scores;
CREATE POLICY rls_047_service_role ON contribution_scores
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE reward_ledgers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON reward_ledgers;
CREATE POLICY rls_047_service_role ON reward_ledgers
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE contributor_reputation ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON contributor_reputation;
CREATE POLICY rls_047_service_role ON contributor_reputation
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE telemetry_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON telemetry_events;
CREATE POLICY rls_047_service_role ON telemetry_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE telemetry_aggregates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON telemetry_aggregates;
CREATE POLICY rls_047_service_role ON telemetry_aggregates
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE telemetry_rate_tracking ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON telemetry_rate_tracking;
CREATE POLICY rls_047_service_role ON telemetry_rate_tracking
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE benchmark_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON benchmark_reports;
CREATE POLICY rls_047_service_role ON benchmark_reports
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE mission_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON mission_claims;
CREATE POLICY rls_047_service_role ON mission_claims
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE agent_leaderboard ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON agent_leaderboard;
CREATE POLICY rls_047_service_role ON agent_leaderboard
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE agent_global_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON agent_global_stats;
CREATE POLICY rls_047_service_role ON agent_global_stats
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE challenge_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON challenge_submissions;
CREATE POLICY rls_047_service_role ON challenge_submissions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE model_outcome_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON model_outcome_records;
CREATE POLICY rls_047_service_role ON model_outcome_records
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE model_routing_decisions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON model_routing_decisions;
CREATE POLICY rls_047_service_role ON model_routing_decisions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE agent_gaming_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON agent_gaming_flags;
CREATE POLICY rls_047_service_role ON agent_gaming_flags
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE trust_score_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON trust_score_events;
CREATE POLICY rls_047_service_role ON trust_score_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ═══════════════════════════════════════════════════════════════════════════
-- TIER 2 — 46 catalog tables (service_role + public SELECT)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Core taxonomy (001) ─────────────────────────────────────────────────────

ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON skills;
CREATE POLICY rls_047_service_role ON skills
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rls_047_public_read ON skills;
CREATE POLICY rls_047_public_read ON skills
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE skill_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON skill_versions;
CREATE POLICY rls_047_service_role ON skill_versions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rls_047_public_read ON skill_versions;
CREATE POLICY rls_047_public_read ON skill_versions
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE capabilities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON capabilities;
CREATE POLICY rls_047_service_role ON capabilities
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rls_047_public_read ON capabilities;
CREATE POLICY rls_047_public_read ON capabilities
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON workflows;
CREATE POLICY rls_047_service_role ON workflows
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rls_047_public_read ON workflows;
CREATE POLICY rls_047_public_read ON workflows
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE verticals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON verticals;
CREATE POLICY rls_047_service_role ON verticals
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rls_047_public_read ON verticals;
CREATE POLICY rls_047_public_read ON verticals
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE functional_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON functional_roles;
CREATE POLICY rls_047_service_role ON functional_roles
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rls_047_public_read ON functional_roles;
CREATE POLICY rls_047_public_read ON functional_roles
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE auth_modes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON auth_modes;
CREATE POLICY rls_047_service_role ON auth_modes
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rls_047_public_read ON auth_modes;
CREATE POLICY rls_047_public_read ON auth_modes
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE install_methods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON install_methods;
CREATE POLICY rls_047_service_role ON install_methods
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rls_047_public_read ON install_methods;
CREATE POLICY rls_047_public_read ON install_methods
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE transport_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON transport_types;
CREATE POLICY rls_047_service_role ON transport_types
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rls_047_public_read ON transport_types;
CREATE POLICY rls_047_public_read ON transport_types
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON clients;
CREATE POLICY rls_047_service_role ON clients
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rls_047_public_read ON clients;
CREATE POLICY rls_047_public_read ON clients
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE risk_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON risk_flags;
CREATE POLICY rls_047_service_role ON risk_flags
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rls_047_public_read ON risk_flags;
CREATE POLICY rls_047_public_read ON risk_flags
  FOR SELECT TO anon, authenticated USING (true);

-- ── Skill junction tables (001) ─────────────────────────────────────────────

ALTER TABLE skill_capabilities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON skill_capabilities;
CREATE POLICY rls_047_service_role ON skill_capabilities
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rls_047_public_read ON skill_capabilities;
CREATE POLICY rls_047_public_read ON skill_capabilities
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE skill_workflows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON skill_workflows;
CREATE POLICY rls_047_service_role ON skill_workflows
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rls_047_public_read ON skill_workflows;
CREATE POLICY rls_047_public_read ON skill_workflows
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE skill_verticals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON skill_verticals;
CREATE POLICY rls_047_service_role ON skill_verticals
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rls_047_public_read ON skill_verticals;
CREATE POLICY rls_047_public_read ON skill_verticals
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE skill_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON skill_roles;
CREATE POLICY rls_047_service_role ON skill_roles
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rls_047_public_read ON skill_roles;
CREATE POLICY rls_047_public_read ON skill_roles
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE skill_auth_modes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON skill_auth_modes;
CREATE POLICY rls_047_service_role ON skill_auth_modes
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rls_047_public_read ON skill_auth_modes;
CREATE POLICY rls_047_public_read ON skill_auth_modes
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE skill_install_methods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON skill_install_methods;
CREATE POLICY rls_047_service_role ON skill_install_methods
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rls_047_public_read ON skill_install_methods;
CREATE POLICY rls_047_public_read ON skill_install_methods
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE skill_transport_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON skill_transport_types;
CREATE POLICY rls_047_service_role ON skill_transport_types
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rls_047_public_read ON skill_transport_types;
CREATE POLICY rls_047_public_read ON skill_transport_types
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE skill_clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON skill_clients;
CREATE POLICY rls_047_service_role ON skill_clients
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rls_047_public_read ON skill_clients;
CREATE POLICY rls_047_public_read ON skill_clients
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE skill_risk_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON skill_risk_flags;
CREATE POLICY rls_047_service_role ON skill_risk_flags
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rls_047_public_read ON skill_risk_flags;
CREATE POLICY rls_047_public_read ON skill_risk_flags
  FOR SELECT TO anon, authenticated USING (true);

-- ── Skill metadata (001) ────────────────────────────────────────────────────

ALTER TABLE skill_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON skill_metrics;
CREATE POLICY rls_047_service_role ON skill_metrics
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rls_047_public_read ON skill_metrics;
CREATE POLICY rls_047_public_read ON skill_metrics
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE skill_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON skill_scores;
CREATE POLICY rls_047_service_role ON skill_scores
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rls_047_public_read ON skill_scores;
CREATE POLICY rls_047_public_read ON skill_scores
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE skill_cost_models ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON skill_cost_models;
CREATE POLICY rls_047_service_role ON skill_cost_models
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rls_047_public_read ON skill_cost_models;
CREATE POLICY rls_047_public_read ON skill_cost_models
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE skill_benchmark_rollups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON skill_benchmark_rollups;
CREATE POLICY rls_047_service_role ON skill_benchmark_rollups
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rls_047_public_read ON skill_benchmark_rollups;
CREATE POLICY rls_047_public_read ON skill_benchmark_rollups
  FOR SELECT TO anon, authenticated USING (true);

-- ── Combinations / pages (001) ──────────────────────────────────────────────

ALTER TABLE combinations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON combinations;
CREATE POLICY rls_047_service_role ON combinations
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rls_047_public_read ON combinations;
CREATE POLICY rls_047_public_read ON combinations
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE combination_skills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON combination_skills;
CREATE POLICY rls_047_service_role ON combination_skills
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rls_047_public_read ON combination_skills;
CREATE POLICY rls_047_public_read ON combination_skills
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE combination_verticals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON combination_verticals;
CREATE POLICY rls_047_service_role ON combination_verticals
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rls_047_public_read ON combination_verticals;
CREATE POLICY rls_047_public_read ON combination_verticals
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE skill_edges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON skill_edges;
CREATE POLICY rls_047_service_role ON skill_edges
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rls_047_public_read ON skill_edges;
CREATE POLICY rls_047_public_read ON skill_edges
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON quotes;
CREATE POLICY rls_047_service_role ON quotes
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rls_047_public_read ON quotes;
CREATE POLICY rls_047_public_read ON quotes
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE vertical_pages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON vertical_pages;
CREATE POLICY rls_047_service_role ON vertical_pages
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rls_047_public_read ON vertical_pages;
CREATE POLICY rls_047_public_read ON vertical_pages
  FOR SELECT TO anon, authenticated USING (true);

-- ── Benchmark catalog (001) ─────────────────────────────────────────────────

ALTER TABLE benchmark_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON benchmark_profiles;
CREATE POLICY rls_047_service_role ON benchmark_profiles
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rls_047_public_read ON benchmark_profiles;
CREATE POLICY rls_047_public_read ON benchmark_profiles
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE benchmark_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON benchmark_metrics;
CREATE POLICY rls_047_service_role ON benchmark_metrics
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rls_047_public_read ON benchmark_metrics;
CREATE POLICY rls_047_public_read ON benchmark_metrics
  FOR SELECT TO anon, authenticated USING (true);

-- ── Olympics / missions (003) ───────────────────────────────────────────────

ALTER TABLE olympic_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON olympic_events;
CREATE POLICY rls_047_service_role ON olympic_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rls_047_public_read ON olympic_events;
CREATE POLICY rls_047_public_read ON olympic_events
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE olympic_event_competitors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON olympic_event_competitors;
CREATE POLICY rls_047_service_role ON olympic_event_competitors
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rls_047_public_read ON olympic_event_competitors;
CREATE POLICY rls_047_public_read ON olympic_event_competitors
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE benchmark_missions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON benchmark_missions;
CREATE POLICY rls_047_service_role ON benchmark_missions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rls_047_public_read ON benchmark_missions;
CREATE POLICY rls_047_public_read ON benchmark_missions
  FOR SELECT TO anon, authenticated USING (true);

-- ── Tasks / tool types (008) ────────────────────────────────────────────────

ALTER TABLE tool_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON tool_types;
CREATE POLICY rls_047_service_role ON tool_types
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rls_047_public_read ON tool_types;
CREATE POLICY rls_047_public_read ON tool_types
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON tasks;
CREATE POLICY rls_047_service_role ON tasks
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rls_047_public_read ON tasks;
CREATE POLICY rls_047_public_read ON tasks
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE skill_tool_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON skill_tool_types;
CREATE POLICY rls_047_service_role ON skill_tool_types
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rls_047_public_read ON skill_tool_types;
CREATE POLICY rls_047_public_read ON skill_tool_types
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE skill_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON skill_tasks;
CREATE POLICY rls_047_service_role ON skill_tasks
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rls_047_public_read ON skill_tasks;
CREATE POLICY rls_047_public_read ON skill_tasks
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE task_workflows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON task_workflows;
CREATE POLICY rls_047_service_role ON task_workflows
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rls_047_public_read ON task_workflows;
CREATE POLICY rls_047_public_read ON task_workflows
  FOR SELECT TO anon, authenticated USING (true);

-- ── Challenges (021) ────────────────────────────────────────────────────────

ALTER TABLE workflow_challenges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON workflow_challenges;
CREATE POLICY rls_047_service_role ON workflow_challenges
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rls_047_public_read ON workflow_challenges;
CREATE POLICY rls_047_public_read ON workflow_challenges
  FOR SELECT TO anon, authenticated USING (true);

-- ── Model routing (023) ─────────────────────────────────────────────────────

ALTER TABLE model_registry ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON model_registry;
CREATE POLICY rls_047_service_role ON model_registry
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rls_047_public_read ON model_registry;
CREATE POLICY rls_047_public_read ON model_registry
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE model_aliases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON model_aliases;
CREATE POLICY rls_047_service_role ON model_aliases
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rls_047_public_read ON model_aliases;
CREATE POLICY rls_047_public_read ON model_aliases
  FOR SELECT TO anon, authenticated USING (true);

-- ── Model catalog (043) ─────────────────────────────────────────────────────

ALTER TABLE models ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON models;
CREATE POLICY rls_047_service_role ON models
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rls_047_public_read ON models;
CREATE POLICY rls_047_public_read ON models
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE model_pricing_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON model_pricing_history;
CREATE POLICY rls_047_service_role ON model_pricing_history
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rls_047_public_read ON model_pricing_history;
CREATE POLICY rls_047_public_read ON model_pricing_history
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE model_refresh_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_047_service_role ON model_refresh_runs;
CREATE POLICY rls_047_service_role ON model_refresh_runs
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rls_047_public_read ON model_refresh_runs;
CREATE POLICY rls_047_public_read ON model_refresh_runs
  FOR SELECT TO anon, authenticated USING (true);
