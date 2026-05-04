import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { rateLimit, getRateLimitKey } from '@/lib/rate-limit'
import {
  resolveProfileFromPreferences,
  DEFAULT_ROUTING_PREFERENCES,
  RoutingPreferences,
} from '@/lib/routing/tiers'

const VALID_REGULATED_INDUSTRIES = ['healthcare', 'finance', 'government', 'eu_regulated'] as const

export async function POST(request: NextRequest) {
  const rlKey = getRateLimitKey(request)
  const rl = rateLimit('agents-preferences', rlKey, 60)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded. Max 60 updates per hour.' }, { status: 429 })
  }

  const supabase = createServerSupabaseClient()

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { agent_identity_id, preferences } = body

  if (!agent_identity_id || typeof agent_identity_id !== 'string') {
    return NextResponse.json(
      { error: 'agent_identity_id is required and must be a string (UUID).' },
      { status: 400 }
    )
  }

  if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences)) {
    return NextResponse.json(
      { error: 'preferences is required and must be an object.' },
      { status: 400 }
    )
  }

  // Validate allow_china if present
  if ('allow_china' in preferences && typeof preferences.allow_china !== 'boolean') {
    return NextResponse.json(
      { error: 'preferences.allow_china must be a boolean.' },
      { status: 400 }
    )
  }

  // Validate regulated_industries if present
  if ('regulated_industries' in preferences) {
    if (!Array.isArray(preferences.regulated_industries)) {
      return NextResponse.json(
        { error: 'preferences.regulated_industries must be an array.' },
        { status: 400 }
      )
    }
    for (const ind of preferences.regulated_industries) {
      if (typeof ind !== 'string' || !VALID_REGULATED_INDUSTRIES.includes(ind as any)) {
        return NextResponse.json(
          {
            error: `Invalid regulated industry: ${JSON.stringify(ind)}. Must be one of: ${VALID_REGULATED_INDUSTRIES.join(', ')}.`,
          },
          { status: 400 }
        )
      }
    }
  }

  // Verify agent exists and load existing preferences
  const { data: agent, error: fetchErr } = await supabase
    .from('agent_identities')
    .select('id, routing_preferences')
    .eq('id', agent_identity_id)
    .maybeSingle()

  if (fetchErr) {
    return NextResponse.json(
      { error: 'Database error fetching agent.' },
      { status: 500 }
    )
  }
  if (!agent) {
    return NextResponse.json(
      { error: 'agent_identity_id not found.' },
      { status: 404 }
    )
  }

  // Replace per-field: present fields overwrite, absent fields keep existing.
  // Empty array is a meaningful value (user wants no regulated industries).
  const existing: RoutingPreferences = agent.routing_preferences ?? DEFAULT_ROUTING_PREFERENCES
  const merged: RoutingPreferences = {
    allow_china:
      'allow_china' in preferences ? preferences.allow_china : existing.allow_china,
    regulated_industries:
      'regulated_industries' in preferences
        ? preferences.regulated_industries
        : existing.regulated_industries,
  }

  const { data: updated, error: updateErr } = await supabase
    .from('agent_identities')
    .update({ routing_preferences: merged })
    .eq('id', agent_identity_id)
    .select('id, routing_preferences')
    .single()

  if (updateErr || !updated) {
    return NextResponse.json(
      { error: 'Failed to update preferences.' },
      { status: 500 }
    )
  }

  // Resolve profile from the post-update value the next route call will see.
  const resolvedProfile = resolveProfileFromPreferences(
    updated.routing_preferences ?? DEFAULT_ROUTING_PREFERENCES
  )

  return NextResponse.json({
    agent_identity_id: updated.id,
    preferences: updated.routing_preferences,
    resolved_profile: resolvedProfile,
  })
}
