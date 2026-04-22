# ToolRoute architecture

This document describes how ToolRoute makes routing decisions,
what's stored in the database, and the key changes shipped over
time. Intended for contributors and curious users.

---

## Model routing architecture (Strategy D)

Strategy D Phase 1 shipped April 22, 2026 (commit ceaf45c). The tier-to-model
mapping moved from the model_aliases DB table into source control.

Single source of truth: `src/lib/routing/tiers.ts` — TIER_MAP constant.
To change a default model, edit TIER_MAP. Do not touch model_aliases.

These are the `standard` profile defaults. Phase 2 will add additional profiles
(e.g. `unregulated`, `regulated`) with different primaries.

| Tier             | Primary               | Notes                                                                        |
|------------------|-----------------------|------------------------------------------------------------------------------|
| cheap_chat       | gemini-2.5-flash-lite |                                                                              |
| cheap_structured | gemini-2.5-flash      |                                                                              |
| fast_code        | claude-sonnet-4-6     |                                                                              |
| creative_writing | claude-sonnet-4-6     |                                                                              |
| reasoning_pro    | claude-opus-4-6       |                                                                              |
| tool_agent       | claude-sonnet-4-6     |                                                                              |
| best_available   | claude-opus-4-7       | Only reachable via require_effort_level: xhigh — LLM classifier never emits this tier |

DB lookup: `models` table (27 rows). Row ID = routing slug.
model_registry and model_aliases still exist but are no longer the routing authority
and will be dropped in a future migration.

---

## Database tables (key ones)

- `skills` — MCP server catalog
- `tasks` — atomic task types (web-search, web-scraping, code-review, etc.)
- `skill_tasks` — maps skills to tasks with relevance_score. Drives MCP server recommendations (the "which tool" question). Model recommendations (the "which LLM" question) use TIER_MAP in src/lib/routing/tiers.ts, not this table.
- `outcome_records` — real execution telemetry
- `workflow_challenges` — challenges catalog
- `challenge_submissions` — agent submissions
- `agent_identities` — registered agents
- `benchmark_profiles` — scoring rubrics per workflow type
- `models` — current model catalog (27 rows). Row `id` = routing slug used in TIER_MAP. is_routable + deprecated_at columns control eligibility.
- `model_pricing_history` — append-only pricing change log (written by nightly refresh cron)
- `model_refresh_runs` — sync audit log (one row per cron run)
- `model_registry` — legacy, still present, no longer the routing authority. Will be dropped.
- `model_aliases` — legacy, still present, no longer the routing authority. Will be dropped.

---

## Key deployments

| Change             | Commit  | Date       | What                                                                                          |
|--------------------|---------|------------|-----------------------------------------------------------------------------------------------|
| Migration 030      | cf75640 | 2026-04-22 | Agent-native tasks, 20 new challenges, 6 agent-* categories                                   |
| Migration 043      | b15d711 | 2026-04-22 | Seed models table with 27-model catalog (creates models, model_pricing_history, model_refresh_runs tables) |
| Strategy D Phase 1 | ceaf45c | 2026-04-22 | Tier resolution moved to src/lib/routing/tiers.ts                                             |
