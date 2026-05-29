# Гид AI-интегратора — AgentStack SDK

**Genetic tags:** `repo.platform.sdk.gen1` · `repo.platform.sdk.ai_surface.gen1` · `repo.platform.sdk.agent_protocol.gen1`  
**EN:** [AI_INTEGRATOR_GUIDE.md](./AI_INTEGRATOR_GUIDE.md)

---

## 1. Установка и окружение

```bash
npm install @agentstack/sdk @agentstack/react
```

| Окружение | `AGENTSTACK_API_BASE` |
|-----------|------------------------|
| Production (по умолчанию) | omit → `https://agentstack.tech/api` |
| Локальный Core | `http://localhost:8000/api` |

```typescript
import { AgentStackSDK, resolveAgentStackApiBase } from '@agentstack/sdk';
const sdk = new AgentStackSDK({ apiBase: resolveAgentStackApiBase() });
```

Потоки установки: [SDK_INTEGRATION_FLOWS_ru.md](./SDK_INTEGRATION_FLOWS_ru.md).

---

## 2. Self-description (вызывать первым)

```typescript
const catalog = sdk.getModuleCatalog();
const matrix = sdk.getCapabilityMatrix();
```

См. [SDK_MODULE_CATALOG.md](./SDK_MODULE_CATALOG.md) (EN).

**Scope проекта:** [PROJECT_CONTEXT_ru.md](./PROJECT_CONTEXT_ru.md).

**Integrator scope:** по умолчанию `integrator` — `admin` / `adminData` не в каталоге, `sdk.admin` бросает ошибку. [INTEGRATOR_SCOPE_ru.md](./INTEGRATOR_SCOPE_ru.md).

```typescript
import { assertIntegratorModule } from '@agentstack/sdk';
assertIntegratorModule(sdk, 'payments');
```

---

## 3. Паттерны AgentProtocol

`sdk.platform.protocol` — [AGENT_PROTOCOL_QUICKSTART.md](https://github.com/agentstacktech/AgentStack/blob/master/docs/AGENT_PROTOCOL_QUICKSTART.md).

- `readThroughSnapshot`
- `executeCommand` + `invalidateSnapshotPrefix`
- `executeCommandsBatch`
- `dnaList` / `dnaGet`

---

## 4. Commerce, economy, support, integrations

| Domain | Entry |
|--------|--------|
| Commerce | `sdk.commerce` · `@agentstack/sdk/commerce/*` |
| Economy | `sdk.platform.economy` · [AGENTNET_ECONOMY_INTEGRATOR_COOKBOOK.md](https://github.com/agentstacktech/AgentStack/blob/master/docs/sdk/AGENTNET_ECONOMY_INTEGRATOR_COOKBOOK.md) |
| Support | `sdk.support` / `sdk.platform.support` |
| Integrations | `sdk.integrations` |

---

## 5. Messenger (кратко)

`sdk.platform.social` или `sdk.createMessengerEmbed()`. UI: `agentstack-messenger` (monorepo). Gene: `sdk.messenger.gen1`.

---

## 6. Media offload

`sdk.media.*` — опциональные peers (`@jsquash/*`, `photoswipe`). Gene: `sdk.media.gen1`.

---

## 7. OpTrace и ошибки

`getOrCreateCorrelationIds` из `@agentstack/sdk` — [OPTRACE_FOR_AGENTS.md](https://github.com/agentstacktech/AgentStack/blob/master/docs/OPTRACE_FOR_AGENTS.md).

Матрица: [AI_ERROR_ACTION_MATRIX_ru.md](./AI_ERROR_ACTION_MATRIX_ru.md).

---

## 8. MCP / REST parity

[REST_MCP_SDK_PARITY.md](https://github.com/agentstacktech/AgentStack/blob/master/docs/ecosystem/REST_MCP_SDK_PARITY.md)

---

## 9. Рецепты Application Factory

[AI_APPLICATION_FACTORY_ru.md](./AI_APPLICATION_FACTORY_ru.md)

---

## 10. Python parity

[PYTHON_SDK_PARITY.md](https://github.com/agentstacktech/AgentStack/blob/master/docs/ecosystem/PYTHON_SDK_PARITY.md) — для AI предпочтителен TypeScript SDK.
