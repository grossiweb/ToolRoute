#!/usr/bin/env node
#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/cli.ts
var https = __toESM(require("https"));
var readline = __toESM(require("readline"));
var HOST = "toolroute.io";
var PATH = "/api/mcp";
function post(body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request(
      {
        hostname: HOST,
        path: PATH,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
          "User-Agent": `toolroute-mcp-stdio/${process.env.npm_package_version || "0.2.2"}`
        }
      },
      (res) => {
        let buf = "";
        res.on("data", (chunk) => {
          buf += chunk;
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(buf));
          } catch {
            reject(new Error("Invalid JSON: " + buf.slice(0, 200)));
          }
        });
      }
    );
    req.on("error", reject);
    req.setTimeout(3e4, () => req.destroy(new Error("Request timed out")));
    req.write(data);
    req.end();
  });
}
var rl = readline.createInterface({ input: process.stdin, terminal: false });
rl.on("line", async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let msg;
  try {
    msg = JSON.parse(trimmed);
  } catch (e) {
    process.stderr.write(`[toolroute-mcp] parse error: ${e.message}
`);
    return;
  }
  try {
    const result = await post(msg);
    process.stdout.write(JSON.stringify(result) + "\n");
  } catch (e) {
    process.stderr.write(`[toolroute-mcp] request error: ${e.message}
`);
    process.stdout.write(JSON.stringify({
      jsonrpc: "2.0",
      id: msg?.id ?? null,
      error: { code: -32e3, message: e.message }
    }) + "\n");
  }
});
rl.on("close", () => process.exit(0));
process.stderr.write("[toolroute-mcp] ready \u2192 https://toolroute.io/api/mcp\n");
