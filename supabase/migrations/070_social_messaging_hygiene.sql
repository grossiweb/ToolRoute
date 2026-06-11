-- 070_social_messaging_hygiene.sql
-- Applied via Supabase (MCP) on 2026-06-11.
--
-- Data-only skill_tasks corrections for the social/messaging family (scoping pass
-- found no missing tasks — the win is better routing to existing skills). Does NOT
-- fix the named_tool-vs-semantic_task precedence bug ("message on Discord" -> slack);
-- that is parked as routing Priority 1b. Embeddings unaffected (priors aren't
-- embedded — only tasks text is), so no reseed.

-- 1. Add Discord + Teams as team-communication alternatives (below slack 9.5).
--    Legitimate team-chat platforms that should surface on the <0.70 fallback path.
INSERT INTO skill_tasks (task_id, skill_id, relevance_score)
SELECT t.id, s.id, v.rel
FROM (VALUES
  ('team-communication','discord-mcp', 7.0),
  ('team-communication','teams-mcp',   6.5)
) AS v(task_slug, skill_slug, rel)
JOIN tasks  t ON t.slug = v.task_slug
JOIN skills s ON s.slug = v.skill_slug
ON CONFLICT (skill_id, task_id) DO NOTHING;

-- 2. De-pollute forum-social-writing: remove LLM/search skills that are not
--    social-posting platforms (leaves slack 8.5 + discord 8.0).
DELETE FROM skill_tasks
WHERE task_id = (SELECT id FROM tasks WHERE slug = 'forum-social-writing')
  AND skill_id IN (
    SELECT id FROM skills WHERE slug IN ('openai-mcp','anthropic-mcp','context7','brave-search-mcp')
  );

-- 3. Re-anchor twilio-mcp: remove the wrong email-automation prior (it's an
--    SMS/voice tool). No sms-messaging task exists, so just drop the bad prior.
DELETE FROM skill_tasks
WHERE task_id = (SELECT id FROM tasks WHERE slug = 'email-automation')
  AND skill_id = (SELECT id FROM skills WHERE slug = 'twilio-mcp');
