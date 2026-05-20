-- ============================================================
-- 048_model_catalog_may2026.sql
-- ============================================================
-- Adds 6 models released in April–May 2026 that were missing
-- from the catalog (caught by the 2026-05-20 monthly audit).
--
-- Source of release dates: web search across multiple LLM
-- tracker sites (llm-stats.com, aiflashreport.com,
-- buildfastwithai.com, whatllm.org, fazm.ai) on 2026-05-20.
--
-- Pricing is set to NULL for every row in this migration because
-- public pricing for these models has not been verified against
-- vendor documentation. A follow-up seed should populate prices
-- once they're confirmed.
--
-- Idempotent: ON CONFLICT (id) DO NOTHING — these IDs should
-- not collide with any existing row.
-- ============================================================

INSERT INTO models (
  id,
  provider,
  display_name,
  family,
  tier,
  input_price_per_m,
  output_price_per_m,
  context_window,
  is_routable,
  released_at,
  source
) VALUES
  -- DeepSeek V4 Pro — released 2026-04-24, weights on Hugging Face.
  -- Pricing not yet confirmed (vendor doc lookup pending).
  ('deepseek-v4-pro',  'deepseek',   'DeepSeek V4 Pro',    'deepseek', 'flagship', NULL, NULL, NULL, true, '2026-04-24T00:00:00Z', 'audit-2026-05-20'),

  -- Kimi K2.6 — Moonshot AI, released 2026-04-20.
  ('kimi-k2.6',        'openrouter', 'Kimi K2.6',          'kimi',     'mid',      NULL, NULL, NULL, true, '2026-04-20T00:00:00Z', 'audit-2026-05-20'),

  -- Llama 4 Maverick — Meta, released April 2026; complement to
  -- Llama 4 Scout already in catalog.
  ('llama-4-maverick', 'meta',       'Llama 4 Maverick',   'llama',    'open-weight', NULL, NULL, NULL, true, '2026-04-01T00:00:00Z', 'audit-2026-05-20'),

  -- GPT-5.5 Instant — OpenAI, became ChatGPT default 2026-05-05.
  -- Distinct row from gpt-5.5 (which is the API-level model).
  ('gpt-5.5-instant',  'openai',     'GPT-5.5 Instant',    'gpt',      'mid',      NULL, NULL, NULL, true, '2026-05-05T00:00:00Z', 'audit-2026-05-20'),

  -- Gemma 4 27B — Google, April 2026, Apache 2.0.
  -- Day-of-month not confirmed; using 2026-04-01.
  ('gemma-4-27b',      'google',     'Gemma 4 27B',        'gemma',    'open-weight', NULL, NULL, NULL, true, '2026-04-01T00:00:00Z', 'audit-2026-05-20'),

  -- GLM-5.1 — Zhipu, April 2026, MIT-licensed; supersedes GLM-5
  -- which is already in the catalog.
  ('glm-5.1',          'openrouter', 'GLM-5.1',            'glm',      'open-weight', NULL, NULL, NULL, true, '2026-04-01T00:00:00Z', 'audit-2026-05-20')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Verification query (run after migration completes):
--
--   SELECT id, provider, tier, released_at, is_routable, source
--   FROM models
--   WHERE source = 'audit-2026-05-20'
--   ORDER BY released_at DESC;
--   -- Expected: 6 rows.
-- ============================================================

-- ============================================================
-- TODO before these models can win routing decisions:
--   1. Verify and populate pricing (input_price_per_m, output_price_per_m).
--   2. Confirm context_window from vendor docs.
--   3. Set supports_tool_use / supports_vision / supports_reasoning per model.
--   4. Decide which (if any) belong in TIER_MAP in src/lib/routing/tiers.ts.
--      They are seeded as is_routable = true but tier resolution still
--      points to the original frontier models from migration 043.
-- ============================================================
