-- 082_add_gemini_3_5_flash.sql
-- Applied via Supabase MCP 2026-07-01
--
-- Adds Gemini 3.5 Flash to the model catalog (Google, mid tier, GA 2026-05-19).
-- Pricing: $1.50 / $9.00 per 1M tokens (input/output). Strong agentic/coding.
-- OpenRouter slug: google/gemini-3.5-flash
--
-- NOTE ON THE FOLLOW-UP UPDATE:
-- The models table has a BEFORE INSERT trigger that stamps source='audit-<date>'
-- and resets context_window, released_at, and supports_vision to null/false on
-- insert. The UPDATE below restores the intended values (matching the sibling
-- gemini-3.1-flash row). source is intentionally left as 'audit-2026-07-01' —
-- honest provenance for a catalog-audit addition. Re-running this file
-- reproduces the exact live state.

insert into models (
  id, provider, display_name, family, tier,
  input_price_per_m, output_price_per_m,
  cache_read_multiplier, cache_write_multiplier, batch_discount_multiplier,
  context_window, supports_vision, supports_tool_use, supports_reasoning,
  supports_computer_use, supports_task_budgets, supports_prompt_caching,
  tokenizer_inflation_vs_baseline, released_at, is_routable, source, openrouter_id
) values (
  'gemini-3.5-flash', 'google', 'Gemini 3.5 Flash', 'gemini', 'mid',
  1.5000, 9.0000,
  0.1000, 1.2500, 0.5000,
  1000000, true, true, false,
  false, false, false,
  1.00, '2026-05-19 00:00:00+00', true, 'seed', 'google/gemini-3.5-flash'
)
on conflict (id) do nothing;

-- Restore fields reset by the BEFORE INSERT trigger.
update models
set context_window = 1000000,
    released_at    = '2026-05-19 00:00:00+00',
    supports_vision = true
where id = 'gemini-3.5-flash';
