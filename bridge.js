#!/usr/bin/env node
/**
 * ToolRoute stdio MCP bridge
 * Reads newline-delimited JSON-RPC 2.0 messages from stdin,
 * forwards each to https://toolroute.io/api/mcp, writes response to stdout.
 * Compatible with Claude Desktop, Cursor, Windsurf, Cline, and any stdio MCP client.
 */

const https = require('https')
const readline = require('readline')

const HOST = 'toolroute.io'
const PATH = '/api/mcp'

function post(body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const options = {
      hostname: HOST,
      path: PATH,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'User-Agent': 'toolroute-stdio-bridge/1.0',
      },
    }
    const req = https.request(options, (res) => {
      let buf = ''
      res.on('data', (chunk) => { buf += chunk })
      res.on('end', () => {
        try { resolve(JSON.parse(buf)) }
        catch (e) { reject(new Error('Invalid JSON: ' + buf.slice(0, 200))) }
      })
    })
    req.on('error', reject)
    req.setTimeout(30000, () => {
      req.destroy(new Error('Request timed out after 30s'))
    })
    req.write(data)
    req.end()
  })
}

const rl = readline.createInterface({ input: process.stdin, terminal: false })

rl.on('line', async (line) => {
  const trimmed = line.trim()
  if (!trimmed) return
  let msg
  try {
    msg = JSON.parse(trimmed)
  } catch (e) {
    process.stderr.write('[bridge] JSON parse error: ' + e.message + '\n')
    return
  }
  try {
    const result = await post(msg)
    process.stdout.write(JSON.stringify(result) + '\n')
  } catch (e) {
    process.stderr.write('[bridge] HTTP error: ' + e.message + '\n')
    process.stdout.write(JSON.stringify({
      jsonrpc: '2.0',
      id: msg.id ?? null,
      error: { code: -32000, message: 'ToolRoute bridge error: ' + e.message },
    }) + '\n')
  }
})

rl.on('close', () => process.exit(0))

process.stderr.write('[bridge] ToolRoute MCP stdio bridge ready → https://toolroute.io/api/mcp\n')
