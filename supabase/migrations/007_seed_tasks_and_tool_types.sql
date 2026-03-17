-- ToolRoute Migration 007: Seed Tasks, Tool Types, and their skill mappings
-- Ensures no empty pages — every task and tool type has tools mapped
-- All inserts use ON CONFLICT DO NOTHING for idempotent execution

-- ─────────────────────────────────────────────
-- TASKS: Atomic tasks that tools can perform
-- ─────────────────────────────────────────────
INSERT INTO tasks (name, slug, description, example_query, display_order) VALUES
  ('Web Search', 'web-search', 'Search the web for information, news, and data using AI-optimized search APIs.', 'Search for recent AI funding rounds in Q1 2025', 1),
  ('Web Scraping', 'web-scraping', 'Extract structured data from websites, including text, tables, and metadata.', 'Scrape pricing data from competitor websites', 2),
  ('Code Review', 'code-review', 'Review pull requests, analyze code quality, and suggest improvements.', 'Review PR #142 for security vulnerabilities', 3),
  ('Repository Management', 'repo-management', 'Create, manage, and organize code repositories, branches, and releases.', 'Create a new branch and open a PR with the fix', 4),
  ('Browser Automation', 'browser-automation', 'Automate browser interactions — click, fill forms, navigate, and screenshot.', 'Navigate to the dashboard and take a screenshot', 5),
  ('End-to-End Testing', 'e2e-testing', 'Run automated end-to-end tests against web applications.', 'Run the checkout flow test suite', 6),
  ('Database Queries', 'database-queries', 'Execute SQL queries, manage schemas, and analyze database data.', 'Query all orders from the last 30 days grouped by status', 7),
  ('Data Analysis', 'data-analysis', 'Analyze datasets, generate reports, and create visualizations.', 'Analyze user retention by cohort for the last 6 months', 8),
  ('Lead Enrichment', 'lead-enrichment', 'Enrich prospect data with emails, company info, and social profiles.', 'Find the CTO email and LinkedIn for Acme Corp', 9),
  ('CRM Management', 'crm-management', 'Manage contacts, deals, and pipelines in CRM systems.', 'Create a new deal in HubSpot for the Acme opportunity', 10),
  ('Content Writing', 'content-writing', 'Draft, edit, and publish blog posts, articles, and marketing copy.', 'Write a 1500-word blog post about MCP server best practices', 11),
  ('CMS Publishing', 'cms-publishing', 'Publish and manage content in WordPress, Ghost, Sanity, and other CMS platforms.', 'Publish the draft post to WordPress with featured image', 12),
  ('Ticket Triage', 'ticket-triage', 'Categorize, prioritize, and route support tickets automatically.', 'Triage the 15 new Zendesk tickets by severity', 13),
  ('Customer Support', 'customer-support', 'Respond to support tickets, manage conversations, and escalate issues.', 'Draft a response for ticket #4521 about billing', 14),
  ('Knowledge Base Search', 'knowledge-base-search', 'Search and retrieve information from Notion, Confluence, and documentation.', 'Find the API rate limiting docs in Confluence', 15),
  ('Note Management', 'note-management', 'Create, organize, and search notes in Obsidian, Notion, and similar tools.', 'Create a meeting notes page linked to the project', 16),
  ('Infrastructure Management', 'infra-management', 'Manage cloud infrastructure — servers, containers, and networking.', 'List all running EC2 instances in us-east-1', 17),
  ('Container Orchestration', 'container-orchestration', 'Manage Kubernetes clusters, deployments, and services.', 'Scale the web deployment to 5 replicas', 18),
  ('UI Component Lookup', 'ui-component-lookup', 'Browse and inspect design system components, props, and usage.', 'Find the Button component variants in Storybook', 19),
  ('Design-to-Code', 'design-to-code', 'Convert Figma designs into production-ready code.', 'Generate React components from the Figma dashboard design', 20),
  ('Email Automation', 'email-automation', 'Send, manage, and automate email campaigns and sequences.', 'Send the onboarding email sequence to new signups', 21),
  ('SEO Analysis', 'seo-analysis', 'Analyze keyword rankings, backlinks, and SEO performance.', 'Get the top 20 ranking keywords for toolroute.io', 22),
  ('Payment Processing', 'payment-processing', 'Manage payments, subscriptions, and invoices.', 'Create a new subscription for the Pro plan', 23),
  ('Financial Reporting', 'financial-reporting', 'Generate financial reports, track expenses, and manage accounting.', 'Pull the Q1 profit and loss report from QuickBooks', 24),
  ('Document Signing', 'document-signing', 'Send documents for electronic signatures and track signing status.', 'Send the NDA to john@acme.com for signature', 25),
  ('Legal Research', 'legal-research', 'Search court opinions, analyze contracts, and check compliance.', 'Find recent patent infringement rulings in the 9th Circuit', 26),
  ('Recruiting', 'recruiting', 'Manage candidates, jobs, and the hiring pipeline.', 'Move the top 3 candidates to the interview stage', 27),
  ('HR Management', 'hr-management', 'Manage employee data, time-off, and onboarding workflows.', 'Submit a PTO request for next Friday', 28),
  ('E-commerce Management', 'ecommerce-management', 'Manage products, orders, and inventory across e-commerce platforms.', 'Update inventory for SKU-1234 to 500 units', 29),
  ('Security Scanning', 'security-scanning', 'Scan code and containers for vulnerabilities and security issues.', 'Run a vulnerability scan on the main branch', 30),
  ('Team Communication', 'team-communication', 'Send messages, manage channels, and automate Slack workflows.', 'Post the daily standup summary to #engineering', 31),
  ('Calendar Management', 'calendar-management', 'Schedule meetings, check availability, and manage events.', 'Find a 30-minute slot with the product team this week', 32),
  ('Documentation Lookup', 'documentation-lookup', 'Pull current, version-specific docs and code examples.', 'Get the Next.js 14 App Router docs for server components', 33),
  ('Error Monitoring', 'error-monitoring', 'Track errors, monitor performance, and manage incidents.', 'Get the top 5 unresolved errors from Sentry this week', 34),
  ('Ad Campaign Management', 'ad-campaign-management', 'Create and optimize advertising campaigns across platforms.', 'Pause underperforming Google Ads campaigns with CPA > $50', 35)
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────
-- TOOL TYPES: Categories for leaderboard rankings
-- ─────────────────────────────────────────────
INSERT INTO tool_types (name, slug, description, icon) VALUES
  ('Search Engines', 'search-engines', 'Web search and information retrieval tools for research and data gathering.', '🔍'),
  ('Web Scrapers', 'web-scrapers', 'Tools for extracting structured data from websites and APIs.', '🕷️'),
  ('Code Management', 'code-management', 'Repository management, code review, and version control tools.', '💻'),
  ('Browser Automation', 'browser-automation', 'Browser control, testing, and web interaction tools.', '🌐'),
  ('Database Tools', 'database-tools', 'SQL clients, database management, and data query tools.', '🗄️'),
  ('CRM & Sales', 'crm-sales', 'Customer relationship management and sales pipeline tools.', '📊'),
  ('Content & CMS', 'content-cms', 'Content management, publishing, and editorial tools.', '✍️'),
  ('Customer Support', 'customer-support', 'Helpdesk, ticketing, and customer communication tools.', '🎧'),
  ('Knowledge Management', 'knowledge-management', 'Wiki, documentation, and note-taking tools.', '📚'),
  ('DevOps & Infrastructure', 'devops-infrastructure', 'Cloud, container, and infrastructure management tools.', '⚙️'),
  ('Design & UI', 'design-ui', 'Design systems, component libraries, and UI tools.', '🎨'),
  ('Marketing & SEO', 'marketing-seo', 'Email marketing, SEO, and advertising tools.', '📣'),
  ('Finance & Payments', 'finance-payments', 'Payment processing, accounting, and financial tools.', '💰'),
  ('Legal & Compliance', 'legal-compliance', 'Contract management, legal research, and compliance tools.', '⚖️'),
  ('HR & Recruiting', 'hr-recruiting', 'Hiring, employee management, and HR workflow tools.', '👥'),
  ('E-commerce', 'ecommerce', 'Online store management, inventory, and order tools.', '🛒'),
  ('Security', 'security', 'Vulnerability scanning, code security, and compliance tools.', '🔒'),
  ('Communication', 'communication', 'Messaging, email, and calendar management tools.', '💬')
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────
-- SKILL → TASK MAPPINGS (relevance_score 0-10)
-- ─────────────────────────────────────────────
INSERT INTO skill_tasks (skill_id, task_id, relevance_score)
SELECT s.id, ta.id, v.rel FROM (VALUES
  -- Web Search
  ('brave-search-mcp', 'web-search', 9.5),
  ('tavily-mcp', 'web-search', 9.2),
  ('perplexity-mcp', 'web-search', 9.0),

  -- Web Scraping
  ('firecrawl-mcp', 'web-scraping', 9.4),
  ('browserbase-mcp', 'web-scraping', 8.5),
  ('puppeteer-mcp', 'web-scraping', 8.2),
  ('playwright-mcp', 'web-scraping', 8.0),

  -- Code Review
  ('github-mcp-server', 'code-review', 9.3),
  ('gitlab-mcp', 'code-review', 9.0),
  ('linear-mcp', 'code-review', 7.0),
  ('sonarqube-mcp', 'code-review', 8.5),

  -- Repository Management
  ('github-mcp-server', 'repo-management', 9.5),
  ('gitlab-mcp', 'repo-management', 9.2),

  -- Browser Automation
  ('playwright-mcp', 'browser-automation', 9.5),
  ('puppeteer-mcp', 'browser-automation', 9.2),
  ('browserbase-mcp', 'browser-automation', 8.8),

  -- E2E Testing
  ('playwright-mcp', 'e2e-testing', 9.5),
  ('puppeteer-mcp', 'e2e-testing', 8.8),
  ('browserbase-mcp', 'e2e-testing', 8.2),

  -- Database Queries
  ('supabase-mcp', 'database-queries', 9.3),
  ('neon-mcp', 'database-queries', 9.0),
  ('genai-toolbox', 'database-queries', 8.8),

  -- Data Analysis
  ('genai-toolbox', 'data-analysis', 9.0),
  ('supabase-mcp', 'data-analysis', 8.2),
  ('neon-mcp', 'data-analysis', 8.0),

  -- Lead Enrichment
  ('apollo-mcp', 'lead-enrichment', 9.3),
  ('hubspot-mcp', 'lead-enrichment', 8.0),
  ('brave-search-mcp', 'lead-enrichment', 7.5),

  -- CRM Management
  ('hubspot-mcp', 'crm-management', 9.5),
  ('salesforce-mcp', 'crm-management', 9.3),
  ('apollo-mcp', 'crm-management', 7.5),

  -- Content Writing
  ('wordpress-mcp', 'content-writing', 8.5),
  ('ghost-mcp', 'content-writing', 8.2),
  ('sanity-mcp', 'content-writing', 7.8),
  ('notion-mcp-server', 'content-writing', 7.5),

  -- CMS Publishing
  ('wordpress-mcp', 'cms-publishing', 9.5),
  ('ghost-mcp', 'cms-publishing', 9.2),
  ('sanity-mcp', 'cms-publishing', 9.0),

  -- Ticket Triage
  ('zendesk-mcp', 'ticket-triage', 9.5),
  ('intercom-mcp', 'ticket-triage', 9.0),
  ('linear-mcp', 'ticket-triage', 7.5),

  -- Customer Support
  ('zendesk-mcp', 'customer-support', 9.3),
  ('intercom-mcp', 'customer-support', 9.0),

  -- Knowledge Base Search
  ('confluence-mcp', 'knowledge-base-search', 9.5),
  ('notion-mcp-server', 'knowledge-base-search', 9.0),
  ('obsidian-mcp', 'knowledge-base-search', 8.5),
  ('context7', 'knowledge-base-search', 8.0),

  -- Note Management
  ('obsidian-mcp', 'note-management', 9.5),
  ('notion-mcp-server', 'note-management', 9.2),
  ('confluence-mcp', 'note-management', 8.0),

  -- Infrastructure Management
  ('terraform-mcp', 'infra-management', 9.5),
  ('cloudflare-mcp', 'infra-management', 9.0),
  ('aws-mcp', 'infra-management', 9.3),

  -- Container Orchestration
  ('kubernetes-mcp', 'container-orchestration', 9.5),
  ('terraform-mcp', 'container-orchestration', 7.5),

  -- UI Component Lookup
  ('storybook-mcp', 'ui-component-lookup', 9.5),
  ('tailwindcss-mcp', 'ui-component-lookup', 8.0),

  -- Design-to-Code
  ('storybook-mcp', 'design-to-code', 8.5),
  ('tailwindcss-mcp', 'design-to-code', 8.0),

  -- Email Automation
  ('mailchimp-mcp', 'email-automation', 9.5),
  ('gmail-mcp', 'email-automation', 8.0),

  -- SEO Analysis
  ('semrush-mcp', 'seo-analysis', 9.5),
  ('brave-search-mcp', 'seo-analysis', 7.0),

  -- Payment Processing
  ('stripe-mcp', 'payment-processing', 9.5),

  -- Financial Reporting
  ('quickbooks-mcp', 'financial-reporting', 9.5),
  ('plaid-mcp', 'financial-reporting', 8.0),
  ('stripe-mcp', 'financial-reporting', 7.5),

  -- Document Signing
  ('docusign-mcp', 'document-signing', 9.5),

  -- Legal Research
  ('courtlistener-mcp', 'legal-research', 9.5),
  ('legalforce-mcp', 'legal-research', 9.0),

  -- Recruiting
  ('greenhouse-mcp', 'recruiting', 9.5),
  ('lever-mcp', 'recruiting', 9.2),

  -- HR Management
  ('bamboohr-mcp', 'hr-management', 9.5),
  ('greenhouse-mcp', 'hr-management', 7.0),

  -- E-commerce Management
  ('shopify-mcp', 'ecommerce-management', 9.5),
  ('woocommerce-mcp', 'ecommerce-management', 9.2),
  ('amazon-seller-mcp', 'ecommerce-management', 9.0),

  -- Security Scanning
  ('snyk-mcp', 'security-scanning', 9.5),
  ('sonarqube-mcp', 'security-scanning', 9.0),
  ('trivy-mcp', 'security-scanning', 8.8),

  -- Team Communication
  ('slack-mcp', 'team-communication', 9.5),
  ('gmail-mcp', 'team-communication', 7.5),

  -- Calendar Management
  ('google-calendar-mcp', 'calendar-management', 9.5),

  -- Documentation Lookup
  ('context7', 'documentation-lookup', 9.5),
  ('confluence-mcp', 'documentation-lookup', 8.0),
  ('notion-mcp-server', 'documentation-lookup', 7.5),

  -- Error Monitoring
  ('sentry-mcp', 'error-monitoring', 9.5),

  -- Ad Campaign Management
  ('google-ads-mcp', 'ad-campaign-management', 9.5),
  ('semrush-mcp', 'ad-campaign-management', 7.5)
) AS v(skill_slug, task_slug, rel)
JOIN skills s ON s.slug = v.skill_slug
JOIN tasks ta ON ta.slug = v.task_slug
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────
-- SKILL → TOOL TYPE MAPPINGS (for leaderboards)
-- ─────────────────────────────────────────────
INSERT INTO skill_tool_types (skill_id, tool_type_id)
SELECT s.id, tt.id FROM (VALUES
  -- Search Engines
  ('brave-search-mcp', 'search-engines'),
  ('tavily-mcp', 'search-engines'),
  ('perplexity-mcp', 'search-engines'),

  -- Web Scrapers
  ('firecrawl-mcp', 'web-scrapers'),
  ('browserbase-mcp', 'web-scrapers'),
  ('puppeteer-mcp', 'web-scrapers'),

  -- Code Management
  ('github-mcp-server', 'code-management'),
  ('gitlab-mcp', 'code-management'),
  ('linear-mcp', 'code-management'),

  -- Browser Automation
  ('playwright-mcp', 'browser-automation'),
  ('puppeteer-mcp', 'browser-automation'),
  ('browserbase-mcp', 'browser-automation'),

  -- Database Tools
  ('supabase-mcp', 'database-tools'),
  ('neon-mcp', 'database-tools'),
  ('genai-toolbox', 'database-tools'),

  -- CRM & Sales
  ('hubspot-mcp', 'crm-sales'),
  ('salesforce-mcp', 'crm-sales'),
  ('apollo-mcp', 'crm-sales'),

  -- Content & CMS
  ('wordpress-mcp', 'content-cms'),
  ('ghost-mcp', 'content-cms'),
  ('sanity-mcp', 'content-cms'),

  -- Customer Support
  ('zendesk-mcp', 'customer-support'),
  ('intercom-mcp', 'customer-support'),

  -- Knowledge Management
  ('notion-mcp-server', 'knowledge-management'),
  ('obsidian-mcp', 'knowledge-management'),
  ('confluence-mcp', 'knowledge-management'),
  ('context7', 'knowledge-management'),

  -- DevOps & Infrastructure
  ('terraform-mcp', 'devops-infrastructure'),
  ('kubernetes-mcp', 'devops-infrastructure'),
  ('cloudflare-mcp', 'devops-infrastructure'),
  ('aws-mcp', 'devops-infrastructure'),

  -- Design & UI
  ('storybook-mcp', 'design-ui'),
  ('tailwindcss-mcp', 'design-ui'),

  -- Marketing & SEO
  ('mailchimp-mcp', 'marketing-seo'),
  ('semrush-mcp', 'marketing-seo'),
  ('google-ads-mcp', 'marketing-seo'),

  -- Finance & Payments
  ('stripe-mcp', 'finance-payments'),
  ('quickbooks-mcp', 'finance-payments'),
  ('plaid-mcp', 'finance-payments'),

  -- Legal & Compliance
  ('docusign-mcp', 'legal-compliance'),
  ('courtlistener-mcp', 'legal-compliance'),
  ('legalforce-mcp', 'legal-compliance'),

  -- HR & Recruiting
  ('greenhouse-mcp', 'hr-recruiting'),
  ('lever-mcp', 'hr-recruiting'),
  ('bamboohr-mcp', 'hr-recruiting'),

  -- E-commerce
  ('shopify-mcp', 'ecommerce'),
  ('woocommerce-mcp', 'ecommerce'),
  ('amazon-seller-mcp', 'ecommerce'),

  -- Security
  ('snyk-mcp', 'security'),
  ('sonarqube-mcp', 'security'),
  ('trivy-mcp', 'security'),

  -- Communication
  ('slack-mcp', 'communication'),
  ('gmail-mcp', 'communication'),
  ('google-calendar-mcp', 'communication'),
  ('sentry-mcp', 'communication')
) AS t(skill_slug, type_slug)
JOIN skills s ON s.slug = t.skill_slug
JOIN tool_types tt ON tt.slug = t.type_slug
ON CONFLICT DO NOTHING;
