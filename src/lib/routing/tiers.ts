/**
 * Tier-to-model resolution — Strategy D Phase 2
 *
 * The tier-to-model mapping lives here in source control, not in the
 * model_aliases table. The classifier emits a ClassifierTier string;
 * resolveTierToModel() returns the primary model ID and fallback chain
 * for the active routing profile.
 *
 * Phase 2 introduces three profiles. Agents opt in via routing_preferences
 * on agent_identities (migration 045). resolveProfileFromPreferences()
 * maps those toggles to a profile name.
 *
 * All model IDs must be verified rows in the models table (migration 043).
 */

export type ClassifierTier =
  | 'cheap_chat'
  | 'cheap_structured'
  | 'fast_code'
  | 'creative_writing'
  | 'reasoning_pro'
  | 'tool_agent'
  | 'best_available'

export type RoutingProfile = 'standard' | 'unregulated' | 'regulated'

export interface RoutingPreferences {
  allow_china: boolean
  regulated_industries: string[]
  /**
   * Whitelist of providers the agent's infrastructure can actually call.
   * When non-empty, resolveTierToModel walks the tier's [primary, ...fallbacks]
   * chain top-to-bottom and picks the first ID whose provider is in this list.
   * Empty array (or omitted) = no filter applied.
   */
  available_providers?: string[]
}

export interface TierResolution {
  primary: string         // models.id of the primary model
  fallbacks: string[]     // ordered models.id fallback chain
  required_effort_level?: 'low' | 'medium' | 'high' | 'xhigh' | 'max'
}

export const TIER_MAP: Record<RoutingProfile, Record<ClassifierTier, TierResolution>> = {
  standard: {
    cheap_chat: {
      primary: 'gemini-2.5-flash-lite',
      fallbacks: ['gemini-2.5-flash', 'gpt-5-nano'],
    },
    cheap_structured: {
      primary: 'gemini-2.5-flash',
      fallbacks: ['claude-haiku-4-5-20251001', 'gpt-5-nano'],
    },
    fast_code: {
      primary: 'claude-sonnet-4-6',
      fallbacks: ['gpt-5.4', 'claude-haiku-4-5-20251001'],
    },
    creative_writing: {
      primary: 'claude-sonnet-4-6',
      fallbacks: ['gpt-5.4', 'gemini-3.1-pro'],
    },
    reasoning_pro: {
      primary: 'claude-opus-4-6',
      fallbacks: ['gemini-3.1-pro', 'gpt-5.4'],
    },
    tool_agent: {
      primary: 'claude-sonnet-4-6',
      fallbacks: ['gpt-5.4', 'claude-opus-4-6'],
    },
    best_available: {
      primary: 'claude-opus-4-7',
      fallbacks: ['claude-opus-4-6', 'gpt-5.4-pro'],
      required_effort_level: 'xhigh',
    },
  },
  unregulated: {
    cheap_chat: {
      primary: 'deepseek-v3.2',
      fallbacks: ['gemini-2.5-flash-lite', 'gemini-2.5-flash'],
    },
    cheap_structured: {
      primary: 'deepseek-v3.2',
      fallbacks: ['gemini-2.5-flash', 'claude-haiku-4-5-20251001'],
    },
    fast_code: {
      primary: 'deepseek-v3.2',
      fallbacks: ['claude-sonnet-4-6', 'gpt-5.4'],
    },
    creative_writing: {
      primary: 'claude-sonnet-4-6',
      fallbacks: ['deepseek-v4', 'gpt-5.4'],
    },
    reasoning_pro: {
      primary: 'claude-opus-4-6',
      fallbacks: ['deepseek-r1', 'gemini-3.1-pro'],
    },
    tool_agent: {
      primary: 'claude-sonnet-4-6',
      fallbacks: ['gpt-5.4', 'deepseek-v4'],
    },
    best_available: {
      primary: 'claude-opus-4-7',
      fallbacks: ['claude-opus-4-6', 'gpt-5.4-pro'],
      required_effort_level: 'xhigh',
    },
  },
  regulated: {
    cheap_chat: {
      primary: 'gemini-2.5-flash-lite',
      fallbacks: ['claude-haiku-4-5-20251001', 'gpt-5-nano'],
    },
    cheap_structured: {
      primary: 'claude-haiku-4-5-20251001',
      fallbacks: ['gemini-2.5-flash', 'gpt-5-nano'],
    },
    fast_code: {
      primary: 'claude-sonnet-4-6',
      fallbacks: ['gpt-5.4', 'claude-haiku-4-5-20251001'],
    },
    creative_writing: {
      primary: 'claude-sonnet-4-6',
      fallbacks: ['gpt-5.4', 'claude-opus-4-6'],
    },
    reasoning_pro: {
      primary: 'claude-opus-4-6',
      fallbacks: ['gpt-5.4', 'claude-sonnet-4-6'],
    },
    tool_agent: {
      primary: 'claude-sonnet-4-6',
      fallbacks: ['gpt-5.4', 'claude-opus-4-6'],
    },
    best_available: {
      primary: 'claude-opus-4-7',
      fallbacks: ['claude-opus-4-6', 'gpt-5.4-pro'],
      required_effort_level: 'xhigh',
    },
  },
}

export const DEFAULT_ROUTING_PREFERENCES: RoutingPreferences = {
  allow_china: false,
  regulated_industries: [],
  available_providers: [],
}

/**
 * Anthropic-only tier map.
 *
 * Used when constraints.preferred_provider === 'anthropic' on POST /api/route.
 * The standard TIER_MAP routes cheap_chat / cheap_structured to Gemini —
 * customers on Anthropic-only API access (e.g. Sol Coloring) need an
 * all-Claude routing table that still respects cost-vs-quality tradeoffs.
 *
 * Notably: creative_writing routes to Sonnet, NOT Opus. Cost matters at scale,
 * and Sonnet 4.6 produces marketing-grade copy. Reserve Opus for reasoning_pro
 * and best_available.
 */
export const ANTHROPIC_ONLY_MAP: Record<ClassifierTier, TierResolution> = {
  cheap_chat: {
    primary: 'claude-haiku-4-5-20251001',
    fallbacks: ['claude-sonnet-4-6'],
  },
  cheap_structured: {
    primary: 'claude-haiku-4-5-20251001',
    fallbacks: ['claude-sonnet-4-6'],
  },
  fast_code: {
    primary: 'claude-sonnet-4-6',
    fallbacks: ['claude-haiku-4-5-20251001'],
  },
  creative_writing: {
    // Intentionally NOT Opus — Sonnet handles persuasive content at 1/5 the cost.
    primary: 'claude-sonnet-4-6',
    fallbacks: ['claude-opus-4-6'],
  },
  reasoning_pro: {
    primary: 'claude-opus-4-6',
    fallbacks: ['claude-sonnet-4-6'],
  },
  tool_agent: {
    primary: 'claude-sonnet-4-6',
    fallbacks: ['claude-haiku-4-5-20251001'],
  },
  best_available: {
    primary: 'claude-opus-4-7',
    fallbacks: ['claude-opus-4-6'],
    required_effort_level: 'xhigh',
  },
}

const PROVIDER_OVERRIDE_MAPS: Record<string, Record<ClassifierTier, TierResolution>> = {
  anthropic: ANTHROPIC_ONLY_MAP,
}

/**
 * Provider lookup for every model ID referenced in TIER_MAP / ANTHROPIC_ONLY_MAP.
 * Keep in sync with new IDs added to those tables. Used by available_providers
 * filtering — TIER_MAP only carries IDs, so we need this static lookup to know
 * which provider each ID belongs to without a DB round-trip.
 */
export const MODEL_PROVIDERS: Record<string, string> = {
  'gemini-2.5-flash-lite': 'google',
  'gemini-2.5-flash':      'google',
  'gemini-3.1-pro':        'google',
  'gpt-5-nano':            'openai',
  'gpt-5.4':               'openai',
  'gpt-5.4-pro':           'openai',
  'claude-haiku-4-5-20251001': 'anthropic',
  'claude-sonnet-4-6':         'anthropic',
  'claude-opus-4-6':           'anthropic',
  'claude-opus-4-7':           'anthropic',
  'deepseek-v3.2': 'deepseek',
  'deepseek-v4':   'deepseek',
  'deepseek-r1':   'deepseek',
}

/**
 * Filter a TierResolution's chain (primary + fallbacks) to only IDs whose
 * provider is in `availableProviders`. Walks top-to-bottom; the first match
 * becomes the new primary, the rest become fallbacks.
 *
 * Returns `null` when no model in the chain matches — callers can decide
 * whether to fall back to the unfiltered resolution or surface an error.
 */
export function filterByAvailableProviders(
  resolution: TierResolution,
  availableProviders?: string[],
): TierResolution | null {
  if (!availableProviders || availableProviders.length === 0) return resolution
  const allowed = new Set(availableProviders.map(p => p.toLowerCase()))

  const chain = [resolution.primary, ...resolution.fallbacks]
  const matched = chain.filter(id => {
    const provider = MODEL_PROVIDERS[id]
    return provider != null && allowed.has(provider)
  })

  if (matched.length === 0) return null
  return {
    primary: matched[0],
    fallbacks: matched.slice(1),
    required_effort_level: resolution.required_effort_level,
  }
}

export function resolveProfileFromPreferences(prefs: RoutingPreferences): RoutingProfile {
  if (prefs.regulated_industries && prefs.regulated_industries.length > 0) {
    return 'regulated'
  }
  if (prefs.allow_china) return 'unregulated'
  return 'standard'
}

export function resolveTierToModel(
  tier: ClassifierTier,
  profile: RoutingProfile = 'standard',
  preferredProvider?: string,
  availableProviders?: string[],
): TierResolution {
  // Provider constraint takes precedence over routing profile. Anthropic-only
  // callers get a Claude-only resolution regardless of standard/unregulated/
  // regulated profile preferences.
  let resolution: TierResolution | undefined
  if (preferredProvider) {
    const overrideMap = PROVIDER_OVERRIDE_MAPS[preferredProvider.toLowerCase()]
    if (overrideMap) {
      resolution = overrideMap[tier]
    }
  }

  if (!resolution) {
    const profileMap = TIER_MAP[profile]
    if (!profileMap) throw new Error(`Unknown routing profile: ${profile}`)
    resolution = profileMap[tier]
    if (!resolution) throw new Error(`Unknown tier: ${tier}`)
  }

  // available_providers filter: keep only chain entries whose provider is in
  // the agent's allowed list. If the filter empties the chain, fall back to
  // the unfiltered resolution rather than 404 — better to route to a model
  // the agent can't call (and let them retry with relaxed prefs) than to
  // hard-fail with no recommendation.
  if (availableProviders && availableProviders.length > 0) {
    const filtered = filterByAvailableProviders(resolution, availableProviders)
    if (filtered) return filtered
  }

  return resolution
}
