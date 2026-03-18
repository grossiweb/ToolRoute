-- ============================================================
-- Migration 023: LLM Model Routing System
-- Tables: model_registry, model_aliases, model_routing_decisions, model_outcome_records
-- Seed: ~20 models across 6 providers and 6 tiers
-- ============================================================

-- Model Registry — all available LLM models
CREATE TABLE model_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_model_id TEXT NOT NULL,
  supports_tool_calling BOOLEAN NOT NULL DEFAULT false,
  supports_structured_output BOOLEAN NOT NULL DEFAULT false,
  supports_vision BOOLEAN NOT NULL DEFAULT false,
  context_window INT NOT NULL DEFAULT 128000,
  max_output_tokens INT,
  input_cost_per_mtok NUMERIC(10,4),
  output_cost_per_mtok NUMERIC(10,4),
  avg_latency_ms INT,
  tokens_per_second INT,
  reasoning_strength TEXT CHECK (reasoning_strength IN ('low','medium','high','very_high')) DEFAULT 'medium',
  code_strength TEXT CHECK (code_strength IN ('low','medium','high','very_high')) DEFAULT 'medium',
  release_date DATE,
  deprecation_date DATE,
  status TEXT CHECK (status IN ('active','deprecated','preview')) DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_model_registry_slug ON model_registry(slug);
CREATE INDEX idx_model_registry_provider ON model_registry(provider);
CREATE INDEX idx_model_registry_status ON model_registry(status);

-- Model Aliases — tier-to-model indirection layer
CREATE TABLE model_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier TEXT NOT NULL,
  alias_name TEXT NOT NULL UNIQUE,
  model_id UUID NOT NULL REFERENCES model_registry(id) ON DELETE CASCADE,
  priority INT NOT NULL DEFAULT 0,
  is_fallback BOOLEAN NOT NULL DEFAULT false,
  constraints_json JSONB DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_model_aliases_tier ON model_aliases(tier);
CREATE INDEX idx_model_aliases_active ON model_aliases(active) WHERE active = true;

-- Model Routing Decisions — log every routing decision
CREATE TABLE model_routing_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_hash TEXT NOT NULL,
  task_snippet TEXT,
  signals_json JSONB NOT NULL,
  resolved_tier TEXT NOT NULL,
  recommended_model_id UUID NOT NULL REFERENCES model_registry(id),
  recommended_alias TEXT NOT NULL,
  fallback_chain JSONB NOT NULL DEFAULT '[]',
  confidence NUMERIC(4,2) NOT NULL,
  constraints_json JSONB DEFAULT '{}',
  agent_identity_id UUID REFERENCES agent_identities(id) ON DELETE SET NULL,
  latency_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_model_routing_decisions_tier ON model_routing_decisions(resolved_tier);
CREATE INDEX idx_model_routing_decisions_created ON model_routing_decisions(created_at);
CREATE INDEX idx_model_routing_decisions_model ON model_routing_decisions(recommended_model_id);

-- Model Outcome Records — telemetry after model usage
CREATE TABLE model_outcome_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routing_decision_id UUID REFERENCES model_routing_decisions(id) ON DELETE SET NULL,
  model_id UUID NOT NULL REFERENCES model_registry(id),
  outcome_status TEXT CHECK (outcome_status IN ('success','partial_success','failure','aborted')) NOT NULL,
  latency_ms INT,
  input_tokens INT,
  output_tokens INT,
  estimated_cost_usd NUMERIC(10,6),
  output_quality_rating NUMERIC(4,2),
  structured_output_valid BOOLEAN,
  tool_calls_succeeded BOOLEAN,
  hallucination_detected BOOLEAN,
  task_type TEXT,
  fallback_used BOOLEAN DEFAULT false,
  fallback_model_slug TEXT,
  agent_identity_id UUID REFERENCES agent_identities(id) ON DELETE SET NULL,
  proof_type TEXT CHECK (proof_type IN ('runtime_signed','client_signed','self_reported','hybrid')) DEFAULT 'self_reported',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_model_outcome_model ON model_outcome_records(model_id);
CREATE INDEX idx_model_outcome_created ON model_outcome_records(created_at);
CREATE INDEX idx_model_outcome_routing ON model_outcome_records(routing_decision_id);

-- ============================================================
-- SEED DATA — ~20 models across 6 providers
-- ============================================================

-- OpenAI
INSERT INTO model_registry (slug, display_name, provider, provider_model_id, supports_tool_calling, supports_structured_output, supports_vision, context_window, max_output_tokens, input_cost_per_mtok, output_cost_per_mtok, avg_latency_ms, tokens_per_second, reasoning_strength, code_strength) VALUES
('gpt-4o', 'GPT-4o', 'openai', 'gpt-4o-2024-11-20', true, true, true, 128000, 16384, 2.50, 10.00, 600, 100, 'high', 'high'),
('gpt-4o-mini', 'GPT-4o Mini', 'openai', 'gpt-4o-mini-2024-07-18', true, true, true, 128000, 16384, 0.15, 0.60, 350, 150, 'medium', 'medium'),
('o3-mini', 'O3 Mini', 'openai', 'o3-mini-2025-01-31', true, true, false, 200000, 100000, 1.10, 4.40, 2000, 60, 'very_high', 'high'),
('gpt-4-5-preview', 'GPT-4.5 Preview', 'openai', 'gpt-4.5-preview-2025-02-27', true, true, true, 128000, 16384, 75.00, 150.00, 800, 80, 'very_high', 'very_high');

-- Anthropic
INSERT INTO model_registry (slug, display_name, provider, provider_model_id, supports_tool_calling, supports_structured_output, supports_vision, context_window, max_output_tokens, input_cost_per_mtok, output_cost_per_mtok, avg_latency_ms, tokens_per_second, reasoning_strength, code_strength) VALUES
('claude-3-5-sonnet', 'Claude 3.5 Sonnet', 'anthropic', 'claude-3-5-sonnet-20241022', true, true, true, 200000, 8192, 3.00, 15.00, 500, 90, 'high', 'very_high'),
('claude-3-5-haiku', 'Claude 3.5 Haiku', 'anthropic', 'claude-3-5-haiku-20241022', true, true, true, 200000, 8192, 0.80, 4.00, 300, 150, 'medium', 'medium'),
('claude-opus-4', 'Claude Opus 4', 'anthropic', 'claude-opus-4-20250514', true, true, true, 200000, 32000, 15.00, 75.00, 1000, 60, 'very_high', 'very_high');

-- Google
INSERT INTO model_registry (slug, display_name, provider, provider_model_id, supports_tool_calling, supports_structured_output, supports_vision, context_window, max_output_tokens, input_cost_per_mtok, output_cost_per_mtok, avg_latency_ms, tokens_per_second, reasoning_strength, code_strength) VALUES
('gemini-2-0-flash', 'Gemini 2.0 Flash', 'google', 'gemini-2.0-flash', true, true, true, 1000000, 8192, 0.10, 0.40, 300, 200, 'medium', 'high'),
('gemini-2-0-flash-lite', 'Gemini 2.0 Flash Lite', 'google', 'gemini-2.0-flash-lite', false, true, false, 1000000, 8192, 0.075, 0.30, 200, 250, 'low', 'medium'),
('gemini-2-0-pro', 'Gemini 2.0 Pro', 'google', 'gemini-2.0-pro-exp', true, true, true, 2000000, 8192, 1.25, 5.00, 700, 80, 'very_high', 'high');

-- Mistral
INSERT INTO model_registry (slug, display_name, provider, provider_model_id, supports_tool_calling, supports_structured_output, supports_vision, context_window, max_output_tokens, input_cost_per_mtok, output_cost_per_mtok, avg_latency_ms, tokens_per_second, reasoning_strength, code_strength) VALUES
('mistral-small', 'Mistral Small', 'mistral', 'mistral-small-latest', true, true, false, 128000, 8192, 0.20, 0.60, 300, 160, 'medium', 'medium'),
('mistral-large', 'Mistral Large', 'mistral', 'mistral-large-latest', true, true, true, 128000, 8192, 2.00, 6.00, 600, 80, 'high', 'high'),
('codestral', 'Codestral', 'mistral', 'codestral-latest', false, true, false, 256000, 8192, 0.30, 0.90, 350, 140, 'medium', 'very_high');

-- DeepSeek
INSERT INTO model_registry (slug, display_name, provider, provider_model_id, supports_tool_calling, supports_structured_output, supports_vision, context_window, max_output_tokens, input_cost_per_mtok, output_cost_per_mtok, avg_latency_ms, tokens_per_second, reasoning_strength, code_strength) VALUES
('deepseek-v3', 'DeepSeek V3', 'deepseek', 'deepseek-chat', true, true, false, 128000, 8192, 0.27, 1.10, 400, 120, 'high', 'very_high'),
('deepseek-r1', 'DeepSeek R1', 'deepseek', 'deepseek-reasoner', false, false, false, 128000, 8192, 0.55, 2.19, 3000, 40, 'very_high', 'high');

-- Meta (via OpenRouter)
INSERT INTO model_registry (slug, display_name, provider, provider_model_id, supports_tool_calling, supports_structured_output, supports_vision, context_window, max_output_tokens, input_cost_per_mtok, output_cost_per_mtok, avg_latency_ms, tokens_per_second, reasoning_strength, code_strength) VALUES
('llama-3-3-70b', 'Llama 3.3 70B', 'meta', 'meta-llama/llama-3.3-70b-instruct', true, true, false, 131072, 8192, 0.39, 0.39, 500, 100, 'high', 'high');

-- ============================================================
-- MODEL ALIASES — Tier-to-model mappings
-- ============================================================

-- cheap_chat
INSERT INTO model_aliases (tier, alias_name, model_id, priority, is_fallback) VALUES
('cheap_chat', 'toolroute/cheap_chat', (SELECT id FROM model_registry WHERE slug = 'gpt-4o-mini'), 0, false),
('cheap_chat', 'toolroute/cheap_chat_fb1', (SELECT id FROM model_registry WHERE slug = 'claude-3-5-haiku'), 1, true),
('cheap_chat', 'toolroute/cheap_chat_fb2', (SELECT id FROM model_registry WHERE slug = 'gemini-2-0-flash-lite'), 2, true);

-- cheap_structured
INSERT INTO model_aliases (tier, alias_name, model_id, priority, is_fallback) VALUES
('cheap_structured', 'toolroute/cheap_structured', (SELECT id FROM model_registry WHERE slug = 'gpt-4o-mini'), 0, false),
('cheap_structured', 'toolroute/cheap_structured_fb1', (SELECT id FROM model_registry WHERE slug = 'gemini-2-0-flash'), 1, true),
('cheap_structured', 'toolroute/cheap_structured_fb2', (SELECT id FROM model_registry WHERE slug = 'mistral-small'), 2, true);

-- fast_code
INSERT INTO model_aliases (tier, alias_name, model_id, priority, is_fallback) VALUES
('fast_code', 'toolroute/fast_code', (SELECT id FROM model_registry WHERE slug = 'claude-3-5-sonnet'), 0, false),
('fast_code', 'toolroute/fast_code_fb1', (SELECT id FROM model_registry WHERE slug = 'deepseek-v3'), 1, true),
('fast_code', 'toolroute/fast_code_fb2', (SELECT id FROM model_registry WHERE slug = 'gpt-4o'), 2, true),
('fast_code', 'toolroute/fast_code_fb3', (SELECT id FROM model_registry WHERE slug = 'codestral'), 3, true),
('fast_code', 'toolroute/fast_code_fb4', (SELECT id FROM model_registry WHERE slug = 'gemini-2-0-flash'), 4, true);

-- reasoning_pro
INSERT INTO model_aliases (tier, alias_name, model_id, priority, is_fallback) VALUES
('reasoning_pro', 'toolroute/reasoning_pro', (SELECT id FROM model_registry WHERE slug = 'claude-3-5-sonnet'), 0, false),
('reasoning_pro', 'toolroute/reasoning_pro_fb1', (SELECT id FROM model_registry WHERE slug = 'deepseek-r1'), 1, true),
('reasoning_pro', 'toolroute/reasoning_pro_fb2', (SELECT id FROM model_registry WHERE slug = 'o3-mini'), 2, true),
('reasoning_pro', 'toolroute/reasoning_pro_fb3', (SELECT id FROM model_registry WHERE slug = 'gemini-2-0-pro'), 3, true),
('reasoning_pro', 'toolroute/reasoning_pro_fb4', (SELECT id FROM model_registry WHERE slug = 'gpt-4o'), 4, true);

-- tool_agent
INSERT INTO model_aliases (tier, alias_name, model_id, priority, is_fallback) VALUES
('tool_agent', 'toolroute/tool_agent', (SELECT id FROM model_registry WHERE slug = 'claude-3-5-sonnet'), 0, false),
('tool_agent', 'toolroute/tool_agent_fb1', (SELECT id FROM model_registry WHERE slug = 'gpt-4o'), 1, true),
('tool_agent', 'toolroute/tool_agent_fb2', (SELECT id FROM model_registry WHERE slug = 'gemini-2-0-flash'), 2, true),
('tool_agent', 'toolroute/tool_agent_fb3', (SELECT id FROM model_registry WHERE slug = 'mistral-large'), 3, true);

-- best_available
INSERT INTO model_aliases (tier, alias_name, model_id, priority, is_fallback) VALUES
('best_available', 'toolroute/best_available', (SELECT id FROM model_registry WHERE slug = 'claude-opus-4'), 0, false),
('best_available', 'toolroute/best_available_fb1', (SELECT id FROM model_registry WHERE slug = 'gpt-4-5-preview'), 1, true),
('best_available', 'toolroute/best_available_fb2', (SELECT id FROM model_registry WHERE slug = 'gemini-2-0-pro'), 2, true);
