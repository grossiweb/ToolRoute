-- 055_seeding_improvements.sql
-- Tighten skill_tasks seeding after audit on 2026-05-20.
-- Live routing (LLM classifier) already returns correct skills for the
-- 5 audited task types; this migration fixes data hygiene + small gaps.

BEGIN;

-- ============================================================
-- 1. Cap corrupt relevance scores in repo-management
--    bitbucket-mcp was 90.0, vscode-mcp was 70.0 (entered on 0-100
--    scale instead of 0-10). CLAUDE.md cap is 8.5.
-- ============================================================
UPDATE skill_tasks st
SET relevance_score = 8.0
FROM tasks t, skills s
WHERE st.task_id = t.id
  AND st.skill_id = s.id
  AND t.slug = 'repo-management'
  AND s.slug = 'bitbucket-mcp';

UPDATE skill_tasks st
SET relevance_score = 7.0
FROM tasks t, skills s
WHERE st.task_id = t.id
  AND st.skill_id = s.id
  AND t.slug = 'repo-management'
  AND s.slug = 'vscode-mcp';

-- ============================================================
-- 2. Add sendgrid-mcp to email-drafting (skill exists, not linked)
-- ============================================================
INSERT INTO skill_tasks (skill_id, task_id, relevance_score)
SELECT s.id, t.id, 8.0
FROM skills s, tasks t
WHERE s.slug = 'sendgrid-mcp' AND t.slug = 'email-drafting'
ON CONFLICT (skill_id, task_id) DO NOTHING;

-- ============================================================
-- 3. Add slack-mcp + discord-mcp to forum-social-writing
--    Agents writing "comments on a forum" often mean Slack/Discord
--    threads or actual platforms — not just text generation.
-- ============================================================
INSERT INTO skill_tasks (skill_id, task_id, relevance_score)
SELECT s.id, t.id, 8.5
FROM skills s, tasks t
WHERE s.slug = 'slack-mcp' AND t.slug = 'forum-social-writing'
ON CONFLICT (skill_id, task_id) DO NOTHING;

INSERT INTO skill_tasks (skill_id, task_id, relevance_score)
SELECT s.id, t.id, 8.0
FROM skills s, tasks t
WHERE s.slug = 'discord-mcp' AND t.slug = 'forum-social-writing'
ON CONFLICT (skill_id, task_id) DO NOTHING;

-- ============================================================
-- 4. Verification: confirm no skill_tasks rows exceed the 8.5 cap
--    (will raise notice if any leak through).
-- ============================================================
DO $$
DECLARE
  bad_count int;
BEGIN
  SELECT COUNT(*) INTO bad_count
  FROM skill_tasks
  WHERE relevance_score > 8.5;
  IF bad_count > 0 THEN
    RAISE NOTICE 'WARNING: % skill_tasks rows still exceed 8.5 cap', bad_count;
  END IF;
END $$;

COMMIT;
