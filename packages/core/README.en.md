# AgentStack Core SDK (`@agentstack/sdk`)

**Languages:** **English** (this file) · [Русский](README.md)

TypeScript client for AgentStack — modular API, protocol, DNA, commerce, and AI discovery.

**Install paths:** [../../docs/SDK_INTEGRATION_FLOWS.md](../../docs/SDK_INTEGRATION_FLOWS.md) · RU: [SDK_INTEGRATION_FLOWS_ru.md](../../docs/SDK_INTEGRATION_FLOWS_ru.md)

## Install

```bash
npm install @agentstack/sdk
```

## Quick start

```typescript
import { AgentStackSDK, resolveAgentStackApiBase } from '@agentstack/sdk';

const sdk = new AgentStackSDK({
  apiBase: resolveAgentStackApiBase(),
  apiKey: process.env.AGENTSTACK_API_KEY,
  projectId: 1,
});

await sdk.platform.auth.login({
  email: 'user@example.com',
  password: 'password',
});

const projects = await sdk.platform.api.getProjects();
const catalog = sdk.getModuleCatalog();
```

## Docs

| Doc | Topic |
|-----|--------|
| [AGENTS.md](../../AGENTS.md) | AI bootstrap |
| [INTEGRATOR_SCOPE.md](../../docs/INTEGRATOR_SCOPE.md) | No admin for tenants |
| [PROJECT_CONTEXT.md](../../docs/PROJECT_CONTEXT.md) | `projectId` |
| [DOC_HUB.md](../../docs/DOC_HUB.md) | Full index |

Production API: `https://agentstack.tech/api` · local: `AGENTSTACK_API_BASE=http://localhost:8000/api`

Legacy long Russian reference: [README.md](README.md).
