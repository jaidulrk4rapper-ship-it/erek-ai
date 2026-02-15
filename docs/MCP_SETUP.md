# MCP Servers — Project setup (Cursor / Claude)

## Kya hai?

Is project mein **project-level** MCP config hai: `.cursor/mcp.json`.  
Jab tum is project ko Cursor (ya Claude Code) mein khologe, ye MCP servers automatically **run** honge — Cursor inhe start karega.

## Configured servers

| Server        | Use case                          |
|---------------|-----------------------------------|
| **fetch**     | URLs fetch karna, docs / web read |
| **filesystem**| Project files read (workspace scoped) |

## Kaise chalate hain?

1. **Cursor:** Project open karo → Cursor MCP ko reload/restart karo (Settings > MCP ya Cursor restart).
2. **Claude Code / Claude Desktop:** Agar tum `mcp.json` use karte ho (e.g. `~/.cursor/mcp.json` ya project copy), wahan same structure use karo; Claude wale client ko restart karo.

**Project-only:** Ye config sirf is repo ke andar hai (`.cursor/mcp.json`). Baaki projects pe nahi chalegi.

## Naya server add karna

`.cursor/mcp.json` mein `mcpServers` ke andar naya entry add karo:

```json
"server-name": {
  "command": "npx",
  "args": ["-y", "package-name"]
}
```

Remote (HTTP/SSE) server ke liye:

```json
"remote-name": {
  "url": "https://your-mcp-endpoint.com/sse"
}
```

Save karo, phir Cursor/Claude restart ya MCP refresh karo.

## Requirements

- **Node.js 18+** (taaki `npx` chal sake)
- Cursor ya Claude client jisme MCP support ho

## Security

- MCP servers ko project/data access hota hai. Sirf trusted packages use karo.
- API keys chahiye hon to `env` mein pass karo; repo mein commit mat karo.
