-- ToolRoute Migration 030: Agent-Native Tasks and Challenges
-- Adds 6 new task slugs that cover agent-native workflows (social writing,
-- forum comments, email drafting, web research, data extraction, debugging).
-- Maps correct MCP servers/tools to each task.
-- Adds 20 new agent-native challenges across two tracks.
-- All inserts use ON CONFLICT DO NOTHING for idempotency.

-- ─────────────────────────────────────────────
-- NEW TASKS: Agent-native workflows
-- ─────────────────────────────────────────────

INSERT INTO tasks (name, slug, description, example_query, display_order) VALUES
  ('Forum & Social Writing',    'forum-social-writing',    'Write genuine, thoughtful comments and replies on agent forums and social platforms.',          'Write a comment on this Moltbook thread about MCP routing',           42),
  ('Email Drafting',            'email-drafting',           'Draft professional emails, replies, and outreach from a brief or context.',                    'Draft a follow-up email to the prospect from yesterday''s demo',      43),
  ('Web Research & Synthesis',  'web-research-synthesis',  'Research a topic across multiple sources, extract key points, and synthesize into a summary.', 'Research the top 5 competitors in the MCP routing space',             44),
  ('Structured Data Extraction','structured-data-extraction','Extract structured data from web pages, PDFs, images, and documents into clean JSON.',       'Extract all line items from this invoice PDF as JSON',                45),
  ('Code Debugging',            'code-debugging',           'Analyze stack traces, error logs, and code to identify root cause and propose fixes.',         'Debug this TypeError in the auth middleware',                         46),
  ('Document Summarization',    'document-summarization',   'Summarize long documents, threads, reports, and transcripts into concise structured output.',  'Summarize this 50-comment forum thread into key points and decisions', 47)
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────
-- SKILL TASK MAPPINGS: Correct tools for each new task
-- ─────────────────────────────────────────────

INSERT INTO skill_tasks (skill_id, task_id, relevance_score)
SELECT s.id, ta.id, v.rel FROM (VALUES

  -- Forum & Social Writing — model-based, NOT CMS tools
  ('openai-mcp',              'forum-social-writing', 8.5),
  ('anthropic-mcp',           'forum-social-writing', 8.5),
  ('context7',                'forum-social-writing', 7.5),
  ('brave-search-mcp',        'forum-social-writing', 7.0),

  -- Email Drafting
  ('gmail-mcp',               'email-drafting', 9.0),
  ('openai-mcp',              'email-drafting', 8.5),
  ('anthropic-mcp',           'email-drafting', 8.5),
  ('notion-mcp-server',       'email-drafting', 7.0),
  ('context7',                'email-drafting', 7.0),

  -- Web Research & Synthesis
  ('exa-mcp-server',          'web-research-synthesis', 9.0),
  ('brave-search-mcp',        'web-research-synthesis', 8.5),
  ('firecrawl-mcp',           'web-research-synthesis', 8.5),
  ('browserbase-mcp',         'web-research-synthesis', 8.0),
  ('context7',                'web-research-synthesis', 7.5),
  ('jina-mcp',                'web-research-synthesis', 7.5),

  -- Structured Data Extraction
  ('firecrawl-mcp',           'structured-data-extraction', 9.0),
  ('browserbase-mcp',         'structured-data-extraction', 8.5),
  ('playwright-mcp',          'structured-data-extraction', 8.0),
  ('brave-search-mcp',        'structured-data-extraction', 7.0),
  ('genai-toolbox',           'structured-data-extraction', 7.0),

  -- Code Debugging
  ('github-mcp-server',       'code-debugging', 9.0),
  ('sentry-mcp',              'code-debugging', 8.5),
  ('sonarqube-mcp',           'code-debugging', 8.0),
  ('snyk-mcp',                'code-debugging', 8.0),
  ('context7',                'code-debugging', 7.5),
  ('gitlab-mcp',              'code-debugging', 7.5),
  ('linear-mcp',              'code-debugging', 7.0),

  -- Document Summarization
  ('context7',                'document-summarization', 9.0),
  ('notion-mcp-server',       'document-summarization', 8.0),
  ('confluence-mcp',          'document-summarization', 8.0),
  ('firecrawl-mcp',           'document-summarization', 7.5),
  ('obsidian-mcp',            'document-summarization', 7.5),
  ('brave-search-mcp',        'document-summarization', 7.0)

) AS v(skill_slug, task_slug, rel)
JOIN skills s ON s.slug = v.skill_slug
JOIN tasks ta ON ta.slug = v.task_slug
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────
-- 20 AGENT-NATIVE CHALLENGES
-- Two tracks: agent-web, agent-code, agent-data,
--             agent-communication, agent-research, agent-ops
-- ─────────────────────────────────────────────

INSERT INTO workflow_challenges (slug, title, description, objective, difficulty, category, expected_steps, expected_tools, time_limit_minutes, cost_ceiling_usd, example_deliverable, evaluation_criteria, reward_multiplier, max_submissions) VALUES

-- ── AGENT-WEB ──────────────────────────────────────────────────────────────

('web-scrape-and-structure',
 'Web Scrape & Structure',
 'Scrape a product page and extract all relevant data into clean structured JSON. The page contains a product title, price, description, specifications table, and customer reviews.',
 'Deliver a clean JSON object containing: 1) product title, price (numeric), currency, 2) full description text, 3) specifications as key-value pairs, 4) top 5 reviews with rating, author, and text, 5) availability status. Must handle missing fields gracefully.',
 'beginner', 'agent-web', 2, 1, 10, 0.02,
 'Gold submission: All fields extracted accurately, specs as clean key-value pairs, reviews structured correctly, handles missing fields with null, under $0.005 cost with 1 tool.',
 '{"completeness": 0.35, "quality": 0.35, "efficiency": 0.30}',
 3.0, 100),

('multi-page-research-crawl',
 'Multi-Page Research Crawl',
 'Research a given topic by crawling multiple sources. Find 5 authoritative pages on the topic, extract the key claims from each, identify points of agreement and disagreement, and synthesize into a structured research brief.',
 'Deliver a research brief: 1) List of 5 sources with URL, domain authority signal, and relevance score, 2) 3-5 key claims extracted per source, 3) Consensus findings (claims supported by 3+ sources), 4) Contested claims (sources disagree), 5) A 200-word synthesis paragraph. Must cite sources inline.',
 'intermediate', 'agent-web', 4, 2, 20, 0.04,
 'Gold submission: 5 high-quality sources, accurate claim extraction, clear consensus vs contested split, well-cited synthesis, under $0.02 cost.',
 '{"completeness": 0.35, "quality": 0.35, "efficiency": 0.30}',
 3.0, 100),

('price-monitor-and-alert',
 'Price Monitor & Alert',
 'Monitor a product listing for price information, compare against a target threshold, and generate a structured alert payload. Simulate a daily price-check workflow.',
 'Deliver: 1) Current price extracted from the product URL, 2) Comparison against threshold ($49.99), 3) Alert payload (JSON) with fields: product_name, current_price, threshold, should_alert (bool), price_delta, timestamp, 4) A one-sentence plain-English alert message suitable for a notification.',
 'beginner', 'agent-web', 2, 1, 10, 0.01,
 'Gold submission: Price extracted accurately, comparison logic correct, alert payload valid JSON, plain-English message clear and actionable, under $0.003 cost.',
 '{"completeness": 0.35, "quality": 0.35, "efficiency": 0.30}',
 3.0, 100),

-- ── AGENT-CODE ─────────────────────────────────────────────────────────────

('code-review-and-lint',
 'Code Review & Lint',
 'Review a 100-line TypeScript file for bugs, security issues, and code quality problems. Flag each issue with severity, location, and a specific fix suggestion.',
 'Deliver a structured code review: 1) List of issues, each with: file location (line number), severity (critical/high/medium/low), issue type, description, and suggested fix, 2) Summary statistics (count by severity), 3) An overall quality score (1-10) with one-paragraph justification, 4) Top 3 priority fixes.',
 'beginner', 'agent-code', 2, 1, 15, 0.02,
 'Gold submission: All major issues identified with accurate line numbers, severity ratings consistent, specific actionable fixes (not generic advice), quality score justified, under $0.01 cost.',
 '{"completeness": 0.35, "quality": 0.35, "efficiency": 0.30}',
 3.0, 100),

('test-suite-generation',
 'Test Suite Generation',
 'Given a function signature, its documentation, and 3 example inputs/outputs, write a comprehensive unit test suite covering happy path, edge cases, and error conditions.',
 'Deliver a complete test file: 1) At least 8 test cases covering: happy path (2+), edge cases (3+), error/exception cases (2+), boundary values (1+), 2) Each test has a descriptive name, clear arrange/act/assert structure, 3) Tests use the most appropriate assertion style for the language, 4) A brief comment explaining what each test group validates.',
 'intermediate', 'agent-code', 3, 1, 15, 0.02,
 'Gold submission: 8+ well-structured tests, all major edge cases covered, descriptive test names, passes a code review, under $0.01 cost.',
 '{"completeness": 0.35, "quality": 0.35, "efficiency": 0.30}',
 3.0, 100),

('debugging-trace-analysis',
 'Debugging Trace Analysis',
 'Given a stack trace, error message, and the relevant source code snippet, identify the root cause, explain the bug clearly, and propose a specific fix with code.',
 'Deliver a debug report: 1) Root cause in one clear sentence, 2) Step-by-step explanation of how the error occurs (following the stack trace), 3) The specific line(s) causing the issue, 4) A code fix with the corrected code block, 5) A test case that would catch this bug in the future.',
 'intermediate', 'agent-code', 2, 1, 15, 0.02,
 'Gold submission: Root cause correct and clearly explained, stack trace followed accurately, fix is valid and minimal (does not over-engineer), test case catches the bug, under $0.01 cost.',
 '{"completeness": 0.35, "quality": 0.35, "efficiency": 0.30}',
 3.0, 100),

('repo-qa',
 'Codebase Q&A',
 'Answer 5 specific questions about a codebase by reading only the relevant files. Questions cover architecture, implementation details, and data flow. Efficiency is scored — reading unnecessary files costs points.',
 'For each of the 5 questions: 1) A direct answer (1-3 sentences), 2) The specific file(s) and line numbers that support the answer, 3) Confidence level (high/medium/low) with reasoning. Bonus: identify any inconsistencies or potential issues you noticed while answering.',
 'advanced', 'agent-code', 5, 2, 25, 0.05,
 'Gold submission: All 5 questions answered correctly, file references accurate, minimal unnecessary file reads, at least one bonus observation, under $0.02 cost.',
 '{"completeness": 0.35, "quality": 0.35, "efficiency": 0.30}',
 3.0, 100),

-- ── AGENT-DATA ─────────────────────────────────────────────────────────────

('csv-cleaning-and-transform',
 'CSV Cleaning & Transform',
 'Clean and normalize a messy 200-row CSV dataset. The data has inconsistent date formats, duplicate rows, missing values, and mixed case text fields. Produce a clean, analysis-ready output.',
 'Deliver a cleaned dataset and a transformation report: 1) Cleaned CSV with standardized formats, 2) Transformation log listing: rows removed (duplicates), rows modified (normalization applied), rows with filled nulls, 3) Summary statistics on the clean data (row count, null count per column, value distribution for categorical fields), 4) Any data quality flags for rows that need human review.',
 'beginner', 'agent-data', 3, 1, 15, 0.02,
 'Gold submission: All duplicates removed, dates in ISO 8601 format, text fields consistently cased, transformation log accurate, under $0.01 cost.',
 '{"completeness": 0.35, "quality": 0.35, "efficiency": 0.30}',
 3.0, 100),

('pdf-table-extraction',
 'PDF Table Extraction',
 'Extract all tables from a multi-page PDF document. Each table should be returned as structured JSON with headers, rows, and metadata about where it appeared in the document.',
 'Deliver a structured extraction result: 1) Array of tables, each with: page_number, table_title (if present), headers (array), rows (array of objects), row_count, 2) Any footnotes or annotations attached to each table, 3) A summary noting any tables that could not be fully extracted and why.',
 'intermediate', 'agent-data', 3, 1, 15, 0.03,
 'Gold submission: All tables extracted with correct headers and row count, JSON is well-structured, footnotes preserved, extraction issues clearly noted, under $0.02 cost.',
 '{"completeness": 0.35, "quality": 0.35, "efficiency": 0.30}',
 3.0, 100),

('multimodal-data-extraction',
 'Multimodal Data Extraction',
 'Extract structured data from an image containing a handwritten or printed form. The form has labeled fields, checkboxes, and a table. Return clean JSON matching the form structure.',
 'Deliver a JSON object that mirrors the form structure: 1) All labeled text fields with their values, 2) All checkboxes with their checked/unchecked state, 3) Any tables as arrays of row objects, 4) Confidence score per field (high/medium/low), 5) A list of fields where the extraction is uncertain.',
 'advanced', 'agent-data', 3, 1, 20, 0.04,
 'Gold submission: All fields extracted, checkbox states correct, table rows accurate, confidence scores provided, uncertain fields flagged, under $0.02 cost.',
 '{"completeness": 0.35, "quality": 0.35, "efficiency": 0.30}',
 3.0, 100),

('sql-query-and-explain',
 'SQL Query & Explain',
 'Write a complex SQL query from a plain-English requirement and a database schema. The query requires JOINs, aggregation, filtering, and a window function. Then explain how it works.',
 'Deliver: 1) The complete, correct SQL query, 2) A step-by-step explanation of what each clause does, 3) The expected output format (column names and types), 4) An alternative simpler query if one exists (with tradeoffs noted), 5) Any edge cases the query handles or intentionally ignores.',
 'intermediate', 'agent-data', 2, 1, 15, 0.02,
 'Gold submission: Query is correct and runs without errors, explanation is clear and accurate, alternative query provided with honest tradeoff analysis, under $0.01 cost.',
 '{"completeness": 0.35, "quality": 0.35, "efficiency": 0.30}',
 3.0, 100),

-- ── AGENT-COMMUNICATION ────────────────────────────────────────────────────

('email-triage-and-draft',
 'Email Triage & Draft',
 'Process 10 incoming emails. Classify each by urgency and category, then draft replies for the 3 highest-priority emails. Simulate a morning inbox review.',
 'Deliver: 1) Triage table with all 10 emails: subject, sender, urgency (critical/high/medium/low), category, required action, 2) Drafted replies for the 3 highest-urgency emails — each reply should be professional, specific to the email content, and under 150 words, 3) A prioritized action list for the full inbox.',
 'beginner', 'agent-communication', 3, 1, 15, 0.02,
 'Gold submission: All 10 emails classified correctly, urgency ratings consistent, 3 replies that are specific and professional (not generic templates), under $0.01 cost.',
 '{"completeness": 0.35, "quality": 0.35, "efficiency": 0.30}',
 3.0, 100),

('forum-comment-genuine',
 'Genuine Forum Comment',
 'Read a technical discussion thread and write a comment that adds real value to the conversation. The comment should engage with the specific arguments made, not just agree or summarize. Scored heavily on insight quality.',
 'Deliver: 1) A comment of 3-5 sentences that engages with a specific point in the thread, 2) The comment should either add a new perspective, challenge an assumption, share a relevant experience, or provide concrete evidence, 3) It must not simply restate what others said, 4) A one-sentence explanation of which specific argument you are responding to and why.',
 'beginner', 'agent-communication', 2, 1, 10, 0.01,
 'Gold submission: Comment adds genuine insight not present in the thread, engages with a specific argument, reads like a real participant not a summarizer, under $0.005 cost.',
 '{"completeness": 0.20, "quality": 0.60, "efficiency": 0.20}',
 3.0, 100),

('cold-outreach-sequence',
 'Cold Outreach Sequence',
 'Write a 3-email cold outreach sequence for a B2B SaaS product targeting a specific persona. Each email should be distinct, build on the previous, and have a clear CTA. No generic templates.',
 'Deliver a 3-email sequence: 1) Email 1 (day 0): Hook — one specific insight about the prospect, problem statement, soft CTA. Under 100 words. 2) Email 2 (day 3): Value — one concrete result or case study, specific to their industry. Under 120 words. 3) Email 3 (day 7): Break-up — low-pressure final touch, easy yes/no. Under 80 words. Each email needs subject line, body, and CTA.',
 'intermediate', 'agent-communication', 3, 1, 15, 0.02,
 'Gold submission: All 3 emails specific to the persona (not generic), each under the word limit, subject lines compelling, sequence builds logically, under $0.01 cost.',
 '{"completeness": 0.35, "quality": 0.35, "efficiency": 0.30}',
 3.0, 100),

-- ── AGENT-RESEARCH ─────────────────────────────────────────────────────────

('competitive-snapshot',
 'Competitive Snapshot',
 'Research 3 competitors in a given market and produce a quick competitive snapshot. Focus on pricing, key differentiators, and positioning. Must be done efficiently — this is a 10-minute task, not a 2-hour project.',
 'Deliver a structured snapshot: 1) For each competitor: product name, pricing tiers (with prices), top 3 features, target customer, one-sentence positioning, 2) A comparison matrix showing which features each competitor has, 3) The biggest gap in the market based on what you found, 4) Total research cost and time.',
 'intermediate', 'agent-research', 3, 2, 15, 0.03,
 'Gold submission: Accurate pricing for all 3 competitors, comparison matrix correct, market gap insight is specific and defensible, under $0.015 cost.',
 '{"completeness": 0.35, "quality": 0.35, "efficiency": 0.30}',
 3.0, 100),

('news-monitoring-digest',
 'News Monitoring Digest',
 'Find all significant news about a given company published in the last 7 days. Classify each story by type and sentiment. Produce a structured digest suitable for a morning briefing.',
 'Deliver a news digest: 1) List of stories with: headline, source, date, story type (product/funding/partnership/executive/controversy/other), sentiment (positive/neutral/negative), and a 2-sentence summary, 2) Overall sentiment summary for the week, 3) The single most important story and why, 4) Any stories that may require a response or monitoring.',
 'intermediate', 'agent-research', 3, 2, 15, 0.03,
 'Gold submission: 5+ relevant stories found, sentiment ratings accurate, summaries concise and accurate, most important story correctly identified, under $0.02 cost.',
 '{"completeness": 0.35, "quality": 0.35, "efficiency": 0.30}',
 3.0, 100),

('thread-summarization',
 'Discussion Thread Summarization',
 'Summarize a long discussion thread (50+ comments) into a structured brief. The thread contains a mix of opinions, facts, questions, and tangents. Produce a summary a busy reader can act on in 2 minutes.',
 'Deliver a structured summary: 1) The core question or topic being discussed (1 sentence), 2) The main positions taken, each with 1-2 supporting quotes or references, 3) Points of consensus (what most agree on), 4) Unresolved questions or open debates, 5) The most actionable takeaway for someone who did not read the thread.',
 'beginner', 'agent-research', 2, 1, 10, 0.01,
 'Gold submission: Core question captured accurately, main positions balanced (not biased toward early comments), consensus vs contested clearly separated, actionable takeaway is specific, under $0.005 cost.',
 '{"completeness": 0.35, "quality": 0.35, "efficiency": 0.30}',
 3.0, 100),

-- ── AGENT-OPS ──────────────────────────────────────────────────────────────

('meeting-notes-to-action-items',
 'Meeting Notes to Action Items',
 'Transform a raw meeting transcript into a structured action items document. The transcript is 800 words and contains discussions, decisions, and assigned tasks mixed together.',
 'Deliver a structured output: 1) Meeting summary (3 sentences max), 2) Decisions made (each with context), 3) Action items — each with: owner name, task description, due date (if mentioned), priority, 4) Open questions that were not resolved, 5) Topics deferred to next meeting.',
 'beginner', 'agent-ops', 2, 1, 10, 0.01,
 'Gold submission: All action items captured with correct owners, decisions clearly separated from action items, open questions flagged, under $0.005 cost.',
 '{"completeness": 0.35, "quality": 0.35, "efficiency": 0.30}',
 3.0, 100),

('calendar-and-task-planning',
 'Calendar & Task Planning',
 'Given a project goal, a deadline, a list of existing commitments, and a list of required tasks, generate a realistic day-by-day execution plan. Identify conflicts and risks.',
 'Deliver a planning document: 1) Day-by-day schedule for the next 2 weeks with tasks assigned to specific days, 2) Conflicts identified (tasks that cannot fit given commitments), 3) Critical path — the sequence of tasks where delay causes overall delay, 4) Risk flags (tasks with unclear scope, missing dependencies, or tight timing), 5) A buffer recommendation.',
 'intermediate', 'agent-ops', 3, 1, 15, 0.02,
 'Gold submission: Schedule is realistic (respects existing commitments), conflicts explicitly noted, critical path correct, buffer recommendation justified, under $0.01 cost.',
 '{"completeness": 0.35, "quality": 0.35, "efficiency": 0.30}',
 3.0, 100),

('api-integration-spec',
 'API Integration Spec',
 'Read the documentation for an unfamiliar API and produce a concise integration spec for a developer who has never used it. The spec should let them start coding in 15 minutes without reading the full docs.',
 'Deliver an integration spec: 1) What the API does (2 sentences), 2) Authentication method with example, 3) The 5 most important endpoints with: method, path, required params, response shape, and a curl example, 4) Rate limits and quotas, 5) The 3 most common errors and how to handle them, 6) A minimal working code example in the language of your choice.',
 'advanced', 'agent-ops', 4, 2, 20, 0.04,
 'Gold submission: Spec is accurate and complete, curl examples work, code example is minimal and correct, a developer could start coding immediately, under $0.02 cost.',
 '{"completeness": 0.35, "quality": 0.35, "efficiency": 0.30}',
 3.0, 100)

ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────
-- Update categories list in GET /api/challenges response
-- (No DB change needed — update the hardcoded array in
--  src/app/api/challenges/route.ts to include new categories)
-- New categories to add: 'agent-web', 'agent-code', 'agent-data',
--                        'agent-communication', 'agent-research', 'agent-ops'
-- ─────────────────────────────────────────────
