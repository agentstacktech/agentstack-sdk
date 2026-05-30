# AgentStack SDK

[![npm version](https://img.shields.io/npm/v/@agentstack/sdk.svg)](https://www.npmjs.com/package/@agentstack/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Languages:** **English** (this file, canonical) · [Русский extended narrative](README.md)

Universal TypeScript/JavaScript SDK for AgentStack — auth, projects, DNA, protocol, commerce, messenger, and AI discovery.

**Hub:** [docs/DOC_HUB.md](docs/DOC_HUB.md) · **i18n:** [docs/DOCS_I18N.md](docs/DOCS_I18N.md) · **Terms:** [docs/GLOSSARY.md](docs/GLOSSARY.md)

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

Deep dive: [docs/quick-start.md](docs/quick-start.md)

---

## How to install (flows A–H)

| Flow | When | Doc |
|------|------|-----|
| **A — npm** | Production apps (default) | `npm install @agentstack/sdk` |
| **B — git submodule** | Pin SDK commit in git | [docs/SUBMODULE_CONSUMER.md](docs/SUBMODULE_CONSUMER.md) |
| **C — mirror** | GitHub `agentstack-sdk` | Same as B |
| **D — monorepo** | Inside [AgentStack](https://github.com/agentstacktech/AgentStack) | `file:../agentstack-unified-sdk/packages/core` |
| **E — link / file:** | SDK development | [PUBLISHING.md](PUBLISHING.md) |
| **F — Python** | Python backends | `pip install agentstack-sdk` |
| **G — hosted widget** | Embeds | [docs/AI_APPLICATION_FACTORY.md](docs/AI_APPLICATION_FACTORY.md) |
| **H — AI agent** | Cursor / codegen | [AGENTS.md](AGENTS.md) |

Full map: [docs/SDK_INTEGRATION_FLOWS.md](docs/SDK_INTEGRATION_FLOWS.md)

### Submodule one-liner

```bash
git submodule add https://github.com/agentstacktech/agentstack-sdk.git vendor/agentstack-sdk
node vendor/agentstack-sdk/scripts/bootstrap-submodule-consumer.mjs --target . --tag v0.4.13
```

Monorepo runbook: [docs/sdk/SDK_SUBMODULE_INTEGRATION.md](../docs/sdk/SDK_SUBMODULE_INTEGRATION.md) (in AgentStack repo).

---

## Reference — production API

| Surface | URL |
|---------|-----|
| REST | `https://agentstack.tech/api` |
| OpenAPI | https://agentstack.tech/swagger |
| MCP | https://agentstack.tech/mcp |

Local Core: `AGENTSTACK_API_BASE=http://localhost:8000/api`  
Vite: `VITE_API_BASE_URL=https://agentstack.tech/api`

---

## Integrator vs platform operator

| Audience | SDK config | Admin |
|----------|------------|-------|
| **Integrator** (default npm) | `sdkAudience: 'integrator'` (default) | No `sdk.admin` |
| **Platform operator** | Monorepo `shared/sdk-client.ts` | `sdk.admin`, `/api/admin/*` |

See [docs/INTEGRATOR_SCOPE.md](docs/INTEGRATOR_SCOPE.md) and [docs/PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md) for `projectId` / `X-Project-ID`.

---

## Explanation — architecture pointers

| Topic | Doc |
|-------|-----|
| Package layers | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| `Agent*` modules | [docs/MODULAR_ARCHITECTURE.md](docs/MODULAR_ARCHITECTURE.md) |
| Protein / protocol | [docs/PROTEIN_SYSTEM_GUIDE.md](docs/PROTEIN_SYSTEM_GUIDE.md) |
| AI platform map | [docs/SDK_AI_SURFACE.md](../docs/SDK_AI_SURFACE.md) (monorepo) |
| Module discovery | [docs/SDK_MODULE_CATALOG.md](docs/SDK_MODULE_CATALOG.md) |

---

## AI agents

| Doc | Purpose |
|-----|---------|
| [AGENTS.md](AGENTS.md) | 60s bootstrap, decision tree |
| [docs/AI_INTEGRATOR_GUIDE.md](docs/AI_INTEGRATOR_GUIDE.md) | Patterns |
| [docs/AI_APPLICATION_FACTORY.md](docs/AI_APPLICATION_FACTORY.md) | Deploy recipes R1–R6 |
| [docs/AI_ERROR_ACTION_MATRIX.md](docs/AI_ERROR_ACTION_MATRIX.md) | Errors → actions |
| [llms.txt](llms.txt) | Curated EN paths for LLMs |

Discover before calling: `sdk.getModuleCatalog()` → `sdk.getCapabilityMatrix()` → execute via `sdk.platform.*`.

---

## React (`@agentstack/react`)

```tsx
import { SDKProvider, useSDK, useSDKQuery } from '@agentstack/react';

function App() {
  return (
    <SDKProvider
      config={{
        apiBase: 'https://agentstack.tech/api',
        apiKey: process.env.AGENTSTACK_API_KEY,
        projectId: Number(process.env.AGENTSTACK_PROJECT_ID),
      }}
    >
      <Routes />
    </SDKProvider>
  );
}
```

[docs/REACT_QUERY_INTEGRATION.md](docs/REACT_QUERY_INTEGRATION.md) · [docs/AI_REACT_SCAFFOLD.md](docs/AI_REACT_SCAFFOLD.md)

Admin React hooks are **operator-only** — see [examples/typescript/operator-admin-usage.ts](examples/typescript/operator-admin-usage.ts).

---

## Packages

| Package | npm readme | RU narrative |
|---------|------------|--------------|
| `@agentstack/sdk` | [packages/core/README.en.md](packages/core/README.en.md) | [packages/core/README.md](packages/core/README.md) |
| `@agentstack/react` | [packages/react/README.en.md](packages/react/README.en.md) | [packages/react/README.md](packages/react/README.md) |
| `@agentstack/hooks` | [packages/hooks/README.en.md](packages/hooks/README.en.md) | [packages/hooks/README.md](packages/hooks/README.md) |
| Python | [packages/python/README.en.md](packages/python/README.en.md) | [packages/python/README.md](packages/python/README.md) |

---

## Key integrator docs (P0)

| English | Russian |
|---------|---------|
| [SDK_INTEGRATION_FLOWS.md](docs/SDK_INTEGRATION_FLOWS.md) | [SDK_INTEGRATION_FLOWS_ru.md](docs/SDK_INTEGRATION_FLOWS_ru.md) |
| [INTEGRATOR_SCOPE.md](docs/INTEGRATOR_SCOPE.md) | [INTEGRATOR_SCOPE_ru.md](docs/INTEGRATOR_SCOPE_ru.md) |
| [PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md) | [PROJECT_CONTEXT_ru.md](docs/PROJECT_CONTEXT_ru.md) |
| [SUBMODULE_CONSUMER.md](docs/SUBMODULE_CONSUMER.md) | [SUBMODULE_CONSUMER_ru.md](docs/SUBMODULE_CONSUMER_ru.md) |

---

## Examples

```bash
cd examples/typescript && npm install && npm test
cd examples/ai && npm install
```

- [examples/typescript/](examples/typescript/)
- [examples/ai/](examples/ai/) — AI bootstrap scripts

---

## Publishing & mirror

| Topic | Doc |
|-------|-----|
| npm release | [PUBLISHING.md](PUBLISHING.md) |
| GitHub mirror | https://github.com/agentstacktech/agentstack-sdk |
| Mirror runbook | [docs/sdk/SDK_MIRROR_PUBLISH_RUNBOOK.md](../docs/sdk/SDK_MIRROR_PUBLISH_RUNBOOK.md) |

---

## Contributing & security

[CONTRIBUTING.md](CONTRIBUTING.md) · [SECURITY.md](SECURITY.md) · [CHANGELOG.md](CHANGELOG.md)

Doc maintenance: `npm run generate:docs-i18n` · `npm run check:docs-i18n:all`

---

## Links

- Platform monorepo: https://github.com/agentstacktech/AgentStack
- Published SDK: https://github.com/agentstacktech/agentstack-sdk
- Site: https://agentstack.tech

**Russian extended README** (historical long-form): [README.md](README.md) — API truth follows this English file and [docs/DOC_HUB.md](docs/DOC_HUB.md).
