// Agent-facing notification system.
//
// getActiveNotices() reads from the migration_notices table (migration 050)
// and returns rows that are currently in-effect. Callers attach the result
// to routing responses so agents learn about payload-shape changes, new
// preferences, deprecations, etc. without reading docs every session.
//
// Robust by design: a DB failure here MUST NOT block a routing response.
// Wrap every call in try/catch and treat any error as "no notices".

import type { createServerSupabaseClient } from '@/lib/supabase/server'

export interface MigrationNotice {
  severity: 'info' | 'warning' | 'critical'
  message: string
  hint?: string | null
  correct_endpoint?: string | null
  docs_url?: string | null
  effective_date: string  // 'YYYY-MM-DD'
}

interface MigrationNoticeRow {
  severity: 'info' | 'warning' | 'critical'
  message: string
  hint: string | null
  correct_endpoint: string | null
  docs_url: string | null
  effective_date: string
  target_agent_id: string | null
  target_endpoint: string | null
}

/**
 * Returns notices currently in effect for this caller.
 *
 * Filter rules:
 *   - is_active = true
 *   - expires_at IS NULL OR expires_at > NOW()
 *   - target_agent_id IS NULL (broadcast) OR target_agent_id = agentIdentityId
 *   - target_endpoint IS NULL (any) OR target_endpoint = endpointPath
 *
 * Never throws. Returns [] on any DB error or when nothing matches.
 */
export async function getActiveNotices(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  agentIdentityId?: string | null,
  endpointPath?: string,
): Promise<MigrationNotice[]> {
  try {
    const nowIso = new Date().toISOString()

    // Build query. target_agent_id filter is "broadcast OR mine" — easiest
    // expressed via .or() clause. If no agent id, only broadcasts qualify.
    let query = supabase
      .from('migration_notices')
      .select('severity, message, hint, correct_endpoint, docs_url, effective_date, target_agent_id, target_endpoint')
      .eq('is_active', true)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .order('created_at', { ascending: false })
      .limit(10)

    if (agentIdentityId) {
      // Either broadcast (null) or targeted at this agent
      query = query.or(`target_agent_id.is.null,target_agent_id.eq.${agentIdentityId}`)
    } else {
      query = query.is('target_agent_id', null)
    }

    const { data, error } = await query
    if (error || !data) return []

    // Endpoint filter happens client-side because the OR builder above is
    // already nested — keeping the SQL flat avoids brittle PostgREST nesting.
    const filtered = (data as MigrationNoticeRow[]).filter(row =>
      row.target_endpoint == null || row.target_endpoint === endpointPath,
    )

    return filtered.map(row => ({
      severity: row.severity,
      message: row.message,
      hint: row.hint,
      correct_endpoint: row.correct_endpoint,
      docs_url: row.docs_url,
      effective_date: row.effective_date,
    }))
  } catch {
    return []
  }
}
