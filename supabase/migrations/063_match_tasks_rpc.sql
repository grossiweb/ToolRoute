-- 063_match_tasks_rpc.sql
-- Applied via Supabase (MCP apply_migration) on 2026-06-09.
--
-- Cosine top-k task matcher for the Phase 2 semantic matcher (src/lib/task-matcher.ts).
-- Returns the nearest tasks to a query embedding, using the hnsw cosine index from 062.
-- score = 1 - cosine_distance (so 1.0 = identical, higher = closer).

-- DROP first: adding `id` to the RETURNS TABLE changes the signature, which
-- CREATE OR REPLACE cannot do in place.
DROP FUNCTION IF EXISTS match_tasks(vector, int);

CREATE FUNCTION match_tasks(query_embedding vector(1536), match_count int DEFAULT 3)
RETURNS TABLE(id uuid, slug text, name text, score float)
LANGUAGE sql
STABLE
AS $$
  SELECT t.id, t.slug, t.name, 1 - (t.embedding <=> query_embedding) AS score
  FROM tasks t
  WHERE t.embedding IS NOT NULL
  ORDER BY t.embedding <=> query_embedding
  LIMIT match_count;
$$;
