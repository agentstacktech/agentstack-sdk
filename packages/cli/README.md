# @agentstack/cli

**Genetic tag:** `repo.tooling.user_cli.gen1`  
**ADR:** [AGENTSTACK_USER_CLI.md](../../../docs/adr/AGENTSTACK_USER_CLI.md)

Product CLI for AgentStack developers and CI. Curated verbs use `@agentstack/sdk` REST; `discover` / `execute` / `generation` use `sdk.mcp.execute`.

## Install (verified today)

Clone the public SDK mirror and build the CLI workspace:

```bash
git clone https://github.com/agentstacktech/agentstack-sdk.git agentstack-sdk
cd agentstack-sdk && npm ci && npm run build -w @agentstack/cli
node packages/cli/dist/bin.js doctor --json
```

Optional global shim: `cd packages/cli && npm link` → `agentstack doctor --json`.

## After npm publish

```bash
npm i -g @agentstack/cli
npx @agentstack/cli doctor --json
```

Not the same as monorepo `platform_tooling.py` (ops) or `docs_site.py` (tenant docs companion).

## Auth

```bash
agentstack auth login                  # Device Code (client_id=agentstack-cli)
agentstack auth login --api-key sk_…  # CI
agentstack auth use-project 42
agentstack doctor --json
```

Config: `$AGENTSTACK_HOME/config.json` or `~/.agentstack/config.json` (`%USERPROFILE%\.agentstack` on Windows).

## Docs

[CLI_QUICKSTART.md](../../../docs/CLI_QUICKSTART.md) · [SDK_INTEGRATION_FLOWS.md](../../docs/SDK_INTEGRATION_FLOWS.md)
