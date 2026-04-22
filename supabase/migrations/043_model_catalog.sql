-- ============================================================
-- 043_model_catalog.sql
-- ============================================================
-- Creates the models catalog, pricing history, and refresh-run log.
-- Seeds the April 2026 catalog of 27 models across Anthropic, OpenAI,
-- Google, DeepSeek, xAI, Meta, and open-weight models via OpenRouter.
--
-- Note: This migration represents state that was already applied to
-- production on 2026-04-21 via direct SQL execution. It is committed
-- here so the source-controlled schema matches the deployed state.
--
-- Idempotent: safe to re-run. Uses IF NOT EXISTS and ON CONFLICT.
-- Assumes pgcrypto extension is already enabled (migration 001).
-- ============================================================

-- -----------------------------------------------------------
-- Tables
-- -----------------------------------------------------------

CREATE TABLE IF NOT EXISTS models (
  id                              TEXT        PRIMARY KEY,
  provider                        TEXT        NOT NULL,
  display_name                    TEXT        NOT NULL,
  family                          TEXT,
  tier                            TEXT,

  -- Pricing (USD per million tokens)
  input_price_per_m               NUMERIC(10,4),
  output_price_per_m              NUMERIC(10,4),
  input_price_tiered              JSONB,

  -- Cache + batch multipliers
  cache_read_multiplier           NUMERIC(6,4) DEFAULT 0.1,
  cache_write_multiplier          NUMERIC(6,4) DEFAULT 1.25,
  batch_discount_multiplier       NUMERIC(6,4) DEFAULT 0.5,

  -- Context + output limits
  context_window                  INTEGER,
  max_output_tokens               INTEGER,

  -- Capabilities
  supports_vision                 BOOLEAN      DEFAULT false,
  supports_tool_use               BOOLEAN      DEFAULT false,
  supports_reasoning              BOOLEAN      DEFAULT false,
  supports_computer_use           BOOLEAN      DEFAULT false,
  supports_task_budgets           BOOLEAN      DEFAULT false,
  supports_prompt_caching         BOOLEAN      DEFAULT false,
  max_image_resolution_px         INTEGER,

  -- Effort levels (Claude 4.7+ uses low|medium|high|xhigh|max)
  effort_levels                   TEXT[]       DEFAULT '{}',

  -- Cost modeling: tokenizer density vs provider baseline
  tokenizer_inflation_vs_baseline NUMERIC(4,2) DEFAULT 1.0,

  -- Residency / compliance
  data_residency                  TEXT,
  us_only_multiplier              NUMERIC(4,2),
  exclude_for_workloads           TEXT[]       DEFAULT '{}',

  -- Lifecycle
  released_at                     TIMESTAMPTZ,
  deprecated_at                   TIMESTAMPTZ,
  is_routable                     BOOLEAN      NOT NULL DEFAULT true,

  -- Source & audit
  source                          TEXT         NOT NULL DEFAULT 'seed',
  openrouter_id                   TEXT,
  editorial_notes                 TEXT[]       DEFAULT '{}',
  best_for                        TEXT[]       DEFAULT '{}',
  avoid_for                       TEXT[]       DEFAULT '{}',

  last_refreshed_at               TIMESTAMPTZ  NOT NULL DEFAULT now(),
  created_at                      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at                      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_models_provider   ON models(provider);
CREATE INDEX IF NOT EXISTS idx_models_tier       ON models(tier);
CREATE INDEX IF NOT EXISTS idx_models_routable   ON models(is_routable) WHERE is_routable = true;
CREATE INDEX IF NOT EXISTS idx_models_deprecated ON models(deprecated_at) WHERE deprecated_at IS NULL;

CREATE TABLE IF NOT EXISTS model_pricing_history (
  id                              BIGSERIAL    PRIMARY KEY,
  model_id                        TEXT         NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  observed_at                     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  input_price_per_m               NUMERIC(10,4),
  output_price_per_m              NUMERIC(10,4),
  input_price_tiered              JSONB,
  tokenizer_inflation_vs_baseline NUMERIC(4,2),
  source                          TEXT         NOT NULL,
  raw_snapshot                    JSONB
);

CREATE INDEX IF NOT EXISTS idx_model_pricing_history_model_observed
  ON model_pricing_history(model_id, observed_at DESC);

CREATE TABLE IF NOT EXISTS model_refresh_runs (
  id                 BIGSERIAL   PRIMARY KEY,
  started_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at        TIMESTAMPTZ,
  source             TEXT        NOT NULL,
  models_seen        INTEGER     DEFAULT 0,
  models_added       INTEGER     DEFAULT 0,
  models_updated     INTEGER     DEFAULT 0,
  models_deprecated  INTEGER     DEFAULT 0,
  errors             JSONB,
  status             TEXT
);

CREATE INDEX IF NOT EXISTS idx_model_refresh_runs_started
  ON model_refresh_runs(started_at DESC);

-- Auto-bump updated_at on row updates
CREATE OR REPLACE FUNCTION set_models_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_models_updated_at ON models;
CREATE TRIGGER trg_models_updated_at
  BEFORE UPDATE ON models
  FOR EACH ROW EXECUTE FUNCTION set_models_updated_at();

-- -----------------------------------------------------------
-- Seed: April 2026 catalog (27 rows)
-- Data transcribed from production SELECT output on 2026-04-22.
-- -----------------------------------------------------------

-- ============= Anthropic =============

INSERT INTO models (
  id, provider, display_name, family, tier,
  input_price_per_m, output_price_per_m,
  context_window, tokenizer_inflation_vs_baseline,
  is_routable, source
) VALUES
('claude-haiku-4-5-20251001', 'anthropic', 'Claude Haiku 4.5',      'claude', 'budget',   1.00, 5.00,  200000,  1.00, true,  'seed'),
('claude-mythos-preview',     'anthropic', 'Claude Mythos Preview', 'claude', 'restricted', NULL, NULL, NULL,   1.00, false, 'seed'),
('claude-opus-4-6',           'anthropic', 'Claude Opus 4.6',       'claude', 'flagship', 5.00, 25.00, 1000000, 1.00, true,  'seed'),
('claude-opus-4-7',           'anthropic', 'Claude Opus 4.7',       'claude', 'flagship', 5.00, 25.00, 1000000, 1.35, true,  'seed'),
('claude-sonnet-4-6',         'anthropic', 'Claude Sonnet 4.6',     'claude', 'mid',      3.00, 15.00, 1000000, 1.00, true,  'seed')
ON CONFLICT (id) DO UPDATE SET
  input_price_per_m               = EXCLUDED.input_price_per_m,
  output_price_per_m              = EXCLUDED.output_price_per_m,
  context_window                  = EXCLUDED.context_window,
  tokenizer_inflation_vs_baseline = EXCLUDED.tokenizer_inflation_vs_baseline,
  tier                            = EXCLUDED.tier,
  is_routable                     = EXCLUDED.is_routable,
  last_refreshed_at               = now();

-- Opus 4.7-specific metadata (effort levels, editorial notes)
UPDATE models
SET effort_levels           = ARRAY['low','medium','high','xhigh','max'],
    supports_task_budgets   = true,
    max_image_resolution_px = 2576,
    us_only_multiplier      = 1.1,
    editorial_notes = ARRAY[
      'New tokenizer produces 1.0x-1.35x more tokens than Opus 4.6 for the same text. Effective cost per request can be up to 35% higher at identical sticker price.',
      'Thinking content omitted from response by default. Set display=summarized to restore.',
      'Low-effort 4.7 is roughly equivalent to medium-effort 4.6 per Hex benchmark. Downgrade opportunity.',
      'inference_geo=us-only adds 1.1x multiplier on all token categories.'
    ],
    best_for  = ARRAY['long_horizon_coding','autonomous_agents','vision_heavy_review','complex_debugging'],
    avoid_for = ARRAY['high_volume_classification','simple_extraction','greps_and_reads']
WHERE id = 'claude-opus-4-7';

UPDATE models SET us_only_multiplier = 1.1 WHERE id = 'claude-opus-4-6';

-- ============= OpenAI =============

INSERT INTO models (
  id, provider, display_name, family, tier,
  input_price_per_m, output_price_per_m, context_window,
  is_routable, source
) VALUES
('gpt-5-nano',  'openai', 'GPT-5 Nano',  'gpt', 'budget',   0.05, 0.40,  128000, true, 'seed'),
('gpt-5.2',     'openai', 'GPT-5.2',     'gpt', 'mid',      1.75, 14.00, 200000, true, 'seed'),
('gpt-5.4',     'openai', 'GPT-5.4',     'gpt', 'mid',      2.50, 15.00, 270000, true, 'seed'),
('gpt-5.4-pro', 'openai', 'GPT-5.4 Pro', 'gpt', 'flagship', 30.00, 180.00, 270000, true, 'seed'),
('o3-mini',     'openai', 'o3-mini',     'gpt', 'budget',   1.10, 4.40,  200000, true, 'seed'),
('o4-mini',     'openai', 'o4-mini',     'gpt', 'budget',   1.10, 4.40,  200000, true, 'seed')
ON CONFLICT (id) DO UPDATE SET
  input_price_per_m  = EXCLUDED.input_price_per_m,
  output_price_per_m = EXCLUDED.output_price_per_m,
  context_window     = EXCLUDED.context_window,
  tier               = EXCLUDED.tier,
  last_refreshed_at  = now();

-- ============= Google =============

INSERT INTO models (
  id, provider, display_name, family, tier,
  input_price_per_m, output_price_per_m, context_window,
  is_routable, source
) VALUES
('gemini-2.5-flash',      'google', 'Gemini 2.5 Flash',      'gemini', 'budget',   0.15, 0.60,  1000000, true, 'seed'),
('gemini-2.5-flash-lite', 'google', 'Gemini 2.5 Flash-Lite', 'gemini', 'budget',   0.10, 0.40,  1000000, true, 'seed'),
('gemini-2.5-pro',        'google', 'Gemini 2.5 Pro',        'gemini', 'flagship', 1.25, 10.00, 2000000, true, 'seed'),
('gemini-3.1-flash',      'google', 'Gemini 3.1 Flash',      'gemini', 'mid',      0.50, 3.00,  1000000, true, 'seed'),
('gemini-3.1-flash-lite', 'google', 'Gemini 3.1 Flash-Lite', 'gemini', 'budget',   0.25, 1.50,  1000000, true, 'seed'),
('gemini-3.1-pro',        'google', 'Gemini 3.1 Pro',        'gemini', 'flagship', 2.00, 12.00, 2000000, true, 'seed')
ON CONFLICT (id) DO UPDATE SET
  input_price_per_m  = EXCLUDED.input_price_per_m,
  output_price_per_m = EXCLUDED.output_price_per_m,
  context_window     = EXCLUDED.context_window,
  tier               = EXCLUDED.tier,
  last_refreshed_at  = now();

-- Gemini 3.1 Pro has tiered pricing above 200K tokens
UPDATE models
SET input_price_tiered = '[{"upto_tokens":200000,"input":2.00,"output":12.00},{"upto_tokens":null,"input":4.00,"output":18.00}]'::jsonb,
    editorial_notes = ARRAY[
      '2M token context is largest in production.',
      'Paid-only as of 2026-04-01 — Pro-tier free access removed.',
      '90% cache discount available.',
      'Tiered pricing: 2.00/12.00 under 200K tokens, 4.00/18.00 above.'
    ]
WHERE id = 'gemini-3.1-pro';

-- ============= DeepSeek =============

INSERT INTO models (
  id, provider, display_name, family, tier,
  input_price_per_m, output_price_per_m, context_window,
  data_residency, exclude_for_workloads,
  is_routable, source
) VALUES
('deepseek-r1',   'deepseek', 'DeepSeek R1',   'deepseek', 'open-weight', NULL, NULL, 128000,  NULL,    ARRAY[]::TEXT[],                                                  true, 'seed'),
('deepseek-v3.2', 'deepseek', 'DeepSeek V3.2', 'deepseek', 'budget',      0.14, 0.28, 128000,  'china', ARRAY['healthcare','finance','government','eu_regulated'], true, 'seed'),
('deepseek-v4',   'deepseek', 'DeepSeek V4',   'deepseek', 'mid',         0.28, 0.42, 1000000, 'china', ARRAY['healthcare','finance','government','eu_regulated'], true, 'seed')
ON CONFLICT (id) DO UPDATE SET
  input_price_per_m     = EXCLUDED.input_price_per_m,
  output_price_per_m    = EXCLUDED.output_price_per_m,
  context_window        = EXCLUDED.context_window,
  data_residency        = EXCLUDED.data_residency,
  exclude_for_workloads = EXCLUDED.exclude_for_workloads,
  tier                  = EXCLUDED.tier,
  last_refreshed_at     = now();

-- ============= xAI =============

INSERT INTO models (
  id, provider, display_name, family, tier,
  context_window, is_routable, source
) VALUES
('grok-4',        'xai', 'Grok 4',        'grok', 'flagship', 2000000, true, 'seed'),
('grok-4.1-fast', 'xai', 'Grok 4.1 Fast', 'grok', 'mid',      256000,  true, 'seed')
ON CONFLICT (id) DO UPDATE SET
  context_window    = EXCLUDED.context_window,
  tier              = EXCLUDED.tier,
  last_refreshed_at = now();

-- ============= Meta =============

INSERT INTO models (
  id, provider, display_name, family, tier,
  context_window, is_routable, source
) VALUES
('llama-4-scout', 'meta', 'Llama 4 Scout', 'llama', 'open-weight', 10000000, true, 'seed')
ON CONFLICT (id) DO UPDATE SET
  context_window    = EXCLUDED.context_window,
  last_refreshed_at = now();

-- ============= Open weight (via OpenRouter) =============

INSERT INTO models (
  id, provider, display_name, family, tier,
  context_window, is_routable, source
) VALUES
('glm-5',            'openrouter', 'GLM-5',              'glm',     'open-weight', 131000, true, 'seed'),
('kimi-k2.5',        'openrouter', 'Kimi K2.5',          'kimi',    'open-weight', 256000, true, 'seed'),
('minimax-m2.5',     'openrouter', 'MiniMax M2.5',       'minimax', 'open-weight', 256000, true, 'seed'),
('qwen3-coder-480b', 'openrouter', 'Qwen3 Coder 480B',   'qwen',    'open-weight', 262000, true, 'seed')
ON CONFLICT (id) DO UPDATE SET
  context_window    = EXCLUDED.context_window,
  last_refreshed_at = now();

-- ============================================================
-- Verification queries (run after migration completes):
--
--   SELECT provider, COUNT(*), array_agg(id ORDER BY id)
--   FROM models GROUP BY provider ORDER BY provider;
--   -- Expected: 27 rows total across 7 providers
--
--   SELECT id, tokenizer_inflation_vs_baseline, effort_levels
--   FROM models WHERE id = 'claude-opus-4-7';
--   -- Expected: 1.35 inflation, {low,medium,high,xhigh,max} effort
-- ============================================================
