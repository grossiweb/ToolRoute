-- 065_browser_screenshot_example.sql
-- Applied via Supabase (MCP apply_migration) on 2026-06-10.
--
-- Tune browser-screenshot's example_query: lead with the capture intent (visual
-- testing / monitoring) and drop the "...describe it"-style tail that diluted W6
-- toward caption-images and kept it under the 0.70 matcher threshold. Re-embedded
-- separately after this UPDATE.

UPDATE tasks
SET example_query = 'Take a screenshot of a live web page for visual testing or monitoring'
WHERE slug = 'browser-screenshot';
