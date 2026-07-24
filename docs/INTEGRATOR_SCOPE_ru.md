# Область интегратора vs оператор платформы

**Genetic tag:** `repo.platform.sdk.integrator_scope.gen1`  
**EN:** [INTEGRATOR_SCOPE.md](./INTEGRATOR_SCOPE.md)

**Аудитория:** потребители npm (`@agentstack/sdk`), сторонние агенты, tenant-приложения.

Два режима SDK:

| Аудитория | `SDKConfig.sdkAudience` | Admin-поверхности |
| --------- | ------------------------ | ----------------- |
| **Интегратор тенанта** (по умолчанию) | `integrator` или не задан | **Заблокированы** |
| **Оператор экосистемы** | `platform_operator` | Разрешены (monorepo SPA / ops) |

Ecosystem admin (`/api/admin/*`, `sdk.admin`, `sdk.platform.adminData`, protocol `*AdminExecute`) — только для **операторов AgentStack**, не для приложений клиентов на платформе.

---

## Чем пользоваться интеграторам

| Задача | API |
| ------ | --- |
| CRUD проектов, участники | `sdk.platform.api` |
| Таблицы 8DNA | `sdk.platform.dna`, `sdk.platform.projects`, `sdk.platform.users` |
| Команды + снапшоты | `sdk.platform.protocol` |
| Роли в проекте | `sdk.platform.rbac` |
| AgentNet economy (тенант) | `sdk.platform.economy` → `/api/agentnet/{project_id}/*` |
| Агенты проекта | `sdk.agentsFleet` |
| Support inbox | `sdk.support` |
| Social / messenger | `sdk.platform.social`, `sdk.createMessengerEmbed()` |

Не вызывайте `/api/admin/*` из tenant-кода. HTTP-клиент отклоняет такие пути при `sdkAudience: integrator`.

---

## Защита в рантайме (TypeScript)

1. **`sdk.admin`**, **`sdk.adminData`**, **`sdk.platform.adminData`** — `AgentStackError` для интеграторов.
2. **`HTTPClient.request`** — блокирует пути с `/admin/`.
3. **`socialAdminExecute` / `agentsAdminExecute`** — только оператор.
4. **`getModuleCatalog()` / `getCapabilityMatrix()`** — без `admin` / `adminData` для интеграторов.

В monorepo frontend: `sdkAudience: 'platform_operator'` в `shared/sdk-client.ts`.

---

## Базовый URL API

| Поверхность | Production |
| ----------- | ---------- |
| REST | `https://agentstack.tech/api` |
| OpenAPI | `https://agentstack.tech/swagger` |
| MCP | `https://agentstack.tech/mcp` |

Не используйте устаревшие хосты (`api.agentstack.com`, …). Node: `AGENTSTACK_API_BASE=https://agentstack.tech/api` или `resolveAgentStackApiBase()`.

---

## Выбор канала (MCP vs REST vs OpenAPI)

| Задача | Предпочтение | Заметки |
| ------ | ------------ | ------- |
| Новые агенты / автоматизации | **MCP** `agentstack.execute` | Каталог: `GET /mcp/actions` |
| KV данные проекта/пользователя | **8DNA** `GET/POST /api/dna/data` или MCP | Универсальный канал |
| Уже используемый SPA/SDK REST | **REST** `/api/*` | В OpenAPI: `x-channel: rest_compat` |
| Контракт / codegen / explorer | **OpenAPI** `/openapi.json`, `/docs`, `/api-docs` | Ген `docs.api.specs.gen1` |

См. [API_CHANNELS_AND_PROTOCOLS.md](../../docs/API_CHANNELS_AND_PROTOCOLS.md) и [OPENAPI.md](../../docs/api/OPENAPI.md).

## Конфигурация

```typescript
import { AgentStackSDK, resolveAgentStackApiBase } from '@agentstack/sdk';

const appSdk = new AgentStackSDK({
  apiBase: resolveAgentStackApiBase(),
  projectId: 42,
});

const opsSdk = new AgentStackSDK({
  apiBase: resolveAgentStackApiBase(),
  projectId: 1,
  sdkAudience: 'platform_operator',
});
```

---

## Discovery для AI

После `getModuleCatalog()` интеграторы **не увидят** `admin` / `adminData`. Попытка `sdk.admin` даёт ошибку со ссылкой на этот документ.

См. также: [AGENTS_ru.md](../AGENTS_ru.md), [AGENTS.md](../AGENTS.md) (EN).
