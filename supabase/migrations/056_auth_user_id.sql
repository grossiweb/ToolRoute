-- ToolRoute Migration 056: Auth user id on agent_identities
-- Adds owner_user_id linking an agent_identity to a Supabase Auth user
-- (auth.users). Nullable so the 3 existing dogfooding agents are
-- grandfathered untouched. ON DELETE SET NULL so deleting an auth user
-- (e.g. account closure) does not cascade-delete their agents.
--
-- Also flips the trust_tier column default from 'baseline' to
-- 'unverified'. Any future insert that does not explicitly set
-- trust_tier now lands as unverified — matches the app-level rule in
-- /api/agents/register (GitHub-authenticated owner_user_id → 'baseline',
-- anonymous → 'unverified'). Existing rows are NOT rewritten.

ALTER TABLE agent_identities
  ADD COLUMN IF NOT EXISTS owner_user_id UUID
    REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE agent_identities
  ALTER COLUMN trust_tier SET DEFAULT 'unverified';

CREATE INDEX IF NOT EXISTS idx_agent_identities_owner_user_id
  ON agent_identities(owner_user_id)
  WHERE owner_user_id IS NOT NULL;

COMMENT ON COLUMN agent_identities.owner_user_id IS
  'Supabase Auth user (auth.users.id) that registered this agent via GitHub OAuth. NULL for the 3 grandfathered dogfooding agents and for any anonymous registration. Set during POST /api/agents/register when an authenticated session is present and owner_user_id in the body matches session.user.id.';
