/**
 * propose.ts — OFFLINE fix suggester for the AutoResearch loop.
 *
 *   npm run bench:propose                 # reads autoresearch-reports/.last-report.json
 *   npm run bench:propose -- <report.json>
 *
 * Reads the latest benchmark failures and asks an LLM (OpenRouter) for targeted,
 * minimal fix suggestions per failure — a new task example_query, a keyword
 * addition, a vendor alias, an example-query retune, etc. Output is advisory
 * markdown ONLY: it NEVER edits code, DB, or migrations. A human reviews each
 * suggestion and applies it through the normal Tier 2 propose→approve→deploy flow.
 */
import { readFileSync } from 'fs'
import { join } from 'path'

// Default to the model the live classifier already uses (verified-valid on
// OpenRouter). Override with PROPOSE_MODEL for a stronger suggester.
const MODEL = process.env.PROPOSE_MODEL || 'google/gemini-3.1-flash-lite'

const SYSTEM = `You are a routing-systems engineer for ToolRoute, an LLM/MCP routing layer.
You are given failing cases from a routing benchmark. For EACH failure, propose the
single most targeted, minimal fix. Allowed fix types ONLY:
  - task_example: add/retune a tasks.example_query for the semantic skill matcher
  - keyword: add a keyword to a signal list in src/lib/model-routing.ts
  - alias: add a VENDOR_ALIASES entry in src/lib/named-tool.ts
  - skill_prior: add/adjust a skill_tasks prior (skill <-> task relevance)
  - none: if the "failure" is actually acceptable (e.g. a documented KNOWN-ISSUE or a tie)
Rules: prefer the narrowest change; never propose removing a broad keyword if it would
regress other cases; flag regression risk; do NOT write code or SQL beyond a one-line
illustrative snippet. Be concrete and cite the failing query.
Respond as markdown: one section per failure with fields Type, Change, Why, Risk.`

async function llm(prompt: string): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) throw new Error('OPENROUTER_API_KEY not set')
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://toolroute.io', 'X-Title': 'ToolRoute AutoResearch Propose' },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: prompt }],
      temperature: 0.2,
    }),
    signal: AbortSignal.timeout(60000),
  })
  if (!res.ok) throw new Error(`OpenRouter HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const j = await res.json()
  return j?.choices?.[0]?.message?.content ?? '(no content)'
}

async function main() {
  const arg = process.argv.find(a => a.endsWith('.json'))
  const path = arg || join(process.cwd(), 'autoresearch-reports', '.last-report.json')
  const report = JSON.parse(readFileSync(path, 'utf8'))
  const failures = report.failures || []
  if (failures.length === 0) {
    process.stdout.write(`# AutoResearch Proposals\n\nNo failures in ${path} — nothing to propose. CRS skill ${report.skill?.overall_crs}, tier ${report.tier?.overall_crs}.\n`)
    return
  }
  const prompt = `Benchmark commit ${report.commit}. Skill CRS ${report.skill?.overall_crs}, Tier CRS ${report.tier?.overall_crs}.\n` +
    `Failures (${failures.length}):\n` +
    failures.map((f: any, i: number) => `${i + 1}. [${f.kind}/${f.section}] query="${f.query}" expected=${f.expected} actual=${f.actual}`).join('\n')

  process.stdout.write(`# AutoResearch Proposals — ${report.commit} (advisory only, not applied)\n\n`)
  process.stdout.write(`Model: ${MODEL}. ${failures.length} failing case(s).\n\n`)
  process.stdout.write(await llm(prompt) + '\n')
  process.stdout.write('\n---\n_These are suggestions only. Apply via the normal Tier 2 propose → approve → deploy flow, then re-run `npm run bench` to confirm ΔCRS before keeping._\n')
}

main().catch(e => { process.stderr.write(`propose failed: ${e?.message || e}\n`); process.exit(1) })
