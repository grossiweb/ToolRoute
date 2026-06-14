-- 073_drop_tier_examples.sql
-- Applied via Supabase (MCP) on 2026-06-14.
--
-- Reverts migration 072. The tier-path semantic matcher (pgvector cosine over
-- per-tier example anchors) was disproven during verification: embeddings encode
-- topic/semantics, not task difficulty, so model tiers (quality bands, not
-- topically distinct) don't separate. Tier self-consistency was 54% nearest-
-- neighbor and only 50% among >=0.70 confident matches (6/35 cleared the gate);
-- reasoning_pro and best_available are topically identical and confused above the
-- gate. The matcher lib + /api/route/model wire-in were never built; the table and
-- RPC had no runtime consumer. The LLM classifier (classificationToModelTier)
-- remains the correct tier decider. Dropping the inert objects. See
-- docs/tier-semantic-matcher-proposal.md for the full finding.

DROP FUNCTION IF EXISTS match_tier_examples(vector, integer);
DROP TABLE IF EXISTS tier_examples;
