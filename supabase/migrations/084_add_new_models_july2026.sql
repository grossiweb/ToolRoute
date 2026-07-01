-- 084_add_new_models_july2026.sql
-- Applied via Supabase MCP 2026-07-01
--
-- July 2026 catalog refresh, part 2 of 2 (data-only, no code change).
-- Adds 5 new models confirmed live on OpenRouter (pricing per 1M, 2026-07-01):
--   GLM 5.2               z-ai/glm-5.2                      0.93 / 3.00
--   MiniMax M3            minimax/minimax-m3                0.30 / 1.20
--   Kimi K2.7 Code        moonshotai/kimi-k2.7-code         0.74 / 3.50
--   Gemini 3 Flash Preview google/gemini-3-flash-preview    0.50 / 3.00
--   Nemotron 3 Ultra      nvidia/nemotron-3-ultra-550b-a55b 0.50 / 2.20
--
-- TRIGGER BEHAVIOR: the models table has a BEFORE INSERT trigger that (a) resets
-- context_window/released_at/supports_vision/supports_reasoning on insert, and
-- (b) for recognized provider prefixes, derives `provider` from the openrouter_id
-- and stamps source='audit-<date>'. The follow-up UPDATEs below restore
-- context_window (all rows) and supports_vision (Gemini). Provider/source
-- normalization by the trigger is intentionally left as-is. Re-running this file
-- reproduces the live state.

insert into models (id, provider, display_name, family, tier, input_price_per_m, output_price_per_m,
  supports_tool_use, supports_reasoning, is_routable, openrouter_id) values
 ('glm-5.2','openrouter','GLM 5.2','glm','open-weight',0.9300,3.0000,true,true,true,'z-ai/glm-5.2'),
 ('minimax-m3','openrouter','MiniMax M3','minimax','open-weight',0.3000,1.2000,true,false,true,'minimax/minimax-m3'),
 ('kimi-k2.7-code','openrouter','Kimi K2.7 Code','kimi','mid',0.7400,3.5000,true,true,true,'moonshotai/kimi-k2.7-code'),
 ('gemini-3-flash-preview','google','Gemini 3 Flash Preview','gemini','mid',0.5000,3.0000,true,false,true,'google/gemini-3-flash-preview'),
 ('nemotron-3-ultra-550b','openrouter','Nemotron 3 Ultra','nemotron','open-weight',0.5000,2.2000,true,true,true,'nvidia/nemotron-3-ultra-550b-a55b')
on conflict (id) do nothing;

-- Restore fields reset by the BEFORE INSERT trigger
update models set context_window=131000  where id='glm-5.2';
update models set context_window=256000  where id='minimax-m3';
update models set context_window=256000  where id='kimi-k2.7-code';
update models set context_window=1000000, supports_vision=true where id='gemini-3-flash-preview';
update models set context_window=131000  where id='nemotron-3-ultra-550b';
