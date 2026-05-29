# Integrator scope vs platform operator

**Genetic tag:** `repo.platform.sdk.integrator_scope.gen1`  
**Audience:** npm consumers (`@agentstack/sdk`), third-party agents, tenant-hosted apps.

AgentStack distinguishes two SDK audiences:

| Audience | `SDKConfig.sdkAudience` | Admin surfaces |
| -------- | ------------------------ | -------------- |
| **Tenant integrator** (default) | `integrator` or omitted | **Blocked** |
| **Ecosystem operator** | `platform_operator` | Allowed (monorepo SPA / ops only) |

Ecosystem admin (`/api/admin/*`, `sdk.admin`, `sdk.platform.adminData`, protocol `*AdminExecute`) is for **AgentStack operators** running the platform control plane—not for applications built on AgentStack by customers.

---

## What integrators should use instead

| Need | Use |
| ---- | --- |
| Project CRUD, members | `sdk.platform.api` |
| 8DNA tables | `sdk.platform.dna`, `sdk.platform.projects`, `sdk.platform.users` |
| Commands + snapshots | `sdk.platform.protocol` |
| Roles in a project | `sdk.platform.rbac` |
| AgentNet economy (tenant) | `sdk.platform.economy` → `/api/agentnet/{project_id}/*` |
| Agents in a project | `sdk.agentsFleet` |
| Support inbox | `sdk.support` |
| Social / messenger (tenant) | `sdk.platform.social`, `sdk.createMessengerEmbed()` |

Never call `/api/admin/*` from tenant code. The HTTP client rejects those paths when `sdkAudience` is `integrator`.

---

## Runtime guards (TypeScript)

1. **`sdk.admin`**, **`sdk.adminData`**, **`sdk.platform.adminData`** — throw `AgentStackError` for integrators.
2. **`HTTPClient.request`** — blocks paths containing `/admin/` for integrators (defense in depth).
3. **`sdk.platform.protocol.socialAdminExecute` / `agentsAdminExecute`** — operator-only.
4. **`getModuleCatalog()` / `getCapabilityMatrix()`** — omit `admin` and `adminData` for integrators so AI discovery does not suggest them.

Monorepo frontend sets `sdkAudience: 'platform_operator'` in `shared/sdk-client.ts`.

---

## API base URL

| Surface | Production |
| ------- | ---------- |
| REST | `https://agentstack.tech/api` |
| OpenAPI | `https://agentstack.tech/swagger` |
| MCP | `https://agentstack.tech/mcp` |

Do **not** use legacy hosts (`api.agentstack.com`, `api.agentstack.tech`, `docs.agentstack.com`). Node/scripts: `AGENTSTACK_API_BASE=https://agentstack.tech/api` or omit and call `resolveAgentStackApiBase()`.

## Configuration

```typescript
import { AgentStackSDK, resolveAgentStackApiBase } from '@agentstack/sdk';

// Default — tenant / npm integrator (no admin)
const appSdk = new AgentStackSDK({
  apiBase: resolveAgentStackApiBase(),
  projectId: 42,
});

// AgentStack monorepo ops shell only
const opsSdk = new AgentStackSDK({
  apiBase: resolveAgentStackApiBase(),
  projectId: 1,
  sdkAudience: 'platform_operator',
});
```

---

## Discovery for AI agents

After `sdk.getModuleCatalog()`, integrators will **not** see `admin` or `adminData` entries. If an agent still tries `sdk.admin`, the error message points here.

See also: [AGENTS.md](../AGENTS.md), [docs/SDK_AI_SURFACE.md](../../docs/SDK_AI_SURFACE.md) (monorepo).
