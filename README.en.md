# AgentStack SDK

[![npm version](https://img.shields.io/npm/v/@agentstack/sdk.svg)](https://www.npmjs.com/package/@agentstack/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Languages:** **English** (this file, canonical) · [Русский extended narrative](README.md)

Universal TypeScript/JavaScript SDK for the AgentStack ecosystem — modular API, Neural Architecture, protocol command bus, commerce, and AI discovery.

**Hub:** [docs/DOC_HUB.md](docs/DOC_HUB.md) · **i18n:** [docs/DOCS_I18N.md](docs/DOCS_I18N.md) · **Style audit:** [docs/DOC_STYLE_GAP.md](docs/DOC_STYLE_GAP.md)

---

## Tutorial — first call (15 min)

```bash
npm install @agentstack/sdk
```

```typescript
import { AgentStackSDK, resolveAgentStackApiBase } from '@agentstack/sdk';

const sdk = new AgentStackSDK({
  apiBase: resolveAgentStackApiBase(),
  apiKey: process.env.AGENTSTACK_API_KEY,
  projectId: Number(process.env.AGENTSTACK_PROJECT_ID),
});

await sdk.platform.auth.login({
  email: process.env.AGENTSTACK_EMAIL!,
  password: process.env.AGENTSTACK_PASSWORD!,
});

const projects = await sdk.platform.api.getProjects();
const catalog = sdk.getModuleCatalog();
const matrix = sdk.getCapabilityMatrix();
```

Deep dive: [docs/quick-start.md](docs/quick-start.md) · AI: [AGENTS.md](AGENTS.md)

---

## Project goals

- **Consistency** — one SDK for platform APIs
- **Simplicity** — intuitive surfaces (`sdk.platform`, subpath exports)
- **Reliability** — retry, caching, structured errors
- **Performance** — neural client cache, snapshot reads
- **Extensibility** — new domains without breaking facades
- **Multilingual** — TypeScript, Python, React
- **AI-ready** — `getModuleCatalog()`, capability matrix, [llms.txt](llms.txt)
- **Project scope** — tenant RBAC, DNA, economy without ecosystem `/api/admin/*` ([INTEGRATOR_SCOPE](docs/INTEGRATOR_SCOPE.md))

---

## Repository layout

```
agentstack-unified-sdk/
├── packages/
│   ├── core/          # @agentstack/sdk
│   ├── react/         # @agentstack/react
│   ├── hooks/         # @agentstack/hooks
│   └── python/        # agentstack-sdk (pip)
├── docs/              # Integrator docs (EN + *_ru.md)
├── examples/
│   ├── typescript/
│   └── ai/
├── scripts/           # i18n, submodule, mirror
└── tests/
```

---

## Key features

### Core SDK

- Smart **HTTP client** (retries, auth headers, `X-Project-ID`)
- **Type-safe** TypeScript with subpath exports
- **Modular** `Agent*` domains + stable **`sdk.platform`** facade
- **Protocol bus** — `sdk.platform.protocol.executeCommand` + snapshots
- **Neural** client cache and events (optional)
- **Interceptors** for logging and correlation (OpTrace-friendly)

### SDK modules (integrator)

| Module | Role |
|--------|------|
| `sdk.platform.auth` | Login, tokens, profile |
| `sdk.platform.api` | Projects, tenant users |
| `sdk.platform.dna` | 8DNA tables |
| `sdk.platform.protocol` | Commands + snapshots (**preferred**) |
| `sdk.payments` | Payments |
| `sdk.analytics` | Events and dashboards |
| `sdk.webhooks` | Webhooks |
| `sdk.scheduler` | Scheduled tasks |
| `sdk.neural` | Client neural layer |
| `sdk.commerce` | Shop, cart, checkout |
| `sdk.i18n` | Zero-config translations |

**Platform operator only:** `sdk.admin`, `/api/admin/*` — not in default npm catalog. See [docs/INTEGRATOR_SCOPE.md](docs/INTEGRATOR_SCOPE.md).

### Neural Architecture (client)

- Neural cache get/set with TTL
- Event emit for diagnostics
- Pattern helpers (where enabled)

### React integration

- `SDKProvider` + `useSDK()` ([docs/REACT_QUERY_INTEGRATION.md](docs/REACT_QUERY_INTEGRATION.md))
- React Query hooks (`useSDKQuery`, mutations)
- Admin hooks — **monorepo `platform_operator` only**

---

## How to install (flows A–H)

| Flow | When | Install |
|------|------|---------|
| **A — npm** | Production (default) | `npm install @agentstack/sdk` |
| **B — git submodule** | Pin SDK commit | [docs/SUBMODULE_CONSUMER.md](docs/SUBMODULE_CONSUMER.md) |
| **C — mirror** | GitHub `agentstack-sdk` | Same as B |
| **D — monorepo** | Inside [AgentStack](https://github.com/agentstacktech/AgentStack) | `file:../agentstack-unified-sdk/packages/core` |
| **E — link / file:** | SDK development | [PUBLISHING.md](PUBLISHING.md) |
| **F — Python** | Python backends | `pip install agentstack-sdk` |
| **G — hosted widget** | Embeds | [docs/AI_APPLICATION_FACTORY.md](docs/AI_APPLICATION_FACTORY.md) |
| **H — AI agent** | Cursor / codegen | [AGENTS.md](AGENTS.md) |

Full tree: [docs/SDK_INTEGRATION_FLOWS.md](docs/SDK_INTEGRATION_FLOWS.md)

```bash
git submodule add https://github.com/agentstacktech/agentstack-sdk.git vendor/agentstack-sdk
node vendor/agentstack-sdk/scripts/bootstrap-submodule-consumer.mjs --target . --tag v0.4.13
```

---

## Quick start by runtime

### TypeScript / Node

```typescript
import { AgentStackSDK, resolveAgentStackApiBase } from '@agentstack/sdk';

const sdk = new AgentStackSDK({
  apiBase: resolveAgentStackApiBase(),
  apiKey: process.env.AGENTSTACK_API_KEY,
  projectId: 1,
});

await sdk.platform.auth.login({ email, password, project_id: 1 });
const projects = await sdk.platform.api.getProjects();

await sdk.platform.protocol.executeCommand({
  command: 'your.command',
  project_id: 1,
  payload: {},
});

await sdk.neural.cache.set('session:1', { ok: true }, 300);
const help = await sdk.docs.getHelp('auth');
```

### Python

```python
from agentstack_sdk import AgentStackSDK, SDKConfig

sdk = AgentStackSDK(SDKConfig(api_base="https://agentstack.tech/api", api_key="key"))
await sdk.auth.login("user@example.com", "password")
projects = await sdk.platform.api.get_projects()
```

### React

```tsx
import { SDKProvider, useSDK, useSDKQuery } from '@agentstack/react';

function App() {
  return (
    <SDKProvider
      config={{
        apiBase: 'https://agentstack.tech/api',
        apiKey: import.meta.env.VITE_AGENTSTACK_API_KEY,
        projectId: 1,
      }}
    >
      <ProjectList />
    </SDKProvider>
  );
}

function ProjectList() {
  const { data } = useSDKQuery({
    queryKey: ['projects'],
    queryFn: (sdk) => sdk.platform.api.getProjects(),
  });
  return <ul>{(data ?? []).map((p) => <li key={p.id}>{p.name}</li>)}</ul>;
}
```

---

## API reference (overview)

### Auth (`sdk.platform.auth`)

```typescript
const tokens = await sdk.platform.auth.login({
  email: 'user@example.com',
  password: 'password',
  project_id: 1,
});
const profile = await sdk.platform.auth.getProfile();
await sdk.platform.auth.logout();
```

### Projects & users (`sdk.platform.api`)

```typescript
const projects = await sdk.platform.api.getProjects();
const project = await sdk.platform.api.getProject(1);
```

### DNA (`sdk.platform.dna`)

```typescript
const rows = await sdk.platform.dna.list('data_projects_8dna', { project_id: 1 });
```

### Protocol (preferred)

```typescript
await sdk.platform.protocol.executeCommand({
  command: 'get_page_data',
  project_id: 1,
  payload: { user_id: 123 },
});
await sdk.platform.protocol.invalidateSnapshotPrefix('projects');
```

### Payments

```typescript
const payment = await sdk.payments.createPayment({
  amount: 1000,
  currency: 'USD',
  description: 'Order',
  project_id: 1,
});
```

### Analytics

```typescript
await sdk.analytics.trackEvent({
  event_type: 'button_click',
  properties: { page: '/checkout' },
  project_id: 1,
});
```

Full module map: [docs/MODULAR_ARCHITECTURE.md](docs/MODULAR_ARCHITECTURE.md) · Protein: [docs/PROTEIN_SYSTEM_GUIDE.md](docs/PROTEIN_SYSTEM_GUIDE.md)

---

## Configuration

```typescript
const sdk = new AgentStackSDK({
  apiBase: resolveAgentStackApiBase(),
  apiKey: process.env.AGENTSTACK_API_KEY,
  projectId: 1,
  timeout: 30000,
  retry: { attempts: 3, delay: 1000, backoff: 'exponential' },
  neural: {
    cache: { enabled: true, ttl: 300, maxSize: 1000 },
    events: { enabled: true },
  },
  logging: { level: 'info', enabled: true },
});
```

---

## Environment variables

| Variable | Purpose |
|----------|---------|
| `AGENTSTACK_API_BASE` | Override API (`http://localhost:8000/api` local) |
| `AGENTSTACK_API_KEY` | API key |
| `AGENTSTACK_EMAIL` / `PASSWORD` | Bootstrap scripts |
| `AGENTSTACK_PROJECT_ID` | Default project |
| `VITE_AGENTSTACK_*` | Vite apps |

---

## Testing

```bash
cd agentstack-unified-sdk
npm install
npm run build
npm run test
npm run check:docs-i18n:all
```

---

## Examples

| Path | Description |
|------|-------------|
| [examples/typescript/](examples/typescript/) | Module samples |
| [examples/ai/](examples/ai/) | AI bootstrap |
| [examples/typescript/economy/](examples/typescript/economy/) | Economy / AGNT |

---

## Security

- Never commit API keys; use env vars
- Tenant apps: no `sdk.admin` — [INTEGRATOR_SCOPE](docs/INTEGRATOR_SCOPE.md)
- HTTPS production base: `https://agentstack.tech/api`

---

## Production API

| Surface | URL |
|---------|-----|
| REST | `https://agentstack.tech/api` |
| OpenAPI | https://agentstack.tech/swagger |
| MCP | https://agentstack.tech/mcp |

---

## Troubleshooting

| Issue | Action |
|-------|--------|
| 401 | Re-login; set `projectId` |
| 403 admin | Wrong audience — operator only in monorepo |
| Stale UI | Snapshot invalidation + React Query |
| Wrong host | Use `resolveAgentStackApiBase()` |

[docs/AI_ERROR_ACTION_MATRIX.md](docs/AI_ERROR_ACTION_MATRIX.md)

---

## Integrator vs operator

| Audience | Config | Admin |
|----------|--------|-------|
| Integrator (npm) | default | No |
| Platform operator | monorepo | `sdk.admin` |

---

## Publishing & mirror

[PUBLISHING.md](PUBLISHING.md) · Mirror: https://github.com/agentstacktech/agentstack-sdk · [docs/sdk/SDK_MIRROR_PUBLISH_RUNBOOK.md](../docs/sdk/SDK_MIRROR_PUBLISH_RUNBOOK.md)

---

## Contributing & support

[CONTRIBUTING.md](CONTRIBUTING.md) · [SECURITY.md](SECURITY.md) · [CHANGELOG.md](CHANGELOG.md)

- Issues: https://github.com/agentstacktech/agentstack-sdk/issues
- Swagger: https://agentstack.tech/swagger

Doc maintenance: `npm run generate:docs-i18n` · `npm run check:docs-i18n:all`

---

## Links

- Platform: https://github.com/agentstacktech/AgentStack
- Site: https://agentstack.tech

**Russian extended README** (historical narrative, same topics in depth): [README.md](README.md) — API truth follows **this file** and [docs/DOC_HUB.md](docs/DOC_HUB.md).
