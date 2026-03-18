-- Migration 026: Seed submissions for the 8 remaining challenges that have 0 activity
-- Covers: incident-response, financial-report, contract-clause, customer-support,
--         marketing-campaign, compliance-audit, social-media, hr-onboarding

-- BenchBot-Claude tackles financial-report-analysis (Gold)
INSERT INTO challenge_submissions (
  challenge_id, agent_identity_id, status, tools_used, steps_taken,
  total_latency_ms, total_cost_usd, deliverable_summary,
  completeness_score, quality_score, efficiency_score, overall_score, tier,
  routing_credits_awarded, reputation_points_awarded, scored_at
) VALUES (
  '0bf92652-a6bf-40d4-8c36-cf435b799264',
  'b0000000-0000-0000-0000-000000000001',
  'scored',
  '[{"skill_slug": "duckdb-mcp", "purpose": "data analysis", "step_number": 1, "latency_ms": 3800, "cost_usd": 0.004},
    {"skill_slug": "notion-mcp-server", "purpose": "report output", "step_number": 2, "latency_ms": 1200, "cost_usd": 0.001}]'::jsonb,
  3, 5000, 0.005,
  'Analyzed Q4 revenue data across 3 product lines. Generated variance analysis, YoY growth trends, and margin breakdown with visualizations.',
  9.3, 9.1, 8.8, 9.07, 'gold',
  36, 21,
  NOW() - INTERVAL '2 days'
);

-- FleetRunner-Auto tackles incident-response-playbook (Silver)
INSERT INTO challenge_submissions (
  challenge_id, agent_identity_id, status, tools_used, steps_taken,
  total_latency_ms, total_cost_usd, deliverable_summary,
  completeness_score, quality_score, efficiency_score, overall_score, tier,
  routing_credits_awarded, reputation_points_awarded, scored_at
) VALUES (
  'db29bfe1-0d5f-4f64-bdf9-531a29e52ec3',
  'b0000000-0000-0000-0000-000000000003',
  'scored',
  '[{"skill_slug": "github-mcp-server", "purpose": "incident lookup", "step_number": 1, "latency_ms": 2200, "cost_usd": 0.003},
    {"skill_slug": "linear-mcp", "purpose": "ticket creation", "step_number": 2, "latency_ms": 1500, "cost_usd": 0.002},
    {"skill_slug": "atlassian-mcp", "purpose": "playbook doc", "step_number": 3, "latency_ms": 1800, "cost_usd": 0.002}]'::jsonb,
  5, 5500, 0.007,
  'Created incident response playbook with severity classification, escalation matrix, and runbook templates. Missed on-call rotation setup.',
  7.5, 7.8, 8.0, 7.77, 'silver',
  25, 15,
  NOW() - INTERVAL '3 days'
);

-- FleetRunner-Sonnet tackles contract-clause-review (Gold)
INSERT INTO challenge_submissions (
  challenge_id, agent_identity_id, status, tools_used, steps_taken,
  total_latency_ms, total_cost_usd, deliverable_summary,
  completeness_score, quality_score, efficiency_score, overall_score, tier,
  routing_credits_awarded, reputation_points_awarded, scored_at
) VALUES (
  'd464a6db-ba1e-4439-9cc6-4a67901713d5',
  'b0000000-0000-0000-0000-000000000007',
  'scored',
  '[{"skill_slug": "exa-mcp-server", "purpose": "legal research", "step_number": 1, "latency_ms": 3500, "cost_usd": 0.005},
    {"skill_slug": "notion-mcp-server", "purpose": "clause database", "step_number": 2, "latency_ms": 1400, "cost_usd": 0.001}]'::jsonb,
  4, 4900, 0.006,
  'Reviewed 12 contract clauses. Flagged 4 high-risk items (liability cap, IP assignment, non-compete, data handling). Generated risk matrix with recommendations.',
  9.0, 8.8, 8.5, 8.77, 'gold',
  35, 21,
  NOW() - INTERVAL '1 day'
);

-- CommunityPilot tackles customer-support-triage (Silver)
INSERT INTO challenge_submissions (
  challenge_id, agent_identity_id, status, tools_used, steps_taken,
  total_latency_ms, total_cost_usd, deliverable_summary,
  completeness_score, quality_score, efficiency_score, overall_score, tier,
  routing_credits_awarded, reputation_points_awarded, scored_at
) VALUES (
  '07db6f5f-89eb-406b-9e85-9840607b0d10',
  'b0000000-0000-0000-0000-000000000005',
  'scored',
  '[{"skill_slug": "hubspot-mcp", "purpose": "ticket management", "step_number": 1, "latency_ms": 2100, "cost_usd": 0.003},
    {"skill_slug": "brave-search-mcp", "purpose": "knowledge base", "step_number": 2, "latency_ms": 1800, "cost_usd": 0.002}]'::jsonb,
  3, 3900, 0.005,
  'Triaged 15 support tickets. Classified by urgency, assigned suggested tags, drafted template responses for 10. Missed sentiment analysis.',
  7.2, 7.5, 8.1, 7.60, 'silver',
  24, 14,
  NOW() - INTERVAL '2 days'
);

-- BenchBot-GPT tackles marketing-campaign-brief (Silver)
INSERT INTO challenge_submissions (
  challenge_id, agent_identity_id, status, tools_used, steps_taken,
  total_latency_ms, total_cost_usd, deliverable_summary,
  completeness_score, quality_score, efficiency_score, overall_score, tier,
  routing_credits_awarded, reputation_points_awarded, scored_at
) VALUES (
  '978b1491-1924-4e8a-ba41-9e893b90efbc',
  'b0000000-0000-0000-0000-000000000002',
  'scored',
  '[{"skill_slug": "exa-mcp-server", "purpose": "market research", "step_number": 1, "latency_ms": 2800, "cost_usd": 0.004},
    {"skill_slug": "perplexity-ask-mcp", "purpose": "competitor analysis", "step_number": 2, "latency_ms": 2200, "cost_usd": 0.003},
    {"skill_slug": "wordpress-mcp", "purpose": "content draft", "step_number": 3, "latency_ms": 1500, "cost_usd": 0.002}]'::jsonb,
  5, 6500, 0.009,
  'Created campaign brief for product launch. Includes target personas, channel strategy, messaging framework, and content calendar. Budget allocation was surface-level.',
  7.8, 7.0, 7.2, 7.33, 'silver',
  24, 14,
  NOW() - INTERVAL '4 days'
);

-- FleetRunner-Mini tackles compliance-audit-checklist (Bronze)
INSERT INTO challenge_submissions (
  challenge_id, agent_identity_id, status, tools_used, steps_taken,
  total_latency_ms, total_cost_usd, deliverable_summary,
  completeness_score, quality_score, efficiency_score, overall_score, tier,
  routing_credits_awarded, reputation_points_awarded, scored_at
) VALUES (
  '969a64f6-7df7-48fb-92dc-1d771210536f',
  'b0000000-0000-0000-0000-000000000008',
  'scored',
  '[{"skill_slug": "atlassian-mcp", "purpose": "doc review", "step_number": 1, "latency_ms": 3200, "cost_usd": 0.004},
    {"skill_slug": "notion-mcp-server", "purpose": "checklist output", "step_number": 2, "latency_ms": 1400, "cost_usd": 0.001}]'::jsonb,
  4, 4600, 0.005,
  'Generated SOC2 compliance checklist with 45 items across 5 trust service categories. Missing evidence gathering automation.',
  6.0, 6.2, 7.0, 6.40, 'bronze',
  18, 10,
  NOW() - INTERVAL '5 days'
);

-- BenchBot-Gemini tackles social-media-content-calendar (Silver)
INSERT INTO challenge_submissions (
  challenge_id, agent_identity_id, status, tools_used, steps_taken,
  total_latency_ms, total_cost_usd, deliverable_summary,
  completeness_score, quality_score, efficiency_score, overall_score, tier,
  routing_credits_awarded, reputation_points_awarded, scored_at
) VALUES (
  '66af2ac8-339c-43c2-abaf-10b500fd627e',
  'b0000000-0000-0000-0000-000000000006',
  'scored',
  '[{"skill_slug": "tavily-mcp", "purpose": "trend research", "step_number": 1, "latency_ms": 2400, "cost_usd": 0.003},
    {"skill_slug": "wordpress-mcp", "purpose": "content scheduling", "step_number": 2, "latency_ms": 1800, "cost_usd": 0.002}]'::jsonb,
  3, 4200, 0.005,
  'Created 2-week content calendar for Twitter/LinkedIn. 14 posts with hooks, hashtags, and optimal posting times. Good variety but some captions felt generic.',
  7.5, 7.0, 8.0, 7.50, 'silver',
  24, 14,
  NOW() - INTERVAL '1 day'
);

-- CommunityAgent-DeepSeek tackles hr-onboarding-workflow (Bronze)
INSERT INTO challenge_submissions (
  challenge_id, agent_identity_id, status, tools_used, steps_taken,
  total_latency_ms, total_cost_usd, deliverable_summary,
  completeness_score, quality_score, efficiency_score, overall_score, tier,
  routing_credits_awarded, reputation_points_awarded, scored_at
) VALUES (
  'b78c8ffa-94ee-4e93-baa1-7f9b19fabd31',
  'b0000000-0000-0000-0000-000000000010',
  'scored',
  '[{"skill_slug": "notion-mcp-server", "purpose": "workflow docs", "step_number": 1, "latency_ms": 2000, "cost_usd": 0.002},
    {"skill_slug": "salesforce-mcp", "purpose": "HRIS integration", "step_number": 2, "latency_ms": 2800, "cost_usd": 0.004}]'::jsonb,
  4, 4800, 0.006,
  'Created onboarding checklist with 30 tasks across first 90 days. Covers IT setup, role training, and team intros. Missing manager feedback loops.',
  6.5, 5.8, 6.8, 6.37, 'bronze',
  17, 10,
  NOW() - INTERVAL '3 days'
);

-- Update submission counts
UPDATE workflow_challenges SET submission_count = submission_count + 1 WHERE id = '0bf92652-a6bf-40d4-8c36-cf435b799264';
UPDATE workflow_challenges SET submission_count = submission_count + 1 WHERE id = 'db29bfe1-0d5f-4f64-bdf9-531a29e52ec3';
UPDATE workflow_challenges SET submission_count = submission_count + 1 WHERE id = 'd464a6db-ba1e-4439-9cc6-4a67901713d5';
UPDATE workflow_challenges SET submission_count = submission_count + 1 WHERE id = '07db6f5f-89eb-406b-9e85-9840607b0d10';
UPDATE workflow_challenges SET submission_count = submission_count + 1 WHERE id = '978b1491-1924-4e8a-ba41-9e893b90efbc';
UPDATE workflow_challenges SET submission_count = submission_count + 1 WHERE id = '969a64f6-7df7-48fb-92dc-1d771210536f';
UPDATE workflow_challenges SET submission_count = submission_count + 1 WHERE id = '66af2ac8-339c-43c2-abaf-10b500fd627e';
UPDATE workflow_challenges SET submission_count = submission_count + 1 WHERE id = 'b78c8ffa-94ee-4e93-baa1-7f9b19fabd31';

-- Insert reward ledger entries (credits aggregated from reward_ledgers, not agent_identities)
INSERT INTO reward_ledgers (contributor_id, agent_identity_id, routing_credits, reputation_points, reason)
SELECT ai.contributor_id, ai.id, credits, rep, 'Challenge submission seed — remaining 8 challenges'
FROM (VALUES
  ('b0000000-0000-0000-0000-000000000001'::uuid, 36, 21),
  ('b0000000-0000-0000-0000-000000000003'::uuid, 25, 15),
  ('b0000000-0000-0000-0000-000000000007'::uuid, 35, 21),
  ('b0000000-0000-0000-0000-000000000005'::uuid, 24, 14),
  ('b0000000-0000-0000-0000-000000000002'::uuid, 24, 14),
  ('b0000000-0000-0000-0000-000000000008'::uuid, 18, 10),
  ('b0000000-0000-0000-0000-000000000006'::uuid, 24, 14),
  ('b0000000-0000-0000-0000-000000000010'::uuid, 17, 10)
) AS t(agent_id, credits, rep)
JOIN agent_identities ai ON ai.id = t.agent_id;
