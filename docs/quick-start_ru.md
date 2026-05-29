# Быстрый старт

**EN:** [quick-start.md](./quick-start.md)

Для AI-агентов: [AGENTS.md](../AGENTS.md) (канон EN) · [AGENTS_ru.md](../AGENTS_ru.md).

```bash
npm install @agentstack/sdk
```

```typescript
import { AgentStackSDK, resolveAgentStackApiBase } from '@agentstack/sdk';

const sdk = new AgentStackSDK({
  apiBase: resolveAgentStackApiBase(),
});

const catalog = sdk.getModuleCatalog();
await sdk.platform.auth.login({
  email: process.env.AGENTSTACK_EMAIL!,
  password: process.env.AGENTSTACK_PASSWORD!,
});

const projects = await sdk.platform.api.getProjects();
```

## Переменные окружения

| Переменная | Когда | Значение |
|------------|-------|----------|
| `AGENTSTACK_API_BASE` | Node, скрипты | Production: `https://agentstack.tech/api` (или omit — дефолт `resolveAgentStackApiBase()`) |
| `AGENTSTACK_API_KEY` | Автоматизация | API-ключ проекта |
| `AGENTSTACK_EMAIL` / `AGENTSTACK_PASSWORD` | Примеры | Login для тестов |
| `AGENTSTACK_PROJECT_ID` | Примеры | Scope проекта (`sdk.updateProjectId`) |
| `VITE_API_BASE_URL` | Vite SPA | `https://agentstack.tech/api` |

## Локальная разработка

`AGENTSTACK_API_BASE=http://localhost:8000/api` при локальном Core.

Подробнее: [DOC_HUB_ru.md](./DOC_HUB_ru.md).
