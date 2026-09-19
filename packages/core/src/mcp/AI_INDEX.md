# MCP helpers — AI index
**Genetic tag:** `repo.tooling.user_cli.gen1` (shared with `@agentstack/cli`)

| File | Role |
|------|------|
| [execute.ts](execute.ts) | JSON-RPC `tools/call` `agentstack.execute` + busy retry |
| [urls.ts](urls.ts) | `resolveMcpUrl` / `resolveMcpAuthToken` |
| [deviceCode.ts](deviceCode.ts) | urlencoded Device Code poller |
| [discover.ts](discover.ts) | REST `discoverByIntent` (typed) / `getDiscovery` |
| [guidance.ts](guidance.ts) | `fetchMcpAiPrompt`, `recommendedDiscoveryLadder` (7-step ladder SoT mirror — CI: `sync-sdk-mcp-guidance.mjs`) |
| [discover.ts](discover.ts) | `McpInstructionSlice.effect` optional — parity with catalog / `discover/by_intent` |
| [index.ts](index.ts) | `AgentMcp` → `sdk.mcp` · subpath `@agentstack/sdk/mcp` |

Sideways: recipe `genetic-ai-starter/.../03-mcp-execute`, docs_site Python client (legacy).
