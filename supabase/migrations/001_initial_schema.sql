-- ToolRoute — Full Database Migration
-- Run this in your Supabase SQL Editor
-- Version: 1.0 | March 2026

-- ─────────────────────────────────────────────
-- CORE CATALOG
-- ─────────────────────────────────────────────

CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  registry_name TEXT,
  repo_url TEXT,
  homepage_url TEXT,
  vendor_name TEXT,
  vendor_type TEXT CHECK (vendor_type IN ('official','community','reference','mirror','unknown')) DEFAULT 'community',
  short_description TEXT NOT NULL,
  long_description TEXT,
  open_source BOOLEAN DEFAULT true,
  remote_available BOOLEAN DEFAULT false,
  local_available BOOLEAN DEFAULT true,
  status TEXT CHECK (status IN ('active','beta','experimental','archived','deprecated')) DEFAULT 'active',
  license TEXT,
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_skills_slug ON skills(slug);
CREATE INDEX idx_skills_status ON skills(status);
CREATE INDEX idx_skills_featured ON skills(featured) WHERE featured = true;
CREATE INDEX idx_skills_vendor_type ON skills(vendor_type);

CREATE TABLE skill_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  published_at TIMESTAMP,
  package_type TEXT CHECK (package_type IN ('npm','pip','docker','manual','remote','binary','other')),
  package_name TEXT,
  docker_image TEXT,
  remote_url TEXT,
  command TEXT,
  args_json JSONB,
  env_schema_json JSONB,
  server_json_url TEXT,
  deprecated BOOLEAN DEFAULT false,
  breaking_change_risk TEXT CHECK (breaking_change_risk IN ('low','medium','high')) DEFAULT 'low',
  UNIQUE(skill_id, version)
);

CREATE INDEX idx_skill_versions_skill_id ON skill_versions(skill_id);

-- ─────────────────────────────────────────────
-- TAXONOMY
-- ─────────────────────────────────────────────

CREATE TABLE capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE verticals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE functional_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE auth_modes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE install_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE transport_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE risk_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  severity TEXT CHECK (severity IN ('low','medium','high','critical')) NOT NULL
);

-- ─────────────────────────────────────────────
-- TAXONOMY JOIN TABLES
-- ─────────────────────────────────────────────

CREATE TABLE skill_capabilities (
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  capability_id UUID NOT NULL REFERENCES capabilities(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  PRIMARY KEY (skill_id, capability_id)
);

CREATE TABLE skill_workflows (
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  PRIMARY KEY (skill_id, workflow_id)
);

CREATE TABLE skill_verticals (
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  vertical_id UUID NOT NULL REFERENCES verticals(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  PRIMARY KEY (skill_id, vertical_id)
);

CREATE TABLE skill_roles (
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES functional_roles(id) ON DELETE CASCADE,
  PRIMARY KEY (skill_id, role_id)
);

CREATE TABLE skill_auth_modes (
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  auth_mode_id UUID NOT NULL REFERENCES auth_modes(id) ON DELETE CASCADE,
  PRIMARY KEY (skill_id, auth_mode_id)
);

CREATE TABLE skill_install_methods (
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  install_method_id UUID NOT NULL REFERENCES install_methods(id) ON DELETE CASCADE,
  PRIMARY KEY (skill_id, install_method_id)
);

CREATE TABLE skill_transport_types (
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  transport_type_id UUID NOT NULL REFERENCES transport_types(id) ON DELETE CASCADE,
  PRIMARY KEY (skill_id, transport_type_id)
);

CREATE TABLE skill_clients (
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  support_level TEXT CHECK (support_level IN ('declared','tested','community_reported','unknown')) DEFAULT 'unknown',
  PRIMARY KEY (skill_id, client_id)
);

CREATE TABLE skill_risk_flags (
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  risk_flag_id UUID NOT NULL REFERENCES risk_flags(id) ON DELETE CASCADE,
  PRIMARY KEY (skill_id, risk_flag_id)
);

-- ─────────────────────────────────────────────
-- METRICS & SCORES
-- ─────────────────────────────────────────────

CREATE TABLE skill_metrics (
  skill_id UUID PRIMARY KEY REFERENCES skills(id) ON DELETE CASCADE,
  github_stars INT,
  github_forks INT,
  open_issues INT,
  days_since_last_commit INT,
  weekly_downloads INT,
  directory_usage_rank INT,
  estimated_visitors INT,
  community_mentions_30d INT,
  positive_sentiment_pct NUMERIC(5,2),
  negative_sentiment_pct NUMERIC(5,2),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE skill_scores (
  skill_id UUID PRIMARY KEY REFERENCES skills(id) ON DELETE CASCADE,
  adoption_score NUMERIC(4,2),
  freshness_score NUMERIC(4,2),
  trust_score NUMERIC(4,2),
  setup_score NUMERIC(4,2),
  reliability_score NUMERIC(4,2),
  output_score NUMERIC(4,2),
  efficiency_score NUMERIC(4,2),
  cost_score NUMERIC(4,2),
  value_score NUMERIC(4,2),
  overall_score NUMERIC(4,2),
  score_version TEXT NOT NULL DEFAULT '1.0',
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE skill_cost_models (
  skill_id UUID PRIMARY KEY REFERENCES skills(id) ON DELETE CASCADE,
  pricing_model TEXT CHECK (pricing_model IN ('free','freemium','subscription','usage_based','self_hosted','enterprise','unknown')) DEFAULT 'unknown',
  monthly_base_cost_usd NUMERIC(10,2),
  estimated_usage_cost_unit TEXT,
  estimated_usage_cost_usd NUMERIC(10,4),
  setup_labor_hours NUMERIC(10,2),
  maintenance_labor_hours_per_month NUMERIC(10,2),
  notes TEXT
);

-- ─────────────────────────────────────────────
-- COMBINATIONS & PAIRING GRAPH
-- ─────────────────────────────────────────────

CREATE TABLE combinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  headline TEXT,
  description TEXT NOT NULL,
  workflow_id UUID REFERENCES workflows(id),
  setup_complexity TEXT CHECK (setup_complexity IN ('low','medium','high')) DEFAULT 'medium',
  confidence_level TEXT CHECK (confidence_level IN ('low','medium','high')) DEFAULT 'medium',
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE combination_skills (
  combination_id UUID NOT NULL REFERENCES combinations(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  role_in_combo TEXT,
  sequence_order INT DEFAULT 0,
  PRIMARY KEY (combination_id, skill_id)
);

CREATE TABLE combination_verticals (
  combination_id UUID NOT NULL REFERENCES combinations(id) ON DELETE CASCADE,
  vertical_id UUID NOT NULL REFERENCES verticals(id) ON DELETE CASCADE,
  PRIMARY KEY (combination_id, vertical_id)
);

CREATE TABLE skill_edges (
  from_skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  to_skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  edge_type TEXT CHECK (edge_type IN ('pairs_with','depends_on','same_workflow','same_buyer','alternative_to','upgrade_to','context_overlap','trust_conflict')) NOT NULL,
  strength NUMERIC(4,2) NOT NULL,
  explanation TEXT,
  PRIMARY KEY (from_skill_id, to_skill_id, edge_type)
);

-- ─────────────────────────────────────────────
-- COMMUNITY
-- ─────────────────────────────────────────────

CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  source_type TEXT CHECK (source_type IN ('github','reddit','x','hackernews','blog','directory')),
  source_url TEXT NOT NULL,
  quote_text TEXT NOT NULL,
  sentiment TEXT CHECK (sentiment IN ('positive','negative','neutral','mixed')),
  theme TEXT,
  captured_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE vertical_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical_id UUID NOT NULL UNIQUE REFERENCES verticals(id) ON DELETE CASCADE,
  summary TEXT,
  jobs_to_be_done_json JSONB,
  gap_opportunities_json JSONB,
  persona_targets_json JSONB,
  featured BOOLEAN DEFAULT false,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- BENCHMARK & OUTCOME
-- ─────────────────────────────────────────────

CREATE TABLE benchmark_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  workflow_slug TEXT,
  category_scope TEXT,
  scoring_formula_version TEXT NOT NULL DEFAULT '1.0',
  active BOOLEAN DEFAULT true
);

CREATE TABLE benchmark_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  benchmark_profile_id UUID NOT NULL REFERENCES benchmark_profiles(id) ON DELETE CASCADE,
  metric_slug TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  weight NUMERIC(5,4) NOT NULL,
  is_higher_better BOOLEAN DEFAULT true
);

CREATE TABLE outcome_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  benchmark_profile_id UUID REFERENCES benchmark_profiles(id) ON DELETE SET NULL,
  workflow_slug TEXT,
  vertical_slug TEXT,
  task_fingerprint TEXT NOT NULL,
  skill_version TEXT,
  outcome_status TEXT CHECK (outcome_status IN ('success','partial_success','failure','aborted')) NOT NULL,
  latency_ms INT,
  estimated_cost_usd NUMERIC(10,4),
  retries INT DEFAULT 0,
  output_quality_rating NUMERIC(4,2),
  structured_output_valid BOOLEAN,
  human_correction_required BOOLEAN DEFAULT false,
  human_correction_minutes NUMERIC(10,2),
  fallback_used_skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
  proof_type TEXT CHECK (proof_type IN ('runtime_signed','client_signed','self_reported','hybrid')) DEFAULT 'self_reported',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_outcome_records_skill_id ON outcome_records(skill_id);
CREATE INDEX idx_outcome_records_benchmark ON outcome_records(benchmark_profile_id);
CREATE INDEX idx_outcome_records_created ON outcome_records(created_at);

CREATE TABLE outcome_scores (
  outcome_record_id UUID PRIMARY KEY REFERENCES outcome_records(id) ON DELETE CASCADE,
  quality_score NUMERIC(4,2),
  reliability_score NUMERIC(4,2),
  efficiency_score NUMERIC(4,2),
  cost_score NUMERIC(4,2),
  trust_score NUMERIC(4,2),
  value_score NUMERIC(4,2),
  grade_label TEXT,
  scored_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE skill_benchmark_rollups (
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  benchmark_profile_id UUID NOT NULL REFERENCES benchmark_profiles(id) ON DELETE CASCADE,
  sample_size INT NOT NULL DEFAULT 0,
  avg_quality_score NUMERIC(4,2),
  avg_reliability_score NUMERIC(4,2),
  avg_efficiency_score NUMERIC(4,2),
  avg_cost_score NUMERIC(4,2),
  avg_trust_score NUMERIC(4,2),
  avg_value_score NUMERIC(4,2),
  cost_per_useful_outcome_usd NUMERIC(10,4),
  avg_human_correction_minutes NUMERIC(10,2),
  fallback_rate NUMERIC(6,4),
  success_rate NUMERIC(6,4),
  last_updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (skill_id, benchmark_profile_id)
);

-- ─────────────────────────────────────────────
-- CONTRIBUTION ECONOMY
-- ─────────────────────────────────────────────

CREATE TABLE contributors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_type TEXT CHECK (contributor_type IN ('individual','workspace','company','agent_fleet')) NOT NULL DEFAULT 'individual',
  display_name TEXT NOT NULL,
  owner_user_id TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE agent_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id UUID NOT NULL REFERENCES contributors(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  agent_kind TEXT CHECK (agent_kind IN ('autonomous','copilot','workflow-agent','evaluation-agent','hybrid')) NOT NULL DEFAULT 'autonomous',
  host_client_slug TEXT,
  model_family TEXT,
  environment_label TEXT,
  trust_tier TEXT CHECK (trust_tier IN ('unverified','baseline','trusted','production','enterprise')) DEFAULT 'baseline',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_identity_id UUID NOT NULL REFERENCES agent_identities(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  benchmark_profile_id UUID REFERENCES benchmark_profiles(id) ON DELETE SET NULL,
  workflow_slug TEXT,
  vertical_slug TEXT,
  task_fingerprint TEXT NOT NULL,
  task_complexity_band TEXT CHECK (task_complexity_band IN ('low','medium','high')) DEFAULT 'medium',
  outcome TEXT CHECK (outcome IN ('success','partial_success','failure','aborted')) NOT NULL,
  latency_ms INT,
  retries INT DEFAULT 0,
  estimated_cost_usd NUMERIC(10,4),
  human_correction_required BOOLEAN DEFAULT false,
  human_correction_minutes NUMERIC(10,2),
  output_quality_rating NUMERIC(4,2),
  structured_output_valid BOOLEAN,
  fallback_used_skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_runs_skill_id ON agent_runs(skill_id);

CREATE TABLE contribution_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id UUID NOT NULL REFERENCES contributors(id) ON DELETE CASCADE,
  agent_identity_id UUID REFERENCES agent_identities(id) ON DELETE SET NULL,
  contribution_type TEXT CHECK (contribution_type IN ('run_telemetry','comparative_eval','fallback_chain','benchmark_package')) NOT NULL,
  run_count INT NOT NULL DEFAULT 1,
  payload_json JSONB NOT NULL,
  proof_type TEXT CHECK (proof_type IN ('runtime_signed','client_signed','self_reported','hybrid')) NOT NULL DEFAULT 'self_reported',
  accepted BOOLEAN DEFAULT false,
  rejection_reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contribution_events_contributor ON contribution_events(contributor_id);
CREATE INDEX idx_contribution_events_created ON contribution_events(created_at);

CREATE TABLE contribution_scores (
  contribution_event_id UUID PRIMARY KEY REFERENCES contribution_events(id) ON DELETE CASCADE,
  validity_score NUMERIC(4,2) NOT NULL,
  usefulness_score NUMERIC(4,2) NOT NULL,
  novelty_score NUMERIC(4,2) NOT NULL,
  consistency_score NUMERIC(4,2) NOT NULL,
  anti_gaming_score NUMERIC(4,2) NOT NULL,
  overall_contribution_score NUMERIC(4,2) NOT NULL,
  scored_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE reward_ledgers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id UUID NOT NULL REFERENCES contributors(id) ON DELETE CASCADE,
  agent_identity_id UUID REFERENCES agent_identities(id) ON DELETE SET NULL,
  contribution_event_id UUID REFERENCES contribution_events(id) ON DELETE SET NULL,
  routing_credits INT DEFAULT 0,
  economic_credits_usd NUMERIC(10,4) DEFAULT 0,
  reputation_points INT DEFAULT 0,
  unlock_code TEXT,
  reason TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE contributor_reputation (
  contributor_id UUID PRIMARY KEY REFERENCES contributors(id) ON DELETE CASCADE,
  total_contributions INT DEFAULT 0,
  accepted_contributions INT DEFAULT 0,
  comparative_evals_count INT DEFAULT 0,
  fallback_reports_count INT DEFAULT 0,
  benchmark_packages_count INT DEFAULT 0,
  reputation_score NUMERIC(5,2) DEFAULT 0,
  contributor_tier TEXT CHECK (contributor_tier IN ('bronze','silver','gold','platinum','verified','enterprise_verified')) DEFAULT 'bronze',
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Trigger: auto-update reputation on contribution accept
CREATE OR REPLACE FUNCTION update_reputation_on_accept() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.accepted = true AND (OLD.accepted IS NULL OR OLD.accepted = false) THEN
    INSERT INTO contributor_reputation (contributor_id, total_contributions, accepted_contributions)
    VALUES (NEW.contributor_id, 1, 1)
    ON CONFLICT (contributor_id) DO UPDATE SET
      total_contributions = contributor_reputation.total_contributions + 1,
      accepted_contributions = contributor_reputation.accepted_contributions + 1,
      updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_contribution_accept
AFTER UPDATE ON contribution_events
FOR EACH ROW EXECUTE PROCEDURE update_reputation_on_accept();

-- Telemetry events (raw — purge after 30 days via pg_cron or scheduled job)
CREATE TABLE telemetry_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  agent_identity_id UUID REFERENCES agent_identities(id),
  success BOOLEAN,
  response_ms INT,
  error_type TEXT,
  model_id TEXT,
  anonymous_agent_id TEXT,
  skill_version TEXT,
  called_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_telemetry_events_skill_id ON telemetry_events(skill_id);
CREATE INDEX idx_telemetry_events_called_at ON telemetry_events(called_at);

-- Telemetry aggregates (hourly rollups)
CREATE TABLE telemetry_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  avg_response_ms INT,
  success_rate NUMERIC(5,4),
  call_volume INT,
  error_distribution JSONB,
  model_compatibility TEXT[],
  last_successful_call TIMESTAMP,
  period_start TIMESTAMP,
  period_end TIMESTAMP,
  reliability_score INT
);

CREATE INDEX idx_telemetry_aggregates_skill_id ON telemetry_aggregates(skill_id);
