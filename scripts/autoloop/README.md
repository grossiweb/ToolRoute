# AutoResearch loop (live)

Measures ToolRoute's live routing quality against the frozen eval files and
suggests targeted fixes. This loop is **semi-manual by design**: unlike the
offline tier fork on the `autoresearch` branch (which mutates a sandbox and
re-runs in-process), this one tests **production** routing — so every candidate
change is a Tier 2 push + deploy, and a human owns apply/revert.

## Files
- `run-benchmark.ts` — parses `tests/routing-benchmark-v2.md` (skill+approach)
  and `tests/tier-benchmark.md` (tier), POSTs each query live, scores CRS,
  writes a report, exits non-zero if the gate fails. **Read-only.**
- `propose.ts` — reads the latest report's failures, asks an LLM (OpenRouter)
  for minimal targeted fixes. **Advisory only — never applies anything.**
- `lib/` — `crs.ts` (scoring, tier ladder), `parse-battery.ts` (md parsers),
  `route-client.ts` (HTTP helpers).

## Commands
```bash
npm run bench                         # full run vs https://toolroute.io
BENCH_BASE_URL=http://localhost:3000 npm run bench
BENCH_THRESHOLD=0.9 npm run bench     # stricter gate (default 0.85)
npm run bench:propose                 # suggest fixes for the last run's failures
```
Reports land in `autoresearch-reports/` (gitignored): `<ts>.json`, `<ts>.md`,
and `.last-report.json` (the delta baseline).

## Scoring
- **Skill CRS** = exact `recommended_skill` AND `approach` match, per section,
  micro-averaged. KNOWN-ISSUE rows excluded.
- **Tier CRS** = `0.80·exact + 0.20·mean_partial`, partial = symmetric
  tier-ladder distance (over- and under-routing penalized equally).
- **Gate**: both skill and tier CRS ≥ threshold → exit 0.

## The ratchet (human-gated)
1. `npm run bench` → record baseline CRS (`.last-report.json`).
2. `npm run bench:propose` → review suggested fixes.
3. Pick one. Apply it through the normal flow: propose the diff/SQL, get approval,
   apply (migration or code), push, wait for deploy.
4. `npm run bench` again → read ΔCRS in the report header.
5. **Keep** if ΔCRS > +0.02 with no new failures; otherwise **revert** the change.
   One change at a time, so each delta is attributable.

> Do NOT auto-apply proposals against production. The offline tier ratchet on the
> `autoresearch` branch is the place for unattended apply→rerun→keep/revert.
