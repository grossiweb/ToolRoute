import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
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
  } = body

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
    message: 'Agent registered successfully. Use agent_identity_id for routing and telemetry.',
    next_steps: {
      route: 'POST /api/route with { task, agent_identity_id }',
      report: 'POST /api/report with { skill_slug, outcome, agent_identity_id }',
      missions: 'POST /api/missions/claim with { mission_id, agent_identity_id }',
    },
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
    .select('id, agent_name, agent_kind, host_client_slug, model_family, trust_tier, is_active, created_at')

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
