# AgentStack SDK roadmap

**Status:** Platform line **0.4.13** (aligned with `AGENTSTACK_CORE_VERSION`)

## Shipped (use `getModuleCatalog()` for truth)

- Core HTTP client, auth, protocol, platform facade
- Commerce (`sdk.commerce` + subpaths), economy, finance, support, integrations
- Hosting (`quickStart`), storage, messenger/social, capability tasks
- UAM zod (`@agentstack/sdk/manifest`), logic blueprints
- Self-description: `getModuleCatalog()`, `getCapabilityMatrix()`
- `@agentstack/react` Query hooks

## In progress (this publish wave)

- Public mirror: https://github.com/agentstacktech/agentstack-sdk
- AI docs: `AGENTS.md`, Application Factory recipes, CI doc guards

## Next

- OpenAPI ↔ SDK drift CI (full)
- Client `previewComposeHints()` (optional, ADR scoped)
- PyPI `agentstack-sdk` GA
- `@agentstack/sdk-minimal` (RFC C backlog)

See [docs/AGENT_PROTOCOL_ENGINEERING_BACKLOG.md](../docs/AGENT_PROTOCOL_ENGINEERING_BACKLOG.md).
