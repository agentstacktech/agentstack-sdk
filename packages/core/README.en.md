# AgentStack Core SDK (`@agentstack/sdk`)

**Languages:** **English** (npm readme) · [Русский](README.md)

TypeScript client for AgentStack — modular API, AgentProtocol, DNA, commerce, economy, and AI discovery.

**Install paths:** [docs/SDK_INTEGRATION_FLOWS.md](../../docs/SDK_INTEGRATION_FLOWS.md) · **Hub:** [docs/DOC_HUB.md](../../docs/DOC_HUB.md)

---

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
  project_id: 1,
});

const projects = await sdk.platform.api.getProjects();
const catalog = sdk.getModuleCatalog();
const matrix = sdk.getCapabilityMatrix();
```

---

## Module index (integrator)

| Surface | Typical use |
|---------|-------------|
| `sdk.platform.auth` | Login, tokens, profile |
| `sdk.platform.api` | Projects, tenant users |
| `sdk.platform.dna` | 8DNA tables |
| `sdk.platform.protocol` | Commands + snapshots (**preferred**) |
| `sdk.platform.social` | Messenger REST |
| `sdk.platform.economy` | AGNT / compute credits |
| `sdk.commerce` | Shop, cart, checkout |
| `sdk.support` | Support inbox |
| `sdk.integrations` | Webhooks, recipes |
| `sdk.storage` | Project storage API |
| `sdk.getModuleCatalog()` | AI / IDE discovery |
| `sdk.admin` | **Blocked** for npm integrators |

Full module guide: [docs/MODULAR_ARCHITECTURE.md](../../docs/MODULAR_ARCHITECTURE.md)  
Platform map: [docs/SDK_AI_SURFACE.md](../../../docs/SDK_AI_SURFACE.md) (monorepo)

---

## Subpath exports

```typescript
import { /* … */ } from '@agentstack/sdk/commerce/shop';
import { /* … */ } from '@agentstack/sdk/economy';
import { /* … */ } from '@agentstack/sdk/guidance';
import { /* … */ } from '@agentstack/sdk/capability-tasks';
```

See `package.json` `exports` and [AI_INDEX.md](../../AI_INDEX.md).

---

## Scope & project context

- [docs/INTEGRATOR_SCOPE.md](../../docs/INTEGRATOR_SCOPE.md) — no admin for tenants  
- [docs/PROJECT_CONTEXT.md](../../docs/PROJECT_CONTEXT.md) — `projectId`, headers  
- [docs/PROTEIN_SYSTEM_GUIDE.md](../../docs/PROTEIN_SYSTEM_GUIDE.md) — protocol-first commands

---

## Production API

`https://agentstack.tech/api` (default via `resolveAgentStackApiBase()`)

Local: `AGENTSTACK_API_BASE=http://localhost:8000/api`

---

## Docs for AI

[AGENTS.md](../../AGENTS.md) · [docs/GLOSSARY.md](../../docs/GLOSSARY.md) · [llms.txt](../../llms.txt)

Legacy long Russian reference: [README.md](README.md).
