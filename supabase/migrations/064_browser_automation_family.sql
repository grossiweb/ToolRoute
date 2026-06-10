-- 064_browser_automation_family.sql
-- Applied via Supabase (MCP apply_migration) on 2026-06-10.
--
-- Phase 3 taxonomy: strengthen the browser-automation family with leaf tasks whose
-- example_queries match the failing query shapes (W3 form-fill, W6 screenshot), and
-- de-overlap caption-images (its old example contained "screenshot", which pulled
-- W6 away from the browser tasks). Skills already exist (playwright/browserbase/
-- puppeteer/selenium); this is example_query coverage, not new skills.
-- Embeddings for the new/changed rows are seeded separately (OpenRouter API).

INSERT INTO tasks (slug, name, description, example_query, display_order) VALUES
  ('browser-form-automation', 'Browser Form Automation',
   'Automate filling and submitting forms on JavaScript-heavy web pages using an automated/headless browser.',
   'Fill out and submit a login form on a JavaScript-heavy website', 100),
  ('browser-screenshot', 'Browser Screenshot Capture',
   'Open a live web page in an automated browser and capture a screenshot of the rendered page.',
   'Take a screenshot of this live web page or dashboard', 101),
  ('browser-data-extraction', 'Browser Data Extraction',
   'Extract data from JavaScript-rendered single-page apps that static scrapers cannot read, using a real browser.',
   'Extract data from a JavaScript-rendered single-page app that static scrapers cannot read', 102)
ON CONFLICT (slug) DO NOTHING;

UPDATE tasks SET example_query = 'Describe the contents of this uploaded product image'
WHERE slug = 'caption-images';

INSERT INTO skill_tasks (task_id, skill_id, relevance_score)
SELECT t.id, s.id, v.rel
FROM (VALUES
  ('browser-form-automation','playwright-mcp', 9.5),
  ('browser-form-automation','browserbase-mcp', 9.0),
  ('browser-form-automation','puppeteer-mcp', 8.8),
  ('browser-form-automation','selenium-mcp', 8.0),
  ('browser-screenshot','playwright-mcp', 9.3),
  ('browser-screenshot','browserbase-mcp', 9.0),
  ('browser-screenshot','puppeteer-mcp', 8.5),
  ('browser-data-extraction','browserbase-mcp', 9.2),
  ('browser-data-extraction','playwright-mcp', 9.0),
  ('browser-data-extraction','puppeteer-mcp', 8.5)
) AS v(task_slug, skill_slug, rel)
JOIN tasks t ON t.slug = v.task_slug
JOIN skills s ON s.slug = v.skill_slug
ON CONFLICT (skill_id, task_id) DO NOTHING;
