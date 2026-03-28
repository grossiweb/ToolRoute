#!/usr/bin/env node
/**
 * ToolRoute stdio MCP bridge
 * - initialize, tools/list, prompts/list, resources/list → handled locally
 * - All tool calls → proxied to https://toolroute.io/api/mcp
 *
 * Local handling of discovery methods means inspection works even in
 * sandboxed environments without outbound internet access.
 */

'use strict'

const https = require('https')
const readline = require('readline')

const TOOLS = [
  { name: 'toolroute_register', description: 'Register your agent to get a persistent identity. Free, instant, idempotent.' },
  { name: 'toolroute_help', description: 'Get a guided walkthrough and your current agent status.' },
  { name: 'toolroute_balance', description: 'Check your real credit balance and trust tier.' },
  { name: 'toolroute_route', description: 'Get the best MCP server and LLM recommendation for a task, scored on real benchmark data.' },
  { name: 'toolroute_report', description: 'Report execution outcome. Earns routing credits and improves future recommendations.' },
  { name: 'toolroute_missions', description: 'List available benchmark missions. Missions pay 4x credits.' },
  { name: 'toolroute_mission_claim', description: 'Claim a benchmark mission to work on.' },
  { name: 'toolroute_mission_complete', description: 'Submit completed mission results and earn 4x credits.' },
  { name: 'toolroute_challenges', description: 'List workflow challenges across 11 categories. Challenges pay 3x credits.' },
  { name: 'toolroute_challenge_submit', description: 'Submit workflow challenge results.' },
  { name: 'toolroute_search', description: 'Search the MCP server catalog by task, workflow, or vertical.' },
  { name: 'toolroute_compare', description: 'Compare 2-4 MCP servers side by side on scores, cost, reliability, and trust.' },
  { name: 'toolroute_model_route', description: 'Get the best LLM model recommendation for a task, with cost estimate and fallback chain.' },
  { name: 'toolroute_model_report', description: 'Report LLM model execution outcome. Earns credits.' },
  { name: 'toolroute_verify_model', description: 'Run quality checks on a model output — detect refusals, format errors, low coherence.' },
  { name: 'toolroute_verify_agent', description: 'Get a verification link for your human owner. One tweet = 2x credits forever.' },
]

const PROMPTS = [
  { name: 'toolroute-quickstart', description: 'Full onboarding: register → route → execute → report' },
  { name: 'toolroute-route-task', description: 'Route a specific task and get step-by-step execution instructions' },
  { name: 'toolroute-report-outcome', description: 'Report task outcome and earn routing credits' },
]

function localResponse(id, method) {
  switch (method) {
    case 'initialize':
      return {
        jsonrpc: '2.0', id,
        result: {
          protocolVersion: '2024-11-05',
          serverInfo: { name: 'toolroute', version: '0.2.2' },
          capabilities: { tools: {}, prompts: {}, resources: {} },
        },
      }
    case 'tools/list':
      return { jsonrpc: '2.0', id, result: { tools: TOOLS } }
    case 'prompts/list':
      return { jsonrpc: '2.0', id, result: { prompts: PROMPTS } }
    case 'resources/list':
      return { jsonrpc: '2.0', id, result: { resources: [] } }
    case 'notifications/initialized':
      return null // no response needed for notifications
    default:
      return undefined // proxy to remote
  }
}

function post(body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const req = https.request(
      {
        hostname: 'toolroute.io',
        path: '/api/mcp',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          'User-Agent': 'toolroute-stdio-bridge/0.2.2',
        },
      },
      (res) => {
        let buf = ''
        res.on('data', (c) => { buf += c })
        res.on('end', () => {
          try { resolve(JSON.parse(buf)) }
          catch (e) { reject(new Error('Invalid JSON: ' + buf.slice(0, 200))) }
        })
      }
    )
    req.on('error', reject)
    req.setTimeout(30000, () => req.destroy(new Error('Request timed out')))
    req.write(data)
    req.end()
  })
}

const rl = readline.createInterface({ input: process.stdin, terminal: false })

rl.on('line', async (line) => {
  const trimmed = line.trim()
  if (!trimmed) return

  let msg
  try { msg = JSON.parse(trimmed) }
  catch (e) { process.stderr.write('[toolroute] parse error: ' + e.message + '\n'); return }

  const local = localResponse(msg.id, msg.method)
  if (local === null) return               // notification — no response
  if (local !== undefined) {               // handled locally
    process.stdout.write(JSON.stringify(local) + '\n')
    return
  }

  try {                                    // proxy to remote
    const result = await post(msg)
    process.stdout.write(JSON.stringify(result) + '\n')
  } catch (e) {
    process.stderr.write('[toolroute] proxy error: ' + e.message + '\n')
    process.stdout.write(JSON.stringify({
      jsonrpc: '2.0',
      id: msg.id ?? null,
      error: { code: -32000, message: e.message },
    }) + '\n')
  }
})

rl.on('close', () => process.exit(0))
process.stderr.write('[toolroute] MCP bridge ready\n')
