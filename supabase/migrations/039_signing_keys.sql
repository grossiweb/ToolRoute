-- Migration 039: Ed25519 signing keys for cryptographic commitment (Option B)
--
-- Agents that register a public key can sign their reports. ToolRoute verifies
-- the signature and sets proof_type = 'client_signed', bypassing behavioral
-- anti-gaming penalties. Unsigned reports remain 'self_reported'.
--
-- Commitment hash format:
--   SHA256("{model_slug}:{outcome_status}:{unix_timestamp_seconds}:{SHA256(output_snippet||'')}")
--
-- Replay protection: ToolRoute rejects timestamps more than 300 seconds old.
-- Duplicate detection: commitment_hash is unique — same report can't be submitted twice.

-- ── agent_identities — public key storage ────────────────────────────────────
ALTER TABLE agent_identities
  ADD COLUMN IF NOT EXISTS public_key        TEXT,
  ADD COLUMN IF NOT EXISTS signing_algorithm TEXT DEFAULT 'ed25519';

-- ── model_outcome_records — signed commitment storage ────────────────────────
ALTER TABLE model_outcome_records
  ADD COLUMN IF NOT EXISTS commitment_hash  TEXT,
  ADD COLUMN IF NOT EXISTS report_signature TEXT;

-- Unique constraint prevents replay attacks (same commitment can't be submitted twice)
CREATE UNIQUE INDEX IF NOT EXISTS uq_model_outcome_commitment_hash
  ON model_outcome_records(commitment_hash)
  WHERE commitment_hash IS NOT NULL;
