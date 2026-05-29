# Project context (`project_id`)

**Genetic tag:** `repo.platform.sdk.project_context.gen1`  
**RU:** [PROJECT_CONTEXT_ru.md](./PROJECT_CONTEXT_ru.md)

Almost every tenant API call is scoped to a **project**. The SDK carries that scope as **`projectId`** in config and as the **`X-Project-ID`** HTTP header.

---

## Where it is set

| Layer | How |
| ----- | --- |
| **Constructor** | `new AgentStackSDK({ projectId: 42, … })` |
| **After login** | Session `project_id` → `HTTPClient.updateConfig` (automatic in `AgentAuth.login`) |
| **Workspace switch** | `sdk.updateProjectId(42)` |
| **Browser SPA** | `localStorage` / `sessionStorage` keys: `project_id`, `ap_project_id`, `as_project_id` (read on HTTPClient init) |
| **Explicit header** | Per-request `headers: { 'X-Project-ID': '42' }` (overrides default when already set) |
| **URL / body** | Many routes embed project: `/api/projects/{id}/…`, `home_project_id`, DNA `project_id` query |

Read effective id: `sdk.getProjectId()` · guard: `sdk.requireProjectId()` · AI preflight: `assertProjectIdConfigured(sdk)`.

---

## HTTP behavior (`HTTPClient`)

1. **`/auth/login`** — header **`X-Project-ID: 1`** (ecosystem bootstrap). Optional body field `project_id` in `LoginCredentials` selects the target project for the session.
2. **Most other routes** — if caller did not set `X-Project-ID`, SDK sends **`String(config.projectId)`**.
3. **`/storage/*`** — if URL query contains `project_id=`, header aligns with that value (messenger / ecosystem listings).
4. **Path-scoped modules** — still pass project in path or method args, e.g. `sdk.platform.economy.ledger.getBalance(projectId, …)`, `sdk.agentsFleet.get(projectId, agentId)`.

---

## Recommended integrator flow

```typescript
import {
  AgentStackSDK,
  resolveAgentStackApiBase,
  assertProjectIdConfigured,
} from '@agentstack/sdk';

const sdk = new AgentStackSDK({
  apiBase: resolveAgentStackApiBase(),
  apiKey: process.env.AGENTSTACK_API_KEY,
  // Optional before login; often set after user picks a project:
  projectId: Number(process.env.AGENTSTACK_PROJECT_ID),
});

await sdk.platform.auth.login({
  email: process.env.AGENTSTACK_EMAIL!,
  password: process.env.AGENTSTACK_PASSWORD!,
  // Optional: target project for session (login header still uses ecosystem 1)
  project_id: Number(process.env.AGENTSTACK_PROJECT_ID),
});

// Ensure scope before economy / agents / storage:
const projectId = assertProjectIdConfigured(sdk);

const balance = await sdk.platform.economy.ledger.getBalance(projectId, {
  accountKey: '…',
});
```

### Multi-project apps

```typescript
const projects = await sdk.platform.api.getProjects();
const active = projects[0];
sdk.updateProjectId(active.id);
// React: remount queries keyed by projectId when workspace changes
```

---

## Messenger embed

`createMessengerEmbed()` reads the same scope from `httpClient.getConfig().projectId` → `ecosystemProjectId` in `MessengerClientConfig`.

---

## Platform operator note

Ecosystem admin (`sdkAudience: 'platform_operator'`, `project_id=1`) is separate — see [INTEGRATOR_SCOPE.md](./INTEGRATOR_SCOPE.md).

---

## Helpers (package exports)

- `normalizeProjectId(value)` — parse string/number
- `readProjectIdFromBrowserStorage()` — browser only
- `resolveEffectiveProjectId(configProjectId)` — config then storage
