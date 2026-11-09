# MCP helpers — AI index
**Genetic tag:** `repo.tooling.user_cli.gen1` (shared with `@agentstack/cli`)

| File | Role |
|------|------|
| [execute.ts](execute.ts) | JSON-RPC `tools/call` `agentstack.execute` + busy retry; optional `locale` / `context.locale` → `Accept-Language` + execute body context |
| [discover.ts](discover.ts) | `discoverByIntent`, `getDiscovery`, preflight/summary GETs — pass `locale` for instruction-plane projection |
| [urls.ts](urls.ts) | `resolveMcpUrl` / `resolveMcpAuthToken` |
| [deviceCode.ts](deviceCode.ts) | urlencoded Device Code poller |
| [guidance.ts](guidance.ts) | `fetchMcpAiPrompt`, `recommendedDiscoveryLadder` (7-step ladder SoT mirror — CI: `sync-sdk-mcp-guidance.mjs`) |
| [index.ts](index.ts) | `AgentMcp` → `sdk.mcp` · subpath `@agentstack/sdk/mcp` |

Sideways: recipe `genetic-ai-starter/.../03-mcp-execute`, docs_site Python client (legacy).
