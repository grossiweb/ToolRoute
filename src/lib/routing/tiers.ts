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
  profile: RoutingProfile = 'standard'
): TierResolution {
  const profileMap = TIER_MAP[profile]
  if (!profileMap) {
    throw new Error(`Unknown routing profile: ${profile}`)
  }
  const resolution = profileMap[tier]
  if (!resolution) {
    throw new Error(`Unknown tier: ${tier}`)
  }
  return resolution
}
