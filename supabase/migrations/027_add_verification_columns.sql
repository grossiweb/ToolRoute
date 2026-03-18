-- Migration 027: Add verification columns to model_routing_decisions
-- Used by POST /api/verify/model to link verification results back to routing decisions

ALTER TABLE model_routing_decisions
  ADD COLUMN IF NOT EXISTS verification_score NUMERIC(4,3),
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- Add agent_identity_id to model_outcome_records for tracking
ALTER TABLE model_outcome_records
  ADD COLUMN IF NOT EXISTS agent_identity_id UUID REFERENCES agent_identities(id);
