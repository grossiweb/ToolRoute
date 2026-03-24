-- Migration 033: Split executive-assistant-productivity into specific workflows
-- The mega-bucket catches email, messaging, forums, PDFs, calendar all together.
-- This creates 4 new workflows so routing returns the right skill per task type.

-- 1. Create new workflows
INSERT INTO workflows (slug, name, description) VALUES
  ('communication-email', 'Email Communication', 'Compose, send, read, and manage email messages. Includes drafting, inbox triage, forwarding, and automated responses.')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO workflows (slug, name, description) VALUES
  ('communication-messaging', 'Real-Time Messaging', 'Send messages via Slack, Discord, Microsoft Teams, SMS, and other real-time communication channels.')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO workflows (slug, name, description) VALUES
  ('social-forum-engagement', 'Social & Forum Engagement', 'Post comments on forums, engage in discussions, write social media posts, and participate in online communities.')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO workflows (slug, name, description) VALUES
  ('document-processing-summarization', 'Document Processing & Summarization', 'Parse PDFs, extract text from documents, summarize long content, generate meeting notes, and process unstructured documents.')
ON CONFLICT (slug) DO NOTHING;

-- 2. Map skills to new workflows
-- communication-email
INSERT INTO skill_workflows (skill_id, workflow_id)
SELECT s.id, w.id FROM skills s, workflows w
WHERE s.slug IN ('gmail-mcp', 'sendgrid-mcp', 'mailchimp-mcp')
AND w.slug = 'communication-email'
ON CONFLICT DO NOTHING;

-- communication-messaging
INSERT INTO skill_workflows (skill_id, workflow_id)
SELECT s.id, w.id FROM skills s, workflows w
WHERE s.slug IN ('slack-mcp', 'discord-mcp', 'teams-mcp', 'twilio-mcp')
AND w.slug = 'communication-messaging'
ON CONFLICT DO NOTHING;

-- social-forum-engagement
INSERT INTO skill_workflows (skill_id, workflow_id)
SELECT s.id, w.id FROM skills s, workflows w
WHERE s.slug IN ('discord-mcp', 'slack-mcp', 'medium-mcp', 'youtube-mcp')
AND w.slug = 'social-forum-engagement'
ON CONFLICT DO NOTHING;

-- document-processing-summarization
INSERT INTO skill_workflows (skill_id, workflow_id)
SELECT s.id, w.id FROM skills s, workflows w
WHERE s.slug IN ('paddleocr', 'unstructured', 'obsidian-mcp', 'notion-mcp-server', 'markdown-mcp', 'confluence-mcp')
AND w.slug = 'document-processing-summarization'
ON CONFLICT DO NOTHING;

-- 3. Remove skills from executive-assistant-productivity that now have better homes
-- Keep only: google-calendar-mcp, calendly-mcp, todoist-mcp, zoom-mcp
DELETE FROM skill_workflows
WHERE workflow_id = (SELECT id FROM workflows WHERE slug = 'executive-assistant-productivity')
AND skill_id IN (
  SELECT id FROM skills WHERE slug IN (
    'gmail-mcp', 'sendgrid-mcp', 'mailchimp-mcp',
    'slack-mcp', 'discord-mcp', 'teams-mcp', 'twilio-mcp',
    'medium-mcp', 'youtube-mcp',
    'paddleocr', 'unstructured', 'obsidian-mcp', 'markdown-mcp'
  )
);
