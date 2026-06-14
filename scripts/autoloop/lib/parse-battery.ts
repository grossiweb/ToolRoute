/**
 * parse-battery.ts — markdown pipe-table parsers for the two eval files.
 *
 * Both files use GitHub pipe tables under `##`/`###` section headers. We parse
 * data rows (skip header + separator), tracking the current section.
 */
import { readFileSync } from 'fs'

function splitRow(line: string): string[] {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim())
}
function isSep(line: string): boolean {
  return /^\|?[\s:|-]+\|[\s:|-]+$/.test(line.trim()) && line.includes('-')
}

export interface SkillRow {
  section: string
  query: string
  expected_skill: string
  expected_approach: string
  notes: string
  knownIssue: boolean
}

/** Parse tests/routing-benchmark-v2.md → skill rows. */
export function parseSkillBattery(path: string): SkillRow[] {
  const rows: SkillRow[] = []
  let section = ''
  for (const raw of readFileSync(path, 'utf8').split('\n')) {
    const h = raw.match(/^##\s+(Section\s+\d+[^\n]*)/i)
    if (h) { section = h[1].replace(/[—–-]\s*/, '— ').trim(); continue }
    if (!raw.trim().startsWith('|') || isSep(raw)) continue
    const c = splitRow(raw)
    if (c.length < 4 || c[0].toLowerCase() === 'query') continue
    rows.push({
      section,
      query: c[0],
      expected_skill: c[1],
      expected_approach: c[2],
      notes: c[c.length - 1],
      knownIssue: /KNOWN-ISSUE/i.test(raw),
    })
  }
  return rows
}

export type TierMode = 'model' | `route:${string}`
export interface TierRow {
  query: string
  expected_tier: string
  mode: TierMode
  notes: string
}

/** Parse tests/tier-benchmark.md → tier rows. Columns: query|expected_tier|mode|notes. */
export function parseTierBench(path: string): TierRow[] {
  const rows: TierRow[] = []
  for (const raw of readFileSync(path, 'utf8').split('\n')) {
    if (!raw.trim().startsWith('|') || isSep(raw)) continue
    const c = splitRow(raw)
    if (c.length < 4 || c[0].toLowerCase() === 'query') continue
    rows.push({
      query: c[0],
      expected_tier: c[1],
      mode: c[2] as TierMode,
      notes: c[3] ?? '',
    })
  }
  return rows
}
