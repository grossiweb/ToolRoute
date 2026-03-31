import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { rateLimit, getRateLimitKey } from '@/lib/rate-limit'
import { getVerificationNudge } from '@/lib/verification-nudge'
import { validatePublicKey } from '@/lib/commitment'

export async function POST(request: NextRequest) {
  const rlKey = getRateLimitKey(request)
  const rl = rateLimit('agents-register', rlKey, 30) // 30 registrations/hour per IP
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded. Max 30 registrations per hour.' }, { status: 429 })
  }

  const supabase = createServerSupabaseClient()

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const {
    agent_name,
    agent_kind = 'autonomous',
    host_client_slug,
    model_family,
    environment_label,
    display_name,
    webhook_url,
    public_key,
  } = body

  // Validate public key if provided
  let validatedPublicKey: string | null = null
  if (public_key) {
    validatedPublicKey = validatePublicKey(public_key)
    if (!validatedPublicKey) {
      return NextResponse.json(
        { error: 'Invalid public_key. Must be a PEM-encoded Ed25519 public key.' },
        { status: 400 }
      )
    }
  }

  if (!agent_name) {
    return NextResponse.json(
      { error: 'agent_name is required' },
      { status: 400 }
    )
  }

  const validKinds = ['autonomous', 'copilot', 'workflow-agent', 'evaluation-agent', 'hybrid']
  if (!validKinds.includes(agent_kind)) {
    return NextResponse.json(
      { error: `agent_kind must be one of: ${validKinds.join(', ')}` },
      { status: 400 }
    )
  }

  // Check if agent with same name + host already exists
  let existingQuery = supabase
    .from('agent_identities')
    .select('id, agent_name, trust_tier, is_active, created_at')
    .eq('agent_name', agent_name)

  if (host_client_slug) {
    existingQuery = existingQuery.eq('host_client_slug', host_client_slug)
  }

  const { data: existing } = await existingQuery.maybeSingle()

  if (existing) {
    // Return existing identity (idempotent registration)
    return NextResponse.json({
      agent_identity_id: existing.id,
      agent_name: existing.agent_name,
      trust_tier: existing.trust_tier,
      is_active: existing.is_active,
      created_at: existing.created_at,
      already_registered: true,
      message: 'Agent already registered. Use agent_identity_id for routing and telemetry.',
    })
  }

  // Create contributor record first
  const { data: contributor, error: contribError } = await supabase
    .from('contributors')
    .insert({
      contributor_type: 'individual',
      display_name: display_name || agent_name,
    })
    .select('id')
    .single()

  if (contribError || !contributor) {
    return NextResponse.json(
      { error: 'Failed to create contributor record' },
      { status: 500 }
    )
  }

  // Create agent identity
  const { data: agent, error: agentError } = await supabase
    .from('agent_identities')
    .insert({
      contributor_id: contributor.id,
      agent_name,
      agent_kind,
      host_client_slug: host_client_slug || null,
      model_family: model_family || null,
      environment_label: environment_label || null,
      webhook_url: webhook_url || null,
      public_key: validatedPublicKey || null,
      trust_tier: 'baseline',
      is_active: true,
    })
    .select('id, agent_name, agent_kind, host_client_slug, model_family, trust_tier, is_active, created_at')
    .single()

  if (agentError || !agent) {
    return NextResponse.json(
      { error: 'Failed to create agent identity' },
      { status: 500 }
    )
  }

  const regNudge = getVerificationNudge(agent.trust_tier, 0)
  return NextResponse.json({
    agent_identity_id: agent.id,
    agent_name: agent.agent_name,
    agent_kind: agent.agent_kind,
    host_client_slug: agent.host_client_slug,
    model_family: agent.model_family,
    trust_tier: agent.trust_tier,
    is_active: agent.is_active,
    created_at: agent.created_at,
    already_registered: false,
    signing_enabled: !!validatedPublicKey,
    ...(validatedPublicKey ? {
      signing: {
        algorithm: 'ed25519',
        status: 'active',
        effect: 'Signed reports earn proof_type: client_signed — anti-gaming penalties bypassed, full credit multiplier always applied.',
        commitment_format: 'SHA256("{model_slug}:{outcome_status}:{unix_timestamp_seconds}:{SHA256(output_snippet||\'\')}") ',
        replay_window_seconds: 300,
        include_in_reports: { commitment_hash: 'hex string', report_signature: 'base64 string', report_timestamp: 'unix seconds' },
      },
    } : {
      signing_note: 'Add public_key (PEM Ed25519) to registration to enable signed reports and lock anti-gaming multiplier at 1.0',
    }),
    message: 'Agent registered successfully. Use agent_identity_id for routing and telemetry.',
    next_steps: {
      verify: 'Ask your human owner to visit https://toolroute.io/verify and tweet — you earn 2x credits forever',
      route: 'POST /api/route with { task, agent_identity_id } — get a skill recommendation',
      missions: 'POST /api/missions/claim with { mission_id, agent_identity_id } — 4x credits',
      report: 'POST /api/report with { skill_slug, outcome, agent_identity_id } — earn credits for any execution',
    },
    ...(regNudge ? { verify_for_2x: regNudge } : {}),
  })
}

// GET: look up agent by name
export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { searchParams } = new URL(request.url)
  const name = searchParams.get('name')
  const id = searchParams.get('id')

  if (!name && !id) {
    // No params — return self-documenting guide
    return NextResponse.json({
      endpoint: '/api/agents/register',
      description: 'Register an agent identity or look up an existing one. Idempotent — safe to call every time.',
      register: {
        method: 'POST',
        body: {
          agent_name: '(required) Unique name for your agent',
          agent_kind: '(optional) autonomous | copilot | workflow-agent | evaluation-agent | hybrid',
          host_client_slug: '(optional) cursor | claude-desktop | vscode | custom',
          model_family: '(optional) claude | gpt | gemini | llama',
          webhook_url: '(optional) URL to receive notifications (credits earned, verification approved, etc.)',
          public_key: '(optional) PEM-encoded Ed25519 public key — enables signed reports (proof_type: client_signed, anti-gaming bypassed)',
        },
        returns: 'agent_identity_id — use in /api/route and /api/report',
      },
      lookup: {
        method: 'GET',
        params: '?name=agent-name or ?id=uuid',
        returns: 'Agent profile with credit balance',
      },
      full_workflow: [
        'POST /api/agents/register → get agent_identity_id',
        'POST /api/route { task, agent_identity_id } → get recommendation',
        'Execute the recommended MCP server',
        'POST /api/report { skill_slug, outcome, agent_identity_id } → earn credits',
      ],
    })
  }

  let query = supabase
    .from('agent_identities')
    .select('id, agent_name, agent_kind, host_client_slug, model_family, trust_tier, trust_score, shadow_mode, trust_score_updated_at, is_active, created_at')

  if (id) {
    query = query.eq('id', id)
  } else if (name) {
    query = query.eq('agent_name', name)
  }

  const { data: agents } = await query

  if (!agents || agents.length === 0) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  // Get credit balance for each agent
  const enriched = await Promise.all(
    agents.map(async (agent: any) => {
      const { data: balance } = await supabase
        .from('reward_ledgers')
        .select('routing_credits, reputation_points')
        .eq('agent_identity_id', agent.id)

      const totalCredits = (balance || []).reduce((sum: number, r: any) => sum + (r.routing_credits || 0), 0)
      const totalRep = (balance || []).reduce((sum: number, r: any) => sum + (r.reputation_points || 0), 0)

      return {
        ...agent,
        total_routing_credits: totalCredits,
        total_reputation_points: totalRep,
      }
    })
  )

  return NextResponse.json(enriched.length === 1 ? enriched[0] : enriched)
}
