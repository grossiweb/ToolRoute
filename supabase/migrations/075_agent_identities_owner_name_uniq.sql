-- 075_agent_identities_owner_name_uniq.sql
-- Applied via Supabase (MCP) on 2026-06-14. (Duplicate row deleted first, then
-- this index created.)
--
-- Phase 3.1 duplicate-identity fix. GitHub-authenticated user ssai7955433 got
-- TWO agent_identities 17s apart: the register handler's idempotency check was
-- keyed on (agent_name, host_client_slug), so a differing host_client_slug
-- (null vs 'youtube') on the second submit bypassed it and inserted a duplicate
-- (new contributor + identity) for the same owner_user_id.
--
-- Backstop: enforce one identity per (owner_user_id, agent_name). Partial index
-- (WHERE owner_user_id IS NOT NULL) so anonymous/SDK registrations — which have
-- a null owner and may legitimately register many agents — are unconstrained.
-- The register handler also does an owner+name check before insert for clean UX
-- (returns the existing identity); this index is the hard backstop if that path
-- is ever raced or bypassed.

CREATE UNIQUE INDEX IF NOT EXISTS agent_identities_owner_name_uniq
  ON agent_identities (owner_user_id, agent_name)
  WHERE owner_user_id IS NOT NULL;
