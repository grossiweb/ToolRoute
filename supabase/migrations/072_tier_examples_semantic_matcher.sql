-- 072_tier_examples_semantic_matcher.sql
-- Applied via Supabase (MCP) on 2026-06-14. Schema + RPC applied first, seed
-- INSERT applied separately (same migration). Embeddings populated afterward via
-- a temp reseed route (google/gemini-embedding-001 @1536), then removed.
--
-- Tier-path semantic matcher (Priority 7 follow-on): mirrors the skill matcher
-- (migrations 062/063, tasks + match_tasks). A query is embedded and matched
-- against these per-tier example anchors; a confident cosine match picks the
-- model tier, replacing the brittle keyword heuristic on the primary path.
-- Two anchors deliberately split the 'plan' intent that keywords cannot:
-- "plan a birthday party" (cheap_chat) vs "plan the system architecture"
-- (reasoning_pro).

CREATE TABLE IF NOT EXISTS tier_examples (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier          text NOT NULL,
  example_query text NOT NULL,
  embedding     vector(1536),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tier_examples_embedding_cosine_idx
  ON tier_examples USING hnsw (embedding vector_cosine_ops);

CREATE OR REPLACE FUNCTION match_tier_examples(query_embedding vector, match_count integer DEFAULT 5)
RETURNS TABLE(tier text, example_query text, score double precision)
LANGUAGE sql STABLE AS $$
  SELECT te.tier, te.example_query, 1 - (te.embedding <=> query_embedding) AS score
  FROM tier_examples te
  WHERE te.embedding IS NOT NULL
  ORDER BY te.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Seed: 5 representative, distinct example queries per tier (35 total).
INSERT INTO tier_examples (tier, example_query) VALUES
  ('cheap_chat', 'what is the capital of France'),
  ('cheap_chat', 'translate hello to Spanish'),
  ('cheap_chat', 'summarize this paragraph in one sentence'),
  ('cheap_chat', 'what time zone is Tokyo in'),
  ('cheap_chat', 'plan a birthday party for my kid'),
  ('cheap_structured', 'extract the fields from this JSON'),
  ('cheap_structured', 'classify these support tickets as bug or feature'),
  ('cheap_structured', 'parse this CSV and return the column names'),
  ('cheap_structured', 'convert this text into a JSON object with name and email'),
  ('cheap_structured', 'label each row as spam or not spam'),
  ('fast_code', 'write a boilerplate Express REST API'),
  ('fast_code', 'refactor this Python function to be more readable'),
  ('fast_code', 'fix the bug in this TypeScript code'),
  ('fast_code', 'write unit tests for this module'),
  ('fast_code', 'implement a binary search in Go'),
  ('creative_writing', 'write a limerick about coffee'),
  ('creative_writing', 'write a cold outreach email to a potential client'),
  ('creative_writing', 'write marketing copy for our new landing page'),
  ('creative_writing', 'draft a compelling product announcement'),
  ('creative_writing', 'write a short story about a lighthouse keeper'),
  ('tool_agent', 'search the web for competitor pricing'),
  ('tool_agent', 'use tools to fetch and summarize this URL'),
  ('tool_agent', 'orchestrate API calls to sync two systems'),
  ('tool_agent', 'scrape this site and store the results in a database'),
  ('tool_agent', 'use MCP tools to query our analytics'),
  ('reasoning_pro', 'analyze the architectural tradeoffs of this system design'),
  ('reasoning_pro', 'develop a go-to-market strategy for our new product'),
  ('reasoning_pro', 'diagnose the root cause of this memory leak'),
  ('reasoning_pro', 'compare the pros and cons of microservices versus a monolith'),
  ('reasoning_pro', 'plan the system architecture for a payments service'),
  ('best_available', 'write an exhaustive end-to-end technical specification'),
  ('best_available', 'produce a comprehensive technical whitepaper on our architecture'),
  ('best_available', 'use the best possible model for a full security audit and remediation plan'),
  ('best_available', 'write a complete architecture and implementation plan with tradeoff analysis'),
  ('best_available', 'deliver an in-depth multi-section market analysis with financial modeling')
ON CONFLICT DO NOTHING;
