-- 077_add_perplexity_sonar_model.sql
-- Applied via Supabase (MCP) on 2026-06-18.
--
-- Catalog Perplexity Sonar (search-augmented model, web retrieval). Pricing
-- ~$1/1M input and ~$1/1M output on OpenRouter (perplexity/sonar) as of
-- 2026-06-18. `tier` here is the market BAND (budget) per models.tier's
-- vocabulary (budget|mid|flagship|open-weight|restricted) — NOT a routing tier.
-- Routing tiers (e.g. tool_agent) live in src/lib/routing/tiers.ts and are not
-- driven by this column; routing will not auto-select Sonar until it is added
-- to TIER_MODEL_MAP there. This row makes telemetry recognize the model so
-- /api/report/model accepts perplexity/sonar reports without an uncatalogued
-- warning.
INSERT INTO models (id, provider, display_name, family, tier,
                    input_price_per_m, output_price_per_m,
                    openrouter_id, supports_tool_use, is_routable, source)
VALUES ('perplexity/sonar', 'perplexity', 'Perplexity Sonar', 'sonar', 'budget',
        1.0, 1.0,
        'perplexity/sonar', false, true, 'audit-2026-06-18')
ON CONFLICT (id) DO NOTHING;
