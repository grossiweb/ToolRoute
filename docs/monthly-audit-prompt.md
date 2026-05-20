# Monthly Audit Prompt

**What this is:** a self-contained prompt to paste into Claude Code (in the
ToolRoute project root) once a month. It runs 14 sections of read-only checks
against the codebase, the live API, the npm registry, the Supabase project,
and Vercel runtime logs. The output is a structured report you can copy into a
GitHub issue.

**When to run:** first Monday of each month.

**How to use:**
1. Open Claude Code in `C:\Projects\ToolRoute` (or wherever the repo lives).
2. Paste the entire `==== PROMPT ====` block below as a single message.
3. Wait for Claude to complete all 14 sections.
4. Copy the full output into a new GitHub issue titled
   `[Monthly Audit] YYYY-MM-DD` and apply the `audit` label.
5. Triage per the severity legend at the bottom.

---

## ==== PROMPT ====

> You are running ToolRoute's monthly integration audit. This is a **read-only**
> investigation. Do not edit files, write migrations, push commits, or run
> destructive commands. Produce a structured report covering all 14 sections
> below, in order, with each issue rated **Critical** / **Warning** / **Minor**
> per the severity legend at the end.
>
> Use parallel tool calls aggressively. Read with Glob/Grep/Read for code;
> use Bash for `curl`, `npm view`, `gh`, and other CLIs; use the Vercel MCP
> for runtime logs (Section 14); use the Supabase MCP for live DB state where
> relevant (Sections 10 and 12). If a tool isn't available in the current
> session, say so and skip the dependent checks — do not fabricate data.
>
> ### Section 1 — Endpoint inventory
> Glob every `src/app/api/**/route.ts`. For each handler list method + path,
> a one-line purpose, and whether it appears in `README.md`, `CLAUDE.md`,
> `public/skill.md`, the `/.well-known` manifest, and `src/app/api-docs/page.tsx`.
> Flag: documented-but-missing handlers and handlers-but-undocumented endpoints.
>
> ### Section 2 — `/api/route` vs `/api/route/model` split
> Read both handlers. Document request and response shapes for each. List every
> caller (hook, SDK, MCP route internal fetches, ConnectBlock, ModelRoutingDemo,
> Claudia VPS scripts mentioned in `CLAUDE.md`) and verify each caller hits the
> right endpoint with the current shape. Flag any caller using a stale shape.
>
> ### Section 3 — `@toolroute/hook` audit
> Read `hook/src/index.ts` and `hook/package.json`. Confirm base URL, request
> shapes match the current `/api/route` and `/api/contributions` handlers,
> every field read from the response actually exists in the response, and
> there are no duplicate side-effects (e.g. double `reportOutcome` calls).
>
> ### Section 4 — `@toolroute/sdk` audit
> Read `sdk/src/index.ts` and `sdk/package.json`. For every method
> (`route`, `report`, `model.route`, `model.report`, `model.verify`,
> `register`, `balance`, `help`, `claimMission`, `completeMission`,
> `challenges`, `submitChallenge`, `search`, `compare`, `missions`,
> `preflight`), verify URL, request shape, and that the typed response
> interface matches what the handler returns. Flag interface drift.
>
> ### Section 5 — MCP server audit
> Read `src/app/api/mcp/route.ts`. Enumerate every tool in the `TOOLS` array
> with its input schema. Cross-reference against `public/skill.md`,
> `mcp-server.json`, `/.well-known/route.ts`, and the api-docs page —
> all should agree on the tool count and tool names. Examine the SSE GET
> handler: connection lifetime, ping interval, reconnect behavior. Flag any
> drift between surfaces.
>
> ### Section 6 — Public-facing copy audit
> Read `README.md`, `public/skill.md`, `src/app/page.tsx`,
> `src/app/api-docs/page.tsx`, and `src/components/ConnectBlock.tsx`.
> Flag: wrong URLs, stale endpoint paths, deprecated model slugs
> (anything not present in the current `models` table seed from
> `supabase/migrations/043_model_catalog.sql` and `044_add_gpt_5_5_models.sql`),
> example responses whose shape doesn't match the live API, and any code
> snippet that would lead a developer to call the wrong route or import a
> nonexistent package.
>
> ### Section 7 — Health and discovery endpoints
> Confirm `/api/health` and `/.well-known` exist and return valid JSON.
> Check whether the `/.well-known` response advertises the current MCP
> version and the full tool list. Search for any phantom discovery files
> referenced in older docs that no longer exist.
>
> ### Section 8 — `vercel.json`
> Read `vercel.json`. Confirm cron schedules are correct, all referenced cron
> paths have handlers that exist, and each handler validates `CRON_SECRET`.
> Flag misconfigured or orphaned crons.
>
> ### Section 9 — Live smoke tests
> Run the same checks the weekly GitHub Actions workflow runs, but via Bash
> in this session. Use `curl --fail-with-body --max-time 10 --silent` for each.
> Set `BASE="${TOOLROUTE_BASE_URL:-https://toolroute.io}"`. Tests:
>
> 1. `GET $BASE/api/health` → 200, contains `"status"`
> 2. `POST $BASE/api/route` body `{"task":"write a python function to sort a list"}` → 200, contains `"approach"`
> 3. `POST $BASE/api/route/model` same body → 200, contains `"recommended_model"`
> 4. `POST $BASE/api/agents/register` body `{"agent_name":"audit-probe","agent_kind":"autonomous"}` → 200 or 409 (use `-w "%{http_code}"`)
> 5. `GET $BASE/api/challenges` → 200, response starts with `[`
> 6. `GET $BASE/api/missions/available` → 200
> 7. `GET $BASE/api/skills` → 200
> 8. `POST $BASE/api/mcp` body `{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}` → 200; pipe through `jq '.result.tools | length'` and assert `== 16`
> 9. `GET $BASE/.well-known` → 200, contains `1.5.0`
> 10. `GET $BASE/api/badge/exa-mcp-server` → 200
>
> Report each as PASS or FAIL with the failure reason.
>
> ### Section 10 — Telemetry pipeline health
> Use the Supabase MCP if available. Otherwise grep migration source for the
> column names and write the queries as guidance for the human reviewer.
> Report:
> - Most recent `score_version` value in `skill_scores` (should be
>   `'2.0-ts-parity'` post-migration-046, otherwise `'1.0'` or `'2.0-pipeline'`
>   — flag if not one of these).
> - Latest `outcome_records.created_at` (flag if older than 7 days).
> - Row count in `outcome_records`, `model_outcome_records`, and
>   `contribution_events` over the past 30 days.
> - Latest cron run timestamp if persisted anywhere (otherwise note that no
>   persistent log exists).
>
> ### Section 11 — Published artifact drift
> Run `npm view @toolroute/hook version` and `npm view @toolroute/sdk version`.
> Compare against `hook/package.json` and `sdk/package.json`. Flag any package
> where local is ahead of npm — that means an unpublished fix. Also flag any
> package where local matches npm but the changelog mentions newer changes.
>
> ### Section 12 — Agent health
> Use the Supabase MCP if available to query `agent_identities`. Report:
> - Total agents, count by `trust_tier`.
> - Claudia's record (`agent_name` matches `claudia-grossiweb` per `CLAUDE.md`):
>   last activity timestamp, total contributions, current trust tier.
> - Agents with zero entries in `contribution_events` (registered but inactive).
> - Any agents flagged in `agent_gaming_flags`.
>
> ### Section 13 — Model catalog freshness
> Web search for major LLM releases in the past 30 days (Anthropic Claude
> releases, OpenAI GPT updates, Google Gemini, DeepSeek, Mistral, Meta Llama).
> List what you find, then compare against the current `models` table seed
> in `supabase/migrations/043_model_catalog.sql` and any later migrations
> that add models (e.g. `044_add_gpt_5_5_models.sql`). Flag any model that
> shipped in the past 30 days and is missing from the catalog as a Warning.
> Flag any model in the catalog that has been **retired upstream** as a Minor.
>
> ### Section 14 — Performance baseline
> Use the Vercel MCP to pull runtime logs for the past 7 days. For each of
> `/api/route`, `/api/route/model`, `/api/mcp`, compute (or estimate from the
> log sample) the p50 latency. Flag any endpoint with p50 > 2000 ms as a
> Warning. Also surface the highest single-request latency over the window
> and any 5xx error rate above 0.5%.
>
> ---
>
> **Severity legend:**
> - **Critical** — breaks integration for real callers, leaks data, or wrong
>   results returned. Fix immediately in this or the next session.
> - **Warning** — misleading but not broken; degrading user experience or
>   developer experience. Log for the next session.
> - **Minor** — cosmetic, stale wording, or low-impact drift. Defer until
>   batched cleanup.
>
> At the end of the report, produce three short lists:
> - "Fix now (Critical):" — bullet list
> - "Log for next session (Warning):" — bullet list
> - "Defer (Minor):" — bullet list
>
> No file edits. Read-only. Report findings only.

## ==== END PROMPT ====

---

## Notes for the human reviewer

- The GitHub Actions weekly audit (`.github/workflows/weekly-audit.yml`)
  covers a subset of Section 9 and Section 11 automatically every Sunday.
  The monthly run is the deeper audit that includes code review (Sections 1-8),
  Supabase telemetry (Section 10, 12), web research (Section 13), and Vercel
  performance (Section 14).
- If a section can't run (e.g. Supabase or Vercel MCP not connected in the
  session), Claude will say so and skip — do not treat skipped sections as
  passes. Re-run after connecting the missing MCP.
- Triage at the issue: Criticals get a same-day PR. Warnings get scheduled
  into the next planning session. Minors get added to the UI/UX or copy
  backlog in `CLAUDE.md`.
