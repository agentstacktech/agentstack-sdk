# AgentStack SDK documentation

User-facing docs for **`@agentstack/sdk`**. Production API base: **`https://agentstack.tech/api`**.

## Start here

| Doc | Purpose |
|-----|---------|
| [AGENTS.md](../AGENTS.md) | AI agents — 60s bootstrap |
| [quick-start.md](./quick-start.md) | Install, env vars, first calls |
| [INTEGRATOR_SCOPE.md](./INTEGRATOR_SCOPE.md) | Tenant vs platform operator (no `/api/admin` for integrators) |
| [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) | `projectId` / `X-Project-ID` — where scope is set |
| [AI_INTEGRATOR_GUIDE.md](./AI_INTEGRATOR_GUIDE.md) | Integrator patterns |
| [SDK_MODULE_CATALOG.md](./SDK_MODULE_CATALOG.md) | `getModuleCatalog()` index |
| [AI_APPLICATION_FACTORY.md](./AI_APPLICATION_FACTORY.md) | Discover → validate → deploy |

## Deep dives

| Doc | Purpose |
|-----|---------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Package layout |
| [MODULAR_ARCHITECTURE.md](./MODULAR_ARCHITECTURE.md) | Module overview |
| [PROTEIN_SYSTEM_GUIDE.md](./PROTEIN_SYSTEM_GUIDE.md) | Protein / commands |
| [REACT_QUERY_INTEGRATION.md](./REACT_QUERY_INTEGRATION.md) | `@agentstack/react` + TanStack Query |
| [AI_REACT_SCAFFOLD.md](./AI_REACT_SCAFFOLD.md) | React scaffold for agents |
| [AI_ERROR_ACTION_MATRIX.md](./AI_ERROR_ACTION_MATRIX.md) | Errors → actions |

## Platform (monorepo)

| Resource | URL |
|----------|-----|
| OpenAPI / Swagger | https://agentstack.tech/swagger |
| API docs (alt) | https://agentstack.tech/api-docs |
| MCP | https://agentstack.tech/mcp |
| Agent protocol | [AgentStack monorepo `docs/AGENT_PROTOCOL_QUICKSTART.md`](https://github.com/agentstacktech/AgentStack/blob/master/docs/AGENT_PROTOCOL_QUICKSTART.md) |
| SDK AI surface | [SDK_AI_SURFACE.md](https://github.com/agentstacktech/AgentStack/blob/master/docs/SDK_AI_SURFACE.md) |

## Examples

- TypeScript: [`../examples/typescript/`](../examples/typescript/)
- AI recipes: [`../examples/ai/`](../examples/ai/)
- Economy: [`../examples/typescript/economy/`](../examples/typescript/economy/)

## Support

- [agentstack.tech](https://agentstack.tech)
- [GitHub Issues](https://github.com/agentstacktech/agentstack-sdk/issues)
- [Security](../SECURITY.md)
