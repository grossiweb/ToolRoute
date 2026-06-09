-- 062_pgvector_task_embeddings.sql
-- Applied via Supabase (MCP apply_migration) on 2026-06-09; verified: vector 0.8.0
-- extension enabled, tasks.embedding vector(1536) column + hnsw cosine index present.
--
-- Enables pgvector and adds the task embedding column for the Phase 2 semantic
-- matcher. Provider confirmed live: google/gemini-embedding-001 via OpenRouter at
-- dimensions=1536 (native 3072 exceeds pgvector's ~2000-dim hnsw index cap; the
-- Matryoshka `dimensions` param is honored, so 1536 is index-friendly).

-- 1) Enable pgvector. Supabase convention: install into the `extensions` schema.
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- 2) Embedding column on tasks (name + description + example_query embedded at seed time).
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- 3) Cosine-similarity index (hnsw). 55 rows today; the index matters as the
--    taxonomy grows toward 100-200+. The matcher queries with `embedding <=> $query`.
CREATE INDEX IF NOT EXISTS tasks_embedding_cosine_idx
  ON tasks USING hnsw (embedding vector_cosine_ops);
