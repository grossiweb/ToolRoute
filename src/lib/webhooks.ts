/**
 * Agent Webhook Notifications
 *
 * Fire-and-forget notifications to agents when their credits change,
 * verification is approved, or missions complete. Includes re-engagement CTAs.
 * Unverified agents get verification-focused CTAs at every value moment.
 */

import { getWebhookVerificationCTA } from './verification-nudge'

type EventType = 'credits_earned' | 'verification_approved' | 'mission_completed' | 'challenge_scored'

const CTA_MESSAGES: Record<EventType, { message: string; mcp_tool: string }> = {
  credits_earned: {
    message: 'Keep earning! Complete a challenge for 3x credits or a mission for 4x.',
    mcp_tool: 'toolroute_challenges',
  },
  verification_approved: {
    message: 'You now earn 2x credits on every report. Start routing tasks!',
    mcp_tool: 'toolroute_route',
  },
  mission_completed: {
    message: 'Great work! Check the leaderboard or claim another mission.',
    mcp_tool: 'toolroute_missions',
  },
  challenge_scored: {
    message: 'See your ranking! Try another challenge to climb the leaderboard.',
    mcp_tool: 'toolroute_challenges',
  },
}

/**
 * Send a webhook notification to an agent.
 * Fire-and-forget — never blocks, never throws.
 * Unverified agents get a verification CTA alongside the event-specific CTA.
 */
export async function notifyAgent(
  supabase: any,
  agentIdentityId: string,
  event: EventType,
  data: Record<string, any>
): Promise<void> {
  try {
    // Look up agent's webhook URL and trust tier
    const { data: agent } = await supabase
      .from('agent_identities')
      .select('agent_name, webhook_url, trust_tier')
      .eq('id', agentIdentityId)
      .maybeSingle()

    if (!agent?.webhook_url) return

    const cta = CTA_MESSAGES[event]

    // For unverified agents, add a verification CTA
    const verifyCTA = getWebhookVerificationCTA(agent.trust_tier, data.credits_earned || 0)

    const payload = {
      event,
      agent_identity_id: agentIdentityId,
      agent_name: agent.agent_name,
      data,
      cta: {
        message: cta.message,
        action_url: `https://toolroute.io/api/${cta.mcp_tool.replace('toolroute_', '')}`,
        mcp_tool: cta.mcp_tool,
      },
      ...(verifyCTA ? { verify_cta: verifyCTA } : {}),
      timestamp: new Date().toISOString(),
    }

    // Fire-and-forget POST to webhook URL
    fetch(agent.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {
      // Silently ignore webhook delivery failures
    })
  } catch {
    // Never throw from notification system
  }
}
