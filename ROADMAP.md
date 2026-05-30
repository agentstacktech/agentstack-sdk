# AgentStack SDK roadmap

> **Informal / may lag code.** Shipped truth: `sdk.getModuleCatalog()` · releases: [CHANGELOG.md](CHANGELOG.md). Archived meta: [docs/archive/README.md](docs/archive/README.md).

**Status:** Platform line **0.4.13** (aligned with `AGENTSTACK_CORE_VERSION`)

## Shipped (use `getModuleCatalog()` for truth)

- Core HTTP client, auth, protocol, platform facade
- Commerce (`sdk.commerce` + subpaths), economy, finance, support, integrations
- Hosting (`quickStart`), storage, messenger/social, capability tasks
- UAM zod (`@agentstack/sdk/manifest`), logic blueprints
- Self-description: `getModuleCatalog()`, `getCapabilityMatrix()`
- `@agentstack/react` Query hooks
- **Docs i18n:** EN canonical + `*_ru.md`, `check:docs-i18n:all`, [docs/DOC_SYNC_MATRIX.md](docs/DOC_SYNC_MATRIX.md)

## In progress (this publish wave)

- Public mirror: https://github.com/agentstacktech/agentstack-sdk
- OpenAPI ↔ SDK drift CI (full)

## Next

- Client `previewComposeHints()` (optional, ADR scoped)
- PyPI `agentstack-sdk` GA
- `@agentstack/sdk-minimal` (RFC C backlog)

See [docs/AGENT_PROTOCOL_ENGINEERING_BACKLOG.md](../docs/AGENT_PROTOCOL_ENGINEERING_BACKLOG.md).
