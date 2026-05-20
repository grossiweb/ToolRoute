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
// object was constructed. Active = boolean true OR positive number.
//
// This is the join key for getRoutingMemory() — small cardinality keeps
// the per-agent history dense enough to be useful.

export function deriveTaskCluster(
  tier: string,
  signals: Record<string, boolean | number | undefined | null>,
): string {
  const active = Object.entries(signals)
    .filter(([, v]) => v === true || (typeof v === 'number' && v > 0))
    .map(([k]) => k)
    .sort()
  if (active.length === 0) return tier
  return `${tier}:${active.slice(0, 2).join('+')}`
}
