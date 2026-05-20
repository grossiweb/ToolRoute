// One-time backfill: populate task_cluster on every model_routing_decisions
// row created before migration 053. Idempotent — re-runnable any time;
// only rows where task_cluster IS NULL are touched.
//
// Usage:
//   npx tsx scripts/backfill-task-cluster.ts            # write to DB
//   npx tsx scripts/backfill-task-cluster.ts --dry-run  # log only
//
// Requires NEXT_PUBLIC_SUPABASE_URL and a real SUPABASE_SERVICE_ROLE_KEY
// (not the anon key — bulk writes go through RLS that's locked down to
// the service role).
//
// The initial production backfill on 2026-05-20 was executed via the
// Supabase MCP `execute_sql` tool because the local .env.local
// service-role key was misconfigured. This script remains the canonical
// reference and is the path for future re-runs once env is fixed.

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { deriveTaskCluster } from '../src/lib/task-cluster'

const DRY_RUN = process.argv.includes('--dry-run')
const PAGE_SIZE = 1000
const BATCH_SIZE = 100

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}
const supabase = createClient(url, key, { auth: { persistSession: false } })

async function main() {
  console.log(`▶ Backfilling task_cluster on model_routing_decisions${DRY_RUN ? ' (dry run)' : ''}`)

  let totalProcessed = 0
  let totalUpdated = 0
  let totalErrors = 0

  // Loop until no rows have NULL task_cluster. Each iteration picks up at
  // most PAGE_SIZE rows; subsequent iterations naturally skip rows we
  // just updated because the WHERE filter excludes them.
  while (true) {
    const { data: rows, error } = await supabase
      .from('model_routing_decisions')
      .select('id, resolved_tier, signals_json')
      .is('task_cluster', null)
      .limit(PAGE_SIZE)

    if (error) {
      console.error('✗ Query error:', error.message)
      process.exit(1)
    }
    if (!rows || rows.length === 0) break

    // Compute cluster for each row, then UPDATE in batches of BATCH_SIZE.
    const pending = rows.map((row: any) => ({
      id: row.id as string,
      task_cluster: deriveTaskCluster(
        row.resolved_tier as string,
        (row.signals_json as Record<string, any>) ?? {},
      ),
    }))

    for (let i = 0; i < pending.length; i += BATCH_SIZE) {
      const batch = pending.slice(i, i + BATCH_SIZE)
      if (DRY_RUN) {
        totalUpdated += batch.length
        continue
      }
      // Supabase JS has no bulk-update-by-id-with-different-values
      // primitive, so we fire BATCH_SIZE parallel single-row UPDATEs.
      // 100 in parallel is well within Postgres connection-pool limits
      // and finishes ~12k rows in seconds.
      const results = await Promise.all(
        batch.map(b =>
          supabase
            .from('model_routing_decisions')
            .update({ task_cluster: b.task_cluster })
            .eq('id', b.id),
        ),
      )
      const batchErrors = results.filter(r => r.error)
      totalErrors += batchErrors.length
      totalUpdated += batch.length - batchErrors.length
      if (batchErrors.length > 0) {
        console.error(`  ✗ ${batchErrors.length}/${batch.length} update errors in batch ${i / BATCH_SIZE + 1}: ${batchErrors[0].error?.message}`)
      }
    }

    totalProcessed += rows.length
    console.log(`  ${totalProcessed} processed, ${totalUpdated} updated, ${totalErrors} errors`)

    // If this page wasn't full, we've drained the backlog.
    if (rows.length < PAGE_SIZE) break
  }

  console.log(`\n✓ Done. Processed ${totalProcessed}, updated ${totalUpdated}, errors ${totalErrors}`)
}

main().catch(e => {
  console.error('Fatal:', e)
  process.exit(1)
})
