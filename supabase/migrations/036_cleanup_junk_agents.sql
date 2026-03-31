-- Migration 036: Soft-delete junk agent registrations
-- Marks adversarial/test/garbage agent names as inactive (is_active = false)
-- Does NOT hard-delete to preserve referential integrity.
-- Agents can be re-activated manually if needed.

UPDATE agent_identities
SET is_active = false
WHERE
  -- All-digit names (e.g. "0", "00000", "12345")
  agent_name ~ '^[0-9]+$'

  -- All-same-character names (e.g. "AAAAAAA", "aaaaa")
  OR agent_name ~ '^(.)\1{2,}$'

  -- JSON-like names (e.g. ["a","c"] or {key:val})
  OR agent_name ~ '^\[' OR agent_name ~ '^\{'

  -- SQL injection patterns (e.g. "; DROP TABLE", "' OR 1=1")
  OR agent_name ILIKE '%;%'
  OR agent_name ILIKE '%DROP%TABLE%'
  OR agent_name ILIKE '%OR 1=1%'
  OR agent_name ILIKE '%UNION SELECT%'

  -- Very short throwaway names (1-2 chars)
  OR length(trim(agent_name)) <= 2

  -- Exact known junk names from adversarial stress tests
  OR agent_name IN (
    'test',
    '0',
    '00000',
    'null',
    'undefined',
    'true',
    'false',
    'admin',
    'root'
  );

-- Also clean up any orphaned contributors linked only to inactive agents
-- (soft approach — just ensures the junk doesn't pollute counts)
-- Note: hard delete skipped intentionally to preserve foreign key chains.
