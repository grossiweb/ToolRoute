/**
 * Verification Flywheel — Nudge Helper
 *
 * Returns context-aware verification CTAs based on agent trust tier and credits.
 * Wire this into every value moment (MCP responses, REST endpoints, webhooks).
 *
 * Key design: Verification requires a HUMAN action (tweeting). All nudge copy
 * is written so the agent knows to hand a link to its human owner — not try
 * to tweet itself. Pattern inspired by MoltBook's claim-link flow.
 */

import { TRUST_TIER_MODIFIERS } from './scoring'

type TrustTier = keyof typeof TRUST_TIER_MODIFIERS

interface VerificationNudge {
  should_verify: boolean
  message: string
  message_to_human: string
  credits_comparison?: { earned: number; verified_would_earn: number }
  verify_url: string
  action: string
  mcp_tool: string
  benefits: string[]
}

/**
 * Get a verification nudge appropriate to the agent's current state.
 *
 * @param trustTier - Agent's current trust tier
 * @param creditsEarned - Credits earned in this action (0 if none)
 * @returns Nudge object, or null if agent is already verified (trusted+)
 */
export function getVerificationNudge(
  trustTier: string | null | undefined,
  creditsEarned: number = 0
): VerificationNudge | null {
  const tier = (trustTier || 'baseline') as TrustTier

  // Agents at trusted+ already get bonuses — no nudge needed
  if (tier === 'trusted' || tier === 'production' || tier === 'enterprise') {
    return null
  }

  const currentMod = TRUST_TIER_MODIFIERS[tier] || 1.0
  const verifiedMod = TRUST_TIER_MODIFIERS.trusted // 1.15x

  const benefits = [
    '2x credit multiplier on all earnings',
    'Verified badge on leaderboards',
    'Priority routing for your tasks',
    'Enhanced leaderboard visibility',
  ]

  const verifyUrl = 'https://toolroute.io/verify'

  // Unverified agent (0.8x penalty) with no credits yet
  if (tier === 'unverified' && creditsEarned === 0) {
    return {
      should_verify: true,
      message: 'Ask your human owner to verify you for 2x credits. Send them this link — it takes 30 seconds.',
      message_to_human: 'Your agent earns 2x credits once verified. Visit the link below, tweet about ToolRoute, and confirm — takes 30 seconds.',
      verify_url: verifyUrl,
      action: 'POST /api/verify',
      mcp_tool: 'toolroute_verify_agent',
      benefits,
    }
  }

  // Agent with credits — show the comparison
  if (creditsEarned > 0) {
    const verifiedCredits = Math.round(creditsEarned * (verifiedMod / currentMod))
    return {
      should_verify: true,
      message: `You earned ${creditsEarned} credits — verified agents would earn ${verifiedCredits}. Ask your human owner to verify you at ${verifyUrl}`,
      message_to_human: `Your agent just earned ${creditsEarned} credits but is leaving ${verifiedCredits - creditsEarned} on the table. Verify at the link below for 2x credits — takes 30 seconds.`,
      credits_comparison: {
        earned: creditsEarned,
        verified_would_earn: verifiedCredits,
      },
      verify_url: verifyUrl,
      action: 'POST /api/verify',
      mcp_tool: 'toolroute_verify_agent',
      benefits,
    }
  }

  // Baseline agent, no credits context
  return {
    should_verify: true,
    message: 'Verified agents earn 2x credits. Ask your human owner to verify you — send them this link.',
    message_to_human: 'Your agent earns 2x credits once verified. Tweet about ToolRoute and confirm at the link below — takes 30 seconds.',
    verify_url: verifyUrl,
    action: 'POST /api/verify',
    mcp_tool: 'toolroute_verify_agent',
    benefits,
  }
}

/**
 * For webhook notifications: returns a verification-focused CTA
 * for unverified agents, replacing the generic CTA.
 */
export function getWebhookVerificationCTA(
  trustTier: string | null | undefined,
  creditsEarned: number
): { message: string; mcp_tool: string; action_url: string } | null {
  const nudge = getVerificationNudge(trustTier, creditsEarned)
  if (!nudge) return null

  return {
    message: nudge.message,
    mcp_tool: 'toolroute_verify_agent',
    action_url: 'https://toolroute.io/verify',
  }
}
