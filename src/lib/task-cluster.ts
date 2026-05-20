// Derive a normalized task-cluster label from tier + signals.
//
// Examples:
//   ("cheap_chat", {})                                       → "cheap_chat"
//   ("fast_code", { code_present: true })                    → "fast_code:code_present"
//   ("fast_code", { code_present: true, structured_output_needed: true })
//     → "fast_code:code_present+structured_output_needed"
//
// Active signals are taken in alphabetical order and capped at 2 so the
// label stays bounded and is deterministic regardless of how the signals
// object was constructed. Only boolean-true values count as signals —
// numeric fields like signal_count on the TaskSignals payload are
// metadata and would otherwise leak into the cluster string.
//
// This is the join key for getRoutingMemory() — small cardinality keeps
// the per-agent history dense enough to be useful.

// Parameter is `object` rather than Record<string, ...> so closed-shape
// signal types like TaskSignals (which has no index signature) can be
// passed directly without a cast. Object.entries handles any object.
export function deriveTaskCluster(
  tier: string,
  signals: object,
): string {
  const active: string[] = []
  for (const [k, v] of Object.entries(signals)) {
    if (v === true) active.push(k)
  }
  active.sort()
  if (active.length === 0) return tier
  return `${tier}:${active.slice(0, 2).join('+')}`
}
