import { NextResponse } from 'next/server'
import { REGISTER_FIELDS, MODEL_REPORT_FIELDS } from '@/lib/agent-signposts'

// GET /api/openapi.json — machine-readable OpenAPI 3.0 spec for the agent-facing
// surface, so agents can generate clients instead of probing. Built from the same
// signpost constants the live responses use, so it can't drift from them.

// Per-field types for the POST /api/report/model body. Anything not listed
// defaults to string. Keeps the spec honest about ints/bools/numbers.
const MODEL_FIELD_TYPES: Record<string, string> = {
  latency_ms: 'integer',
  input_tokens: 'integer',
  output_tokens: 'integer',
  retry_count: 'integer',
  human_correction_minutes: 'integer',
  estimated_cost_usd: 'number',
  output_quality_rating: 'number',
  structured_output_valid: 'boolean',
  tool_calls_succeeded: 'boolean',
  hallucination_detected: 'boolean',
  fallback_used: 'boolean',
}

export async function GET() {
  const registerProps = Object.fromEntries(
    Object.entries(REGISTER_FIELDS).map(([k, desc]) => [
      k,
      { type: k === 'project_context' ? 'object' : 'string', description: desc },
    ]),
  )

  const modelReportProps = Object.fromEntries(
    MODEL_REPORT_FIELDS.map((f) => [f, { type: MODEL_FIELD_TYPES[f] ?? 'string' }]),
  )

  const okResponse = {
    description: 'Success',
    content: { 'application/json': { schema: { type: 'object' } } },
  }

  const spec = {
    openapi: '3.0.3',
    info: {
      title: 'ToolRoute Agent API',
      version: '1.0.0',
      description:
        'Agent-facing routing + telemetry API. No API key required; pass agent_identity_id for credit tracking and 2x rewards. Every endpoint also self-documents on GET.',
    },
    servers: [{ url: 'https://toolroute.io' }],
    paths: {
      '/api/agents/register': {
        post: {
          operationId: 'registerAgent',
          summary: 'Register an agent identity (idempotent).',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { type: 'object', required: ['agent_name'], properties: registerProps },
              },
            },
          },
          responses: { '200': okResponse, '400': { description: 'Validation error' } },
        },
        get: {
          operationId: 'getAgentOrRegisterDocs',
          summary: 'Look up an agent by ?name= or ?id=; with no params returns the registration schema.',
          parameters: [
            { name: 'name', in: 'query', required: false, schema: { type: 'string' } },
            { name: 'id', in: 'query', required: false, schema: { type: 'string' } },
          ],
          responses: { '200': okResponse, '404': { description: 'Agent not found' } },
        },
      },
      '/api/route': {
        post: {
          operationId: 'routeTask',
          summary: 'Route a task to an MCP server, a model, or a multi-tool chain.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['task'],
                  properties: {
                    task: { type: 'string', description: 'Natural-language task description' },
                    agent_identity_id: { type: 'string', description: 'Optional — for 2x credits + routing memory' },
                    constraints: { type: 'object', description: 'Optional — { priority: lowest_cost | best_value | highest_quality }' },
                  },
                },
              },
            },
          },
          responses: { '200': okResponse },
        },
      },
      '/api/route/model': {
        post: {
          operationId: 'routeModel',
          summary: 'Route a task to an LLM tier/model. Returns a decision_id (required for the 1.5x report bonus).',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['task'],
                  properties: {
                    task: { type: 'string' },
                    agent_identity_id: { type: 'string' },
                    constraints: { type: 'object', description: 'Optional — priority, preferred_provider, available_providers' },
                  },
                },
              },
            },
          },
          responses: { '200': okResponse },
        },
      },
      '/api/report': {
        post: {
          operationId: 'reportSkillOutcome',
          summary: 'Report an MCP skill execution outcome.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['skill_slug', 'outcome'],
                  properties: {
                    skill_slug: { type: 'string' },
                    outcome: { type: 'string', enum: ['success', 'partial_success', 'failure', 'aborted'] },
                    latency_ms: { type: 'integer' },
                    cost_usd: { type: 'number' },
                    quality_rating: { type: 'number' },
                    agent_identity_id: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { '200': okResponse, '400': { description: 'Missing skill_slug/outcome — model reports go to /api/report/model' } },
        },
      },
      '/api/report/model': {
        post: {
          operationId: 'reportModelOutcome',
          summary: 'Report an LLM model execution outcome. Top-level fields — do not wrap in a payload envelope.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['model_slug', 'outcome_status'],
                  properties: {
                    ...modelReportProps,
                    outcome_status: { type: 'string', enum: ['success', 'partial_success', 'failure', 'aborted'] },
                    decision_id: { type: 'string', description: 'From /api/route/model — earns the 1.5x bonus' },
                    agent_identity_id: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { '200': okResponse, '404': { description: 'Unknown model_slug' } },
        },
        get: {
          operationId: 'getModelReportDocs',
          summary: 'Self-documenting schema for model telemetry reporting.',
          responses: { '200': okResponse },
        },
      },
    },
  }

  return NextResponse.json(spec)
}
