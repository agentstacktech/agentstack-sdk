# AI integrator guide — AgentStack SDK

**Genetic tags:** `repo.platform.sdk.gen1` · `repo.platform.sdk.ai_surface.gen1` · `repo.platform.sdk.agent_protocol.gen1`

---

## 1. Install and environment

```bash
npm install @agentstack/sdk @agentstack/react
```

| Environment | `AGENTSTACK_API_BASE` |
|-------------|------------------------|
| Production (default) | unset → `https://agentstack.tech/api` |
| Local Core | `http://localhost:8000/api` |

```typescript
import { AgentStackSDK, resolveAgentStackApiBase } from '@agentstack/sdk';
const sdk = new AgentStackSDK({ apiBase: resolveAgentStackApiBase() });
```

---

## 2. Self-description (call first)

```typescript
const catalog = sdk.getModuleCatalog();
const matrix = sdk.getCapabilityMatrix();
```

See [SDK_MODULE_CATALOG.md](SDK_MODULE_CATALOG.md).

**Integrator scope:** default `sdkAudience` is `integrator` — `admin` / `adminData` are **not** in the catalog and `sdk.admin` throws. Use project APIs only. Full policy: [INTEGRATOR_SCOPE.md](INTEGRATOR_SCOPE.md).

```typescript
import { assertIntegratorModule } from '@agentstack/sdk';
assertIntegratorModule(sdk, 'payments'); // ok
// assertIntegratorModule(sdk, 'admin'); // throws for integrators
```

---

## 3. AgentProtocol patterns

Use `sdk.platform.protocol` — full spec: [../../docs/AGENT_PROTOCOL_QUICKSTART.md](../../docs/AGENT_PROTOCOL_QUICKSTART.md).

- `readThroughSnapshot`
- `executeCommand` + `invalidateSnapshotPrefix`
- `executeCommandsBatch`
- `dnaList` / `dnaGet`

---

## 4. Commerce, economy, support, integrations

| Domain | Entry |
|--------|--------|
| Commerce | `sdk.commerce` · `@agentstack/sdk/commerce/*` |
| Economy | `sdk.platform.economy` · [../../docs/sdk/AGENTNET_ECONOMY_INTEGRATOR_COOKBOOK.md](../../docs/sdk/AGENTNET_ECONOMY_INTEGRATOR_COOKBOOK.md) |
| Support | `sdk.support` / `sdk.platform.support` |
| Integrations | `sdk.integrations` |

---

## 5. Messenger (high level)

Prefer `sdk.platform.social` or `sdk.createMessengerEmbed()`. UI package: `agentstack-messenger` (monorepo). Gene: `sdk.messenger.gen1`.

---

## 6. Media offload

`sdk.media.*` — optional peers (`@jsquash/*`, `photoswipe`). Gene: `sdk.media.gen1`, `repo.engineering.client_side_computation.gen1`.

---

## 7. OpTrace and errors

Import `getOrCreateCorrelationIds` from `@agentstack/sdk` — see [../../docs/OPTRACE_FOR_AGENTS.md](../../docs/OPTRACE_FOR_AGENTS.md).

Error actions: [AI_ERROR_ACTION_MATRIX.md](AI_ERROR_ACTION_MATRIX.md).

---

## 8. MCP / REST parity

[../../docs/ecosystem/REST_MCP_SDK_PARITY.md](../../docs/ecosystem/REST_MCP_SDK_PARITY.md)

---

## 9. Application factory recipes

[AI_APPLICATION_FACTORY.md](AI_APPLICATION_FACTORY.md)

---

## 10. Python parity

[../../docs/ecosystem/PYTHON_SDK_PARITY.md](../../docs/ecosystem/PYTHON_SDK_PARITY.md) — stubs documented; prefer TypeScript SDK for AI agents today.
