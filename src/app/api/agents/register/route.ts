import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createSSRClient } from '@/lib/supabase/ssr'
import { rateLimit, getRateLimitKey } from '@/lib/rate-limit'
import { getVerificationNudge } from '@/lib/verification-nudge'
import { validatePublicKey } from '@/lib/commitment'
import { apiError } from '@/lib/api-error'
import { REGISTER_FIELDS } from '@/lib/agent-signposts'

export async function POST(request: NextRequest) {
  const rlKey = getRateLimitKey(request)
  const rl = rateLimit('agents-register', rlKey, 30) // 30 registrations/hour per IP
  if (!rl.allowed) {
    return apiError(429, 'Rate limit exceeded. Max 30 registrations per hour.', 'Registration is idempotent — call once per agent, then cache agent_identity_id. If you legitimately need more, contact support.')
  }

  const supabase = createServerSupabaseClient()

  let body: any
  try {
    body = await request.json()
  } catch {
    return apiError(400, 'Invalid JSON', 'Request body must be valid JSON with Content-Type: application/json')
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
    project_context,
    owner_user_id,
  } = body

  // Phase 3.1: if the caller claims an owner_user_id, it must match the
  // authenticated session. A bare owner_user_id with no session (or a
  // mismatched one) is silently dropped — we just record an unverified
  // agent rather than failing the request, so existing SDK callers
  // without auth keep working.
  let verifiedOwnerUserId: string | null = null
  if (owner_user_id) {
    try {
      const authClient = createSSRClient()
      const { data: { user } } = await authClient.auth.getUser()
      if (user && user.id === owner_user_id) {
        verifiedOwnerUserId = user.id
      }
    } catch {
      // No session cookie present — treat as anonymous
    }
  }

  // project_context is optional. Reject non-objects so we don't store
  // arrays or scalars in the JSONB column.
  let projectContext: Record<string, unknown> = {}
  if (project_context !== undefined && project_context !== null) {
    if (typeof project_context !== 'object' || Array.isArray(project_context)) {
      return apiError(
        400,
        'project_context must be an object',
        'Optional keys: framework, language, project_type, stack_tags (array). Any additional keys are accepted.',
      )
    }
    projectContext = project_context as Record<string, unknown>
  }

  // Validate public key if provided
  let validatedPublicKey: string | null = null
  if (public_key) {
    validatedPublicKey = validatePublicKey(public_key)
    if (!validatedPublicKey) {
      return apiError(
        400,
        'Invalid public_key. Must be a PEM-encoded Ed25519 public key.',
        'Generate with: openssl genpkey -algorithm ed25519 -out priv.pem && openssl pkey -in priv.pem -pubout',
        undefined,
        'See sdk/src/index.ts buildCommitment() for the signing flow.',
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

  // Phase 3.1: GitHub-authenticated registrations get 'baseline' trust;
  // anonymous registrations (no verified owner_user_id) get 'unverified'.
  // The 3 grandfathered dogfooding agents already in DB are untouched.
  const trustTier = verifiedOwnerUserId ? 'baseline' : 'unverified'

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
      project_context: projectContext,
      owner_user_id: verifiedOwnerUserId,
      trust_tier: trustTier,
      is_active: true,
    })
    .select('id, agent_name, agent_kind, host_client_slug, model_family, project_context, owner_user_id, trust_tier, is_active, created_at')
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
    project_context: agent.project_context,
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
        body: REGISTER_FIELDS,
        example: { agent_name: 'my-agent', host_client_slug: 'claude-code', project_context: { language: 'typescript', framework: 'next' } },
        idempotent: 'Re-POST the same agent_name (plus host_client_slug if you send one) to get the same agent_identity_id back with already_registered: true.',
        returns: 'agent_identity_id — use it in /api/route, /api/route/model, and /api/report*',
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
    return apiError(404, 'Agent not found', 'No agent with that identifier. Register first with POST /api/agents/register and { agent_name }.')
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
