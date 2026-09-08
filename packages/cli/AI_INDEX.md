# AgentStack User CLI — AI index

**Genetic tag:** `repo.tooling.user_cli.gen1`  
**ADR:** [docs/adr/AGENTSTACK_USER_CLI.md](../../docs/adr/AGENTSTACK_USER_CLI.md)  
**Package:** `@agentstack/cli` · bin `agentstack`

## Hot files

| Path | Role |
|------|------|
| [src/bin.ts](src/bin.ts) | argv entry |
| [src/runtime/createRuntime.ts](src/runtime/createRuntime.ts) | SDK + MCP + config composition |
| [src/runtime/configStore.ts](src/runtime/configStore.ts) | `AGENTSTACK_HOME` / `~/.agentstack` |
| [src/runtime/mcpAction.ts](src/runtime/mcpAction.ts) | One-shot MCP helper |
| [../core/src/mcp/discover.ts](../core/src/mcp/discover.ts) | REST discover (`discoverByIntent`, `getDiscovery`) |
| [src/commands/registry.ts](src/commands/registry.ts) | data-driven CommandSpec[] (`sdkPath` / `mcpAction`) |
| [src/commands/meta.ts](src/commands/meta.ts) | `help` / `completion` in ALL_COMMANDS |
| [src/commands/botsCrm.ts](src/commands/botsCrm.ts) | Thin `bots list` / `crm contacts` (SDK only) |
| [src/commands/completion.ts](src/commands/completion.ts) | Bash/zsh/PS generated from ALL_COMMANDS |
| [../core/src/mcp/deviceCode.ts](../core/src/mcp/deviceCode.ts) | urlencoded Device Code (SDK SoT) |
| [../core/src/mcp/execute.ts](../core/src/mcp/execute.ts) | shared `mcpExecute` JSON-RPC |

## Commands (curated)

`help` · `completion` · `auth` · `projects` · `data` · `keys` · `hosting` · `storage` · `rag` · `agents` · `bots` · `crm` · `discover` · `execute` · `generation` · `doctor` · `version`

## Sideways

- Parent SDK: [../AI_INDEX.md](../AI_INDEX.md) · [AGENTS.md](../../AGENTS.md)
- Ops contrast: `repo.tooling.platform_tooling.gen1` (not this package)
- Gaps: [USER_CLI_GAP_REGISTER.md](../../../docs/ecosystem/USER_CLI_GAP_REGISTER.md)
- Harden TODO: [USER_CLI_HARDEN_DECOMPOSITION.md](../../../docs/plans/USER_CLI_HARDEN_DECOMPOSITION.md)
- Quickstart: [CLI_QUICKSTART.md](../../../docs/CLI_QUICKSTART.md)
