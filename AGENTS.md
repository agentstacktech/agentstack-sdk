# AgentStack SDK — guide for AI agents

**Genetic tag:** `repo.platform.sdk.ai_surface.gen1`  
**RU:** [AGENTS_ru.md](AGENTS_ru.md) · **Doc hub:** [docs/DOC_HUB.md](docs/DOC_HUB.md)  
**North star:** fast, low-error construction of apps and sites on AgentStack via typed SDK + self-description.

---

## 60-second bootstrap

```typescript
import { AgentStackSDK, resolveAgentStackApiBase } from '@agentstack/sdk';

const sdk = new AgentStackSDK({ apiBase: resolveAgentStackApiBase() });

// 1) Discover surfaces (read before calling APIs)
const catalog = sdk.getModuleCatalog();
const matrix = sdk.getCapabilityMatrix();

// 2) Auth
await sdk.platform.auth.login({
  email: process.env.AGENTSTACK_EMAIL!,
  password: process.env.AGENTSTACK_PASSWORD!,
});

// 3) First REST call
const projects = await sdk.platform.api.getProjects();

// Project scope (X-Project-ID) — set projectId in config, after login, or updateProjectId:
sdk.updateProjectId(42);
```

**Project context:** [docs/PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md) · `sdk.getProjectId()` · `assertProjectIdConfigured(sdk)`  
**How to install SDK (npm / submodule / monorepo):** [docs/SDK_INTEGRATION_FLOWS.md](docs/SDK_INTEGRATION_FLOWS.md) · RU: [SDK_INTEGRATION_FLOWS_ru.md](docs/SDK_INTEGRATION_FLOWS_ru.md)

**Production API base:** `https://agentstack.tech/api` (default via `resolveAgentStackApiBase()`).  
**Local Core:** `AGENTSTACK_API_BASE=http://localhost:8000/api`  
**Vite apps:** `VITE_API_BASE_URL=https://agentstack.tech/api`

---

## Discover → validate → execute

| Step | API | When |
|------|-----|------|
| Discover | `sdk.getModuleCatalog()` | Pick module id, `accessPaths`, `aiHints`, `examples` |
| Gate | `sdk.getCapabilityMatrix()` | Skip disabled `domain` modules |
| Validate | `validateAppManifest()`, `assertIntegratorModule()`, `parseTaskManifest()` | Before writes |
| Execute | `sdk.platform.*`, `sdk.protocol.*` | REST + commands + snapshots |
| Deploy site | `sdk.hosting.quickStart()` | Static HTML hosting |

Full recipes: [docs/AI_APPLICATION_FACTORY.md](docs/AI_APPLICATION_FACTORY.md)

---

## Decision tree

- **CRUD / projects / users** → `sdk.platform.api` or `sdk.platform.dna`
- **DNA command bus** → `sdk.platform.protocol.executeCommand` (not raw `/commands` fetch)
- **Rules engine** → `sdk.platform.command` or `protocol.executeRulesCommand`
- **Cached read model** → `sdk.platform.protocol.readThroughSnapshot`
- **MCP automation** → `https://agentstack.tech/mcp` (`agentstack.execute`) — mirror of platform actions
- **Tenant apps** → never `sdk.admin` / `sdk.platform.adminData` ([docs/INTEGRATOR_SCOPE.md](docs/INTEGRATOR_SCOPE.md))

---

## Genetic routing (hot paths)

| Tag | Doc / code |
|-----|------------|
| `repo.platform.sdk.gen1` | [AI_INDEX.md](AI_INDEX.md) |
| `repo.platform.sdk.agent_protocol.gen1` | [../docs/AGENT_PROTOCOL_QUICKSTART.md](../docs/AGENT_PROTOCOL_QUICKSTART.md) |
| `repo.platform.sdk.ai_surface.gen1` | [../docs/SDK_AI_SURFACE.md](../docs/SDK_AI_SURFACE.md) |
| `repo.platform.app_manifest.gen1` | `@agentstack/sdk/manifest` · `appManifestSchema` |
| `sdk.capability_tasks.gen1` | `@agentstack/sdk/capability-tasks` |
| `sdk.hosting.gen2` | `sdk.hosting.quickStart` |
| `sdk.commerce.facade.gen1` | `sdk.commerce` · `@agentstack/sdk/commerce/*` |

---

## Anti-patterns

- Do not use `fetch('/api/...')` when `sdk.platform` or `sdk.protocol` exists.
- Do not treat `sdk.protocol.searchSnapshots` as server full-text search (cache scan only).
- Do not call `sdk.projects.get(uuid)` — `projects` is **8DNA** `DNATableWrapper`; use `sdk.platform.api.getProject(id)`.
- Do not use `sdk.admin` or `sdk.platform.adminData` in tenant integrations (`sdkAudience` defaults to `integrator`).
- Check `getCapabilityMatrix()` before calling optional domains (`payments`, `gameData`, …).

---

## Links

- Swagger: https://agentstack.tech/swagger  
- MCP: https://agentstack.tech/mcp  
- Module catalog: [docs/SDK_MODULE_CATALOG.md](docs/SDK_MODULE_CATALOG.md)  
- Integrator scope (no admin): [docs/INTEGRATOR_SCOPE.md](docs/INTEGRATOR_SCOPE.md)  
- Submodule vendor: [docs/SUBMODULE_CONSUMER.md](docs/SUBMODULE_CONSUMER.md)  
- Integrator guide: [docs/AI_INTEGRATOR_GUIDE.md](docs/AI_INTEGRATOR_GUIDE.md)  
- Errors: [docs/AI_ERROR_ACTION_MATRIX.md](docs/AI_ERROR_ACTION_MATRIX.md)
