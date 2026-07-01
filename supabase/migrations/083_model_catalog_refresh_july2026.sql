-- 083_model_catalog_refresh_july2026.sql
-- Applied via Supabase MCP 2026-07-01
--
-- July 2026 catalog refresh, part 1 of 2 (UPDATE-only, data-only, no code change).
-- Source: cross-reference of the ToolRoute models table against OpenRouter's
-- live /api/v1/models list (338 models) on 2026-07-01.
--
-- 1) Fixes a broken openrouter_id: claude-opus-4-8 stored 'anthropic/claude-opus-4-8'
--    (dashes) but OpenRouter serves it as 'anthropic/claude-opus-4.8' (dot). The
--    dashed slug 404s; this corrects the format.
-- 2) Backfills pricing + openrouter_id for 9 previously null-priced models that now
--    have confirmed OpenRouter pricing.

-- Fix opus-4-8 slug (dash -> dot)
update models set openrouter_id = 'anthropic/claude-opus-4.8' where id = 'claude-opus-4-8';

-- Backfill pricing + openrouter_id (per 1M tokens, from OpenRouter 2026-07-01)
update models set input_price_per_m=0.7000, output_price_per_m=2.5000, openrouter_id='deepseek/deepseek-r1'        where id='deepseek-r1';
update models set input_price_per_m=0.4350, output_price_per_m=0.8700, openrouter_id='deepseek/deepseek-v4-pro'    where id='deepseek-v4-pro';
update models set input_price_per_m=0.6000, output_price_per_m=1.9200, openrouter_id='z-ai/glm-5'                 where id='glm-5';
update models set input_price_per_m=0.9750, output_price_per_m=4.3000, openrouter_id='z-ai/glm-5.1'               where id='glm-5.1';
update models set input_price_per_m=0.3750, output_price_per_m=2.0250, openrouter_id='moonshotai/kimi-k2.5'       where id='kimi-k2.5';
update models set input_price_per_m=0.5500, output_price_per_m=3.2000, openrouter_id='moonshotai/kimi-k2.6'       where id='kimi-k2.6';
update models set input_price_per_m=0.1500, output_price_per_m=0.6000, openrouter_id='meta-llama/llama-4-maverick' where id='llama-4-maverick';
update models set input_price_per_m=0.1000, output_price_per_m=0.3000, openrouter_id='meta-llama/llama-4-scout'    where id='llama-4-scout';
update models set input_price_per_m=0.1200, output_price_per_m=0.4800, openrouter_id='minimax/minimax-m2.5'       where id='minimax-m2.5';
