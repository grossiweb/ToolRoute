/**
 * run-benchmark.ts — live CRS runner for the AutoResearch loop.
 *
 *   npm run bench                 # full battery + tier eval vs live routing
 *   BENCH_THRESHOLD=0.9 npm run bench
 *   BENCH_BASE_URL=http://localhost:3000 npm run bench
 *
 * Parses tests/routing-benchmark-v2.md (skill+approach) and tests/tier-benchmark.md
 * (tier), POSTs each query to the live endpoints, scores CRS (skill = exact
 * skill+approach match per section; tier = ladder-partial-credit), diffs against
 * the last run, writes JSON+markdown to autoresearch-reports/, prints the markdown,
 * and exits non-zero if the gate fails. READ-ONLY w.r.t. code/DB schema.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'
import { parseSkillBattery, parseTierBench } from './lib/parse-battery'
import { routeSkill, tierFor } from './lib/route-client'
import { scoreTier, tierCrs, normSkill, round, type TierScored } from './lib/crs'

const ROOT = process.cwd()
const REPORTS_DIR = join(ROOT, 'autoresearch-reports')
const LAST = join(REPORTS_DIR, '.last-report.json')
const THRESHOLD = Number(process.env.BENCH_THRESHOLD ?? argFlag('threshold') ?? 0.85)
const CONCURRENCY = 5

function argFlag(name: string): string | undefined {
  const a = process.argv.find(x => x.startsWith(`--${name}=`))
  return a ? a.split('=')[1] : undefined
}
function gitSha(): string {
  try { return execSync('git rev-parse --short HEAD').toString().trim() } catch { return 'unknown' }
}
async function pool<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let i = 0
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx]) }
  }))
  return out
}

interface Failure { kind: 'skill' | 'tier'; section: string; query: string; expected: string; actual: string }

async function main() {
  const skillRows = parseSkillBattery(join(ROOT, 'tests', 'routing-benchmark-v2.md'))
  const tierRows = parseTierBench(join(ROOT, 'tests', 'tier-benchmark.md'))
  const failures: Failure[] = []

  // ── Skill: POST /api/route, pass = skill AND approach match; KNOWN-ISSUE excluded ──
  const skillScored = await pool(skillRows, CONCURRENCY, async (r) => {
    let actualSkill: string | null = null, actualApproach: string | null = null, err = false
    try { const res = await routeSkill(r.query); actualSkill = res.recommended_skill; actualApproach = res.approach }
    catch { err = true }
    const pass = !err
      && normSkill(actualSkill) === normSkill(r.expected_skill)
      && (actualApproach ?? '') === r.expected_approach
    return { r, pass, actualSkill, actualApproach, err }
  })

  const bySection: Record<string, { pass: number; total: number }> = {}
  let skillPass = 0, skillTotal = 0
  for (const s of skillScored) {
    if (s.r.knownIssue) continue
    bySection[s.r.section] ??= { pass: 0, total: 0 }
    bySection[s.r.section].total++; skillTotal++
    if (s.pass) { bySection[s.r.section].pass++; skillPass++ }
    else failures.push({ kind: 'skill', section: s.r.section, query: s.r.query,
      expected: `${normSkill(s.r.expected_skill) ?? 'null'}/${s.r.expected_approach}`,
      actual: s.err ? 'ERROR' : `${normSkill(s.actualSkill) ?? 'null'}/${s.actualApproach}` })
  }
  const skillBySection = Object.fromEntries(Object.entries(bySection).map(([k, v]) =>
    [k, { crs: round(v.pass / (v.total || 1)), pass: v.pass, total: v.total }]))
  const skillOverall = round(skillPass / (skillTotal || 1))

  // ── Tier: POST per mode, ladder partial credit ──
  const tierScored = await pool(tierRows, CONCURRENCY, async (r) => {
    let actual: string | null = null, err = false
    try { actual = await tierFor(r.query, r.mode) } catch { err = true }
    const sc: TierScored = (err || !actual) ? { exact: 0, partial: 0 } : scoreTier(actual, r.expected_tier)
    return { r, actual, err, sc }
  })
  const perTier: Record<string, { correct: number; total: number }> = {}
  for (const t of tierScored) {
    perTier[t.r.expected_tier] ??= { correct: 0, total: 0 }
    perTier[t.r.expected_tier].total++
    if (t.sc.exact === 1) perTier[t.r.expected_tier].correct++
    else failures.push({ kind: 'tier', section: t.r.mode, query: t.r.query,
      expected: t.r.expected_tier, actual: t.err ? 'ERROR' : (t.actual ?? 'null') })
  }
  const tier = tierCrs(tierScored.map(t => t.sc))
  const tierByTier = Object.fromEntries(Object.entries(perTier).map(([k, v]) =>
    [k, { correct: v.correct, total: v.total, accuracy: round(v.correct / (v.total || 1)) }]))

  // ── Delta vs last ──
  let delta: { skill_overall_crs: number | null; tier_overall_crs: number | null } = { skill_overall_crs: null, tier_overall_crs: null }
  if (existsSync(LAST)) {
    try {
      const prev = JSON.parse(readFileSync(LAST, 'utf8'))
      delta = {
        skill_overall_crs: round(skillOverall - (prev.skill?.overall_crs ?? 0)),
        tier_overall_crs: round(tier.overall_crs - (prev.tier?.overall_crs ?? 0)),
      }
    } catch { /* ignore malformed baseline */ }
  }

  const passed = skillOverall >= THRESHOLD && tier.overall_crs >= THRESHOLD
  const report = {
    generated_at: new Date().toISOString(),
    commit: gitSha(),
    skill: { overall_crs: skillOverall, by_section: skillBySection, known_issues_excluded: skillScored.filter(s => s.r.knownIssue).length },
    tier: { overall_crs: tier.overall_crs, exact_tier_match_rate: tier.exact_tier_match_rate, mean_partial_credit: tier.mean_partial_credit, by_tier: tierByTier },
    delta,
    failures,
    gate: { threshold: THRESHOLD, skill_crs: skillOverall, tier_crs: tier.overall_crs, passed },
  }

  // ── Write artifacts + print markdown ──
  mkdirSync(REPORTS_DIR, { recursive: true })
  const ts = report.generated_at.replace(/[:.]/g, '-')
  writeFileSync(join(REPORTS_DIR, `${ts}.json`), JSON.stringify(report, null, 2))
  writeFileSync(LAST, JSON.stringify(report, null, 2))
  const md = renderMd(report)
  writeFileSync(join(REPORTS_DIR, `${ts}.md`), md)
  process.stdout.write(md + '\n')
  process.exit(passed ? 0 : 1)
}

function d(n: number | null): string { return n == null ? 'n/a' : (n >= 0 ? `+${n}` : `${n}`) }
function renderMd(r: any): string {
  const L: string[] = []
  L.push(`# AutoResearch Benchmark — ${r.generated_at.slice(0, 10)} (${r.commit})`)
  L.push(`Skill CRS ${r.skill.overall_crs} (Δ ${d(r.delta.skill_overall_crs)}) · Tier CRS ${r.tier.overall_crs} (Δ ${d(r.delta.tier_overall_crs)}) · GATE: ${r.gate.passed ? 'PASS' : 'FAIL'} (≥${r.gate.threshold})`)
  L.push('')
  L.push('## Skill — per section')
  L.push('| Section | CRS | pass/total |'); L.push('|---|---|---|')
  for (const [k, v] of Object.entries<any>(r.skill.by_section)) L.push(`| ${k} | ${v.crs} | ${v.pass}/${v.total} |`)
  L.push(`\n_KNOWN-ISSUE rows excluded: ${r.skill.known_issues_excluded}_`)
  L.push('')
  L.push(`## Tier — per tier (exact ${r.tier.exact_tier_match_rate}, partial ${r.tier.mean_partial_credit})`)
  L.push('| Tier | accuracy | correct/total |'); L.push('|---|---|---|')
  for (const [k, v] of Object.entries<any>(r.tier.by_tier)) L.push(`| ${k} | ${v.accuracy} | ${v.correct}/${v.total} |`)
  L.push('')
  L.push(`## Failures (${r.failures.length})`)
  if (r.failures.length) {
    L.push('| kind | section | query | expected | actual |'); L.push('|---|---|---|---|---|')
    for (const f of r.failures) L.push(`| ${f.kind} | ${f.section} | ${f.query.slice(0, 50)} | ${f.expected} | ${f.actual} |`)
  } else L.push('_none_')
  return L.join('\n')
}

main().catch(e => { process.stderr.write(`bench crashed: ${e?.message || e}\n`); process.exit(2) })
