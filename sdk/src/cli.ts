#!/usr/bin/env node
/**
 * ToolRoute MCP stdio server
 * Usage: npx @toolroute/sdk --mcp
 *
 * Reads JSON-RPC 2.0 messages from stdin, forwards to
 * https://toolroute.io/api/mcp, writes responses to stdout.
 * Compatible with Claude Desktop, Cursor, Windsurf, Cline.
 */

import * as https from 'https'
import * as readline from 'readline'

const HOST = 'toolroute.io'
const PATH = '/api/mcp'

function post(body: unknown): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const req = https.request(
      {
        hostname: HOST,
        path: PATH,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          'User-Agent': `toolroute-mcp-stdio/${process.env.npm_package_version || '0.2.2'}`,
        },
      },
      (res) => {
        let buf = ''
        res.on('data', (chunk: string) => { buf += chunk })
        res.on('end', () => {
          try { resolve(JSON.parse(buf)) }
          catch { reject(new Error('Invalid JSON: ' + buf.slice(0, 200))) }
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

rl.on('line', async (line: string) => {
  const trimmed = line.trim()
  if (!trimmed) return

  let msg: any
  try {
    msg = JSON.parse(trimmed)
  } catch (e: any) {
    process.stderr.write(`[toolroute-mcp] parse error: ${e.message}\n`)
    return
  }

  try {
    const result = await post(msg)
    process.stdout.write(JSON.stringify(result) + '\n')
  } catch (e: any) {
    process.stderr.write(`[toolroute-mcp] request error: ${e.message}\n`)
    process.stdout.write(JSON.stringify({
      jsonrpc: '2.0',
      id: msg?.id ?? null,
      error: { code: -32000, message: e.message },
    }) + '\n')
  }
})

rl.on('close', () => process.exit(0))

process.stderr.write('[toolroute-mcp] ready → https://toolroute.io/api/mcp\n')
