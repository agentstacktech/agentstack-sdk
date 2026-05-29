# Контекст проекта (`project_id`)

**Genetic tag:** `repo.platform.sdk.project_context.gen1`  
**EN:** [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md)

Почти каждый tenant API привязан к **проекту**. SDK хранит scope как **`projectId`** в конфиге и заголовок **`X-Project-ID`**.

---

## Где задаётся

| Слой | Как |
| ---- | --- |
| **Конструктор** | `new AgentStackSDK({ projectId: 42, … })` |
| **После login** | `project_id` сессии → `HTTPClient.updateConfig` (в `AgentAuth.login`) |
| **Смена workspace** | `sdk.updateProjectId(42)` |
| **Браузер SPA** | `localStorage` / `sessionStorage`: `project_id`, `ap_project_id`, `as_project_id` |
| **Заголовок** | `headers: { 'X-Project-ID': '42' }` на запрос |
| **URL / body** | `/api/projects/{id}/…`, `home_project_id`, query `project_id` |

Чтение: `sdk.getProjectId()` · guard: `sdk.requireProjectId()` · AI: `assertProjectIdConfigured(sdk)`.

---

## HTTP (`HTTPClient`)

1. **`/auth/login`** — заголовок **`X-Project-ID: 1`** (bootstrap экосистемы). В body `project_id` выбирает проект сессии.
2. **Остальные маршруты** — если заголовок не задан, SDK шлёт **`String(config.projectId)`**.
3. **`/storage/*`** — при `project_id` в query заголовок выравнивается.
4. **Модули с path** — project в path/args, напр. `sdk.platform.economy.ledger.getBalance(projectId, …)`.

---

## Рекомендуемый flow интегратора

```typescript
import {
  AgentStackSDK,
  resolveAgentStackApiBase,
  assertProjectIdConfigured,
} from '@agentstack/sdk';

const sdk = new AgentStackSDK({
  apiBase: resolveAgentStackApiBase(),
  apiKey: process.env.AGENTSTACK_API_KEY,
  projectId: Number(process.env.AGENTSTACK_PROJECT_ID),
});

await sdk.platform.auth.login({
  email: process.env.AGENTSTACK_EMAIL!,
  password: process.env.AGENTSTACK_PASSWORD!,
  project_id: Number(process.env.AGENTSTACK_PROJECT_ID),
});

const projectId = assertProjectIdConfigured(sdk);
```

### Несколько проектов

```typescript
const projects = await sdk.platform.api.getProjects();
sdk.updateProjectId(projects[0].id);
```

---

## Messenger embed

`createMessengerEmbed()` берёт `httpClient.getConfig().projectId` → `ecosystemProjectId`.

---

## Оператор платформы

Admin (`sdkAudience: platform_operator`, `project_id=1`) — отдельно: [INTEGRATOR_SCOPE_ru.md](./INTEGRATOR_SCOPE_ru.md).

---

## Хелперы (экспорт пакета)

- `normalizeProjectId(value)`
- `readProjectIdFromBrowserStorage()`
- `resolveEffectiveProjectId(configProjectId)`
