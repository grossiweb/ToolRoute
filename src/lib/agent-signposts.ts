// Shared agent-facing signpost constants. Single source of truth so every
// endpoint that points an agent at registration or model reporting uses the
// same field names and copy. Response-shaping only — no writes, no schema.

// Fields accepted by POST /api/agents/register. agent_name is the only required
// field; everything else is optional. There is intentionally NO `description`
// field — display_name is the human-friendly label.
export const REGISTER_FIELDS = {
  agent_name: 'required — unique name; re-registering the same name is idempotent and returns the same agent_identity_id',
  agent_kind: 'optional — autonomous | copilot | workflow-agent | evaluation-agent | hybrid (default: autonomous)',
  host_client_slug: 'optional — host/runtime, e.g. claude-code, cursor, claude-desktop, vscode, openclaw',
  model_family: 'optional — claude | gpt | gemini | llama',
  display_name: 'optional — human-friendly label for your agent',
  project_context: 'optional — object { framework, language, project_type, stack_tags[] }; seeds project-clustered routing memory',
  public_key: 'optional — PEM Ed25519 public key; enables signed reports (proof_type: client_signed, anti-gaming bypassed)',
  webhook_url: 'optional — URL to receive notifications (credits earned, verification approved)',
} as const

// Build a register signpost with a context-specific message. `body` stays a
// minimal copy-pasteable example; `fields` documents the full accepted shape.
export function registerHint(message: string) {
  return {
    message,
    action: 'POST /api/agents/register',
    body: { agent_name: 'your-agent-name' },
    fields: REGISTER_FIELDS,
    docs: 'GET /api/agents/register for the full schema and examples',
  }
}

// Fields POST /api/report/model accepts at the TOP LEVEL. model_slug +
// outcome_status are required; the rest are optional but raise the quality
// verification tier and the credits earned. See GET /api/report/model for
// per-field semantics.
export const MODEL_REPORT_FIELDS = [
  'model_slug',
  'outcome_status',
  'latency_ms',
  'input_tokens',
  'output_tokens',
  'estimated_cost_usd',
  'output_quality_rating',
  'structured_output_valid',
  'tool_calls_succeeded',
  'hallucination_detected',
  'fallback_used',
  'retry_count',
  'human_correction_minutes',
] as const
