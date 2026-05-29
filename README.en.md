# AgentStack SDK

[![npm version](https://img.shields.io/npm/v/@agentstack/sdk.svg)](https://www.npmjs.com/package/@agentstack/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Languages:** **English** (this file) · [Русский](README.md)

Universal TypeScript/JavaScript SDK for the AgentStack ecosystem — auth, projects, payments, DNA, protocol, and AI discovery.

**Documentation hub:** [docs/DOC_HUB.md](docs/DOC_HUB.md) · **i18n policy:** [docs/DOCS_I18N.md](docs/DOCS_I18N.md)

---

## Quick start

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
```

---

## How to add the SDK

| Flow | When | Install |
|------|------|---------|
| **A — npm** | Production apps (default) | `npm install @agentstack/sdk` |
| **B — git submodule** | Pin SDK commit in git | [docs/SUBMODULE_CONSUMER.md](docs/SUBMODULE_CONSUMER.md) |
| **D — monorepo** | Inside [AgentStack](https://github.com/agentstacktech/AgentStack) | `file:../agentstack-unified-sdk/packages/core` |
| **E — link / file:** | SDK development | [PUBLISHING.md](PUBLISHING.md) |
| **G — Python** | Python backends | `pip install agentstack-sdk` |

Full map: **[docs/SDK_INTEGRATION_FLOWS.md](docs/SDK_INTEGRATION_FLOWS.md)** · RU: [SDK_INTEGRATION_FLOWS_ru.md](docs/SDK_INTEGRATION_FLOWS_ru.md)

### Submodule in one minute

```bash
git submodule add https://github.com/agentstacktech/agentstack-sdk.git vendor/agentstack-sdk
node vendor/agentstack-sdk/scripts/bootstrap-submodule-consumer.mjs --target . --tag v0.4.13
```

---

## Key docs (English canonical)

| Doc | Topic |
|-----|--------|
| [AGENTS.md](AGENTS.md) | AI agents — bootstrap |
| [docs/quick-start.md](docs/quick-start.md) | Env vars, first calls |
| [docs/INTEGRATOR_SCOPE.md](docs/INTEGRATOR_SCOPE.md) | Tenant vs platform operator |
| [docs/PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md) | `projectId` / `X-Project-ID` |
| [docs/AI_INTEGRATOR_GUIDE.md](docs/AI_INTEGRATOR_GUIDE.md) | Integrator patterns |

---

## Production API

| Surface | URL |
|---------|-----|
| REST | `https://agentstack.tech/api` |
| OpenAPI | https://agentstack.tech/swagger |
| MCP | https://agentstack.tech/mcp |

Set `AGENTSTACK_API_BASE` only for local Core (`http://localhost:8000/api`).

---

## React (integrator-safe)

```tsx
import { SDKProvider, useSDK } from '@agentstack/react';

function App() {
  return (
    <SDKProvider
      config={{
        apiBase: 'https://agentstack.tech/api',
        apiKey: process.env.AGENTSTACK_API_KEY,
        projectId: Number(process.env.AGENTSTACK_PROJECT_ID),
      }}
    >
      <YourRoutes />
    </SDKProvider>
  );
}
```

See [docs/REACT_QUERY_INTEGRATION.md](docs/REACT_QUERY_INTEGRATION.md). Admin hooks require `sdkAudience: 'platform_operator'` (monorepo only).

---

## Links

- [Changelog](CHANGELOG.md) · [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md)
- Mirror: https://github.com/agentstacktech/agentstack-sdk
- Platform: https://github.com/agentstacktech/AgentStack

Legacy long-form Russian narrative: [README.md](README.md).
