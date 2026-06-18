-- 080_add_claude_opus_4_8.sql
-- Applied via Supabase (MCP) on 2026-06-18.
--
-- Catalog Claude Opus 4.8 (Anthropic flagship). Becomes the best_available
-- routing primary in src/lib/routing/tiers.ts (replacing claude-opus-4-7, which
-- stays in the catalog for telemetry but is no longer the active target).
-- Pricing $5/1M in, $25/1M out. tier is the market band (flagship).
INSERT INTO models (id, provider, display_name, family, tier,
                    input_price_per_m, output_price_per_m,
                    openrouter_id, supports_tool_use, is_routable, source)
VALUES ('claude-opus-4-8', 'anthropic', 'Claude Opus 4.8', 'claude-opus', 'flagship',
        5.0, 25.0,
        'anthropic/claude-opus-4-8', true, true, 'audit-2026-06-18')
ON CONFLICT (id) DO NOTHING;
