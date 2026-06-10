-- 067_devops_cloud_family.sql
-- Applied via Supabase (MCP apply_migration) on 2026-06-10.
--
-- Phase 3 taxonomy: devops/cloud family leaf tasks. infra-management ("List EC2
-- instances") was too generic — D1 "deploy a Lambda to AWS" and D3 "apply a
-- Terraform plan" scored <0.70 and fell to the LLM -> cloudflare. These 3 leaves
-- give cloud deploy, IaC, and DNS their own owners, mapped to the existing
-- aws/gcp/azure/vercel/terraform/cloudflare skills. Data-only; embeddings seeded
-- separately. No classifier change (named_tool nudge tracked separately).

INSERT INTO tasks (slug, name, description, example_query, display_order) VALUES
  ('cloud-deployment', 'Cloud Deployment',
   'Deploy applications, serverless functions, or services to a cloud platform (AWS, GCP, Azure, Vercel).',
   'Deploy a serverless function to AWS Lambda', 107),
  ('infrastructure-as-code', 'Infrastructure as Code',
   'Provision and manage cloud infrastructure declaratively with Terraform or similar IaC tools.',
   'Provision cloud infrastructure with a Terraform plan', 108),
  ('dns-management', 'DNS Management',
   'Create and update DNS records and domain configuration on an edge/DNS provider.',
   'Update a DNS record for a domain', 109)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO skill_tasks (task_id, skill_id, relevance_score)
SELECT t.id, s.id, v.rel
FROM (VALUES
  ('cloud-deployment','aws-lambda-mcp', 9.5),
  ('cloud-deployment','aws-mcp', 9.2),
  ('cloud-deployment','gcp-mcp', 9.0),
  ('cloud-deployment','vercel-mcp', 8.8),
  ('cloud-deployment','azure-mcp', 8.5),
  ('infrastructure-as-code','terraform-mcp', 9.5),
  ('infrastructure-as-code','aws-mcp', 8.0),
  ('infrastructure-as-code','gcp-mcp', 7.5),
  ('dns-management','cloudflare-mcp', 9.5),
  ('dns-management','aws-mcp', 7.0)
) AS v(task_slug, skill_slug, rel)
JOIN tasks t ON t.slug = v.task_slug
JOIN skills s ON s.slug = v.skill_slug
ON CONFLICT (skill_id, task_id) DO NOTHING;
