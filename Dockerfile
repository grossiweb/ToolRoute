# ToolRoute MCP Server — stdio bridge image
# Proxies JSON-RPC stdio ↔ https://toolroute.io/api/mcp
# No npm install needed — uses only Node.js built-ins.

FROM node:20-alpine

WORKDIR /app

COPY bridge.js .

CMD ["node", "bridge.js"]
