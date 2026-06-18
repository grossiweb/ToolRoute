-- 081_update_gemini_2_5_flash_pricing.sql
-- Applied via Supabase (MCP) on 2026-06-18.
--
-- Refresh stale Gemini 2.5 Flash pricing. The seeded values ($0.15/$0.60) are
-- out of date; OpenRouter as of June 2026 is $0.30/1M input, $2.50/1M output.
UPDATE models
SET input_price_per_m = 0.30,
    output_price_per_m = 2.50,
    source = 'audit-2026-06-18'
WHERE id = 'gemini-2.5-flash';
