-- ============================================================
-- Migration 031: Fix routing by adding missing skill_workflows mappings
-- ============================================================
-- Problem: Many skills exist in the catalog but aren't mapped to the
-- correct workflows, so the routing engine can't find them.
-- Key gaps: communication tools (slack, gmail, calendar), document tools,
-- and cross-workflow skills that should appear in multiple categories.
-- ============================================================

-- Executive Assistant & Productivity
-- (email, calendar, messaging, scheduling, communication)
INSERT INTO skill_workflows (skill_id, workflow_id)
SELECT s.id, w.id
FROM (VALUES
  ('slack-mcp', 'executive-assistant-productivity'),
  ('gmail-mcp', 'executive-assistant-productivity'),
  ('google-calendar-mcp', 'executive-assistant-productivity'),
  ('twilio-mcp', 'executive-assistant-productivity'),
  ('sendgrid-mcp', 'executive-assistant-productivity'),
  ('canva-mcp', 'executive-assistant-productivity')
) AS v(skill_slug, wf_slug)
JOIN skills s ON s.slug = v.skill_slug
JOIN workflows w ON w.slug = v.wf_slug
ON CONFLICT DO NOTHING;

-- Communication tools also belong in Customer Support
INSERT INTO skill_workflows (skill_id, workflow_id)
SELECT s.id, w.id
FROM (VALUES
  ('slack-mcp', 'customer-support-automation'),
  ('gmail-mcp', 'customer-support-automation'),
  ('zoom-mcp', 'customer-support-automation')
) AS v(skill_slug, wf_slug)
JOIN skills s ON s.slug = v.skill_slug
JOIN workflows w ON w.slug = v.wf_slug
ON CONFLICT DO NOTHING;

-- Marketing — email/social tools
INSERT INTO skill_workflows (skill_id, workflow_id)
SELECT s.id, w.id
FROM (VALUES
  ('gmail-mcp', 'marketing-intelligence-campaign-management'),
  ('slack-mcp', 'marketing-intelligence-campaign-management'),
  ('medium-mcp', 'marketing-intelligence-campaign-management')
) AS v(skill_slug, wf_slug)
JOIN skills s ON s.slug = v.skill_slug
JOIN workflows w ON w.slug = v.wf_slug
ON CONFLICT DO NOTHING;

-- Content Creation — social/publishing tools
INSERT INTO skill_workflows (skill_id, workflow_id)
SELECT s.id, w.id
FROM (VALUES
  ('discord-mcp', 'content-creation-publishing'),
  ('slack-mcp', 'content-creation-publishing')
) AS v(skill_slug, wf_slug)
JOIN skills s ON s.slug = v.skill_slug
JOIN workflows w ON w.slug = v.wf_slug
ON CONFLICT DO NOTHING;

-- Data Analysis — document processing tools
INSERT INTO skill_workflows (skill_id, workflow_id)
SELECT s.id, w.id
FROM (VALUES
  ('paddleocr', 'data-analysis-reporting'),
  ('unstructured', 'data-analysis-reporting')
) AS v(skill_slug, wf_slug)
JOIN skills s ON s.slug = v.skill_slug
JOIN workflows w ON w.slug = v.wf_slug
ON CONFLICT DO NOTHING;

-- Knowledge Management — document/summarization tools
INSERT INTO skill_workflows (skill_id, workflow_id)
SELECT s.id, w.id
FROM (VALUES
  ('paddleocr', 'knowledge-management'),
  ('unstructured', 'knowledge-management'),
  ('haystack-rag', 'knowledge-management'),
  ('mem0-mcp', 'knowledge-management')
) AS v(skill_slug, wf_slug)
JOIN skills s ON s.slug = v.skill_slug
JOIN workflows w ON w.slug = v.wf_slug
ON CONFLICT DO NOTHING;

-- Research — RAG and AI tools
INSERT INTO skill_workflows (skill_id, workflow_id)
SELECT s.id, w.id
FROM (VALUES
  ('haystack-rag', 'research-competitive-intelligence'),
  ('context7', 'research-competitive-intelligence'),
  ('mem0-mcp', 'research-competitive-intelligence'),
  ('perplexity-ask-mcp', 'research-competitive-intelligence')
) AS v(skill_slug, wf_slug)
JOIN skills s ON s.slug = v.skill_slug
JOIN workflows w ON w.slug = v.wf_slug
ON CONFLICT DO NOTHING;

-- Finance — payment/billing tools
INSERT INTO skill_workflows (skill_id, workflow_id)
SELECT s.id, w.id
FROM (VALUES
  ('stripe-mcp', 'finance-accounting-automation'),
  ('quickbooks-mcp', 'finance-accounting-automation'),
  ('plaid-mcp', 'finance-accounting-automation'),
  ('shopify-mcp', 'finance-accounting-automation')
) AS v(skill_slug, wf_slug)
JOIN skills s ON s.slug = v.skill_slug
JOIN workflows w ON w.slug = v.wf_slug
ON CONFLICT DO NOTHING;

-- E-commerce
INSERT INTO skill_workflows (skill_id, workflow_id)
SELECT s.id, w.id
FROM (VALUES
  ('shopify-mcp', 'ecommerce-operations'),
  ('woocommerce-mcp', 'ecommerce-operations'),
  ('amazon-seller-mcp', 'ecommerce-operations'),
  ('stripe-mcp', 'ecommerce-operations')
) AS v(skill_slug, wf_slug)
JOIN skills s ON s.slug = v.skill_slug
JOIN workflows w ON w.slug = v.wf_slug
ON CONFLICT DO NOTHING;

-- Legal
INSERT INTO skill_workflows (skill_id, workflow_id)
SELECT s.id, w.id
FROM (VALUES
  ('docusign-mcp', 'legal-research-document-management'),
  ('legalforce-mcp', 'legal-research-document-management'),
  ('courtlistener-mcp', 'legal-research-document-management')
) AS v(skill_slug, wf_slug)
JOIN skills s ON s.slug = v.skill_slug
JOIN workflows w ON w.slug = v.wf_slug
ON CONFLICT DO NOTHING;

-- HR & Recruiting
INSERT INTO skill_workflows (skill_id, workflow_id)
SELECT s.id, w.id
FROM (VALUES
  ('greenhouse-mcp', 'hr-recruiting-automation'),
  ('lever-mcp', 'hr-recruiting-automation'),
  ('bamboohr-mcp', 'hr-recruiting-automation'),
  ('google-calendar-mcp', 'hr-recruiting-automation'),
  ('slack-mcp', 'hr-recruiting-automation')
) AS v(skill_slug, wf_slug)
JOIN skills s ON s.slug = v.skill_slug
JOIN workflows w ON w.slug = v.wf_slug
ON CONFLICT DO NOTHING;

-- Security
INSERT INTO skill_workflows (skill_id, workflow_id)
SELECT s.id, w.id
FROM (VALUES
  ('snyk-mcp', 'security-operations'),
  ('sonarqube-mcp', 'security-operations'),
  ('trivy-mcp', 'security-operations')
) AS v(skill_slug, wf_slug)
JOIN skills s ON s.slug = v.skill_slug
JOIN workflows w ON w.slug = v.wf_slug
ON CONFLICT DO NOTHING;

-- Developer tools — additional cross-mappings
INSERT INTO skill_workflows (skill_id, workflow_id)
SELECT s.id, w.id
FROM (VALUES
  ('snyk-mcp', 'developer-workflow-code-management'),
  ('sonarqube-mcp', 'developer-workflow-code-management'),
  ('context7', 'developer-workflow-code-management')
) AS v(skill_slug, wf_slug)
JOIN skills s ON s.slug = v.skill_slug
JOIN workflows w ON w.slug = v.wf_slug
ON CONFLICT DO NOTHING;
