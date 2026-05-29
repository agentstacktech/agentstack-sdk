# AgentStack SDK — гид для AI-агентов

**Genetic tag:** `repo.platform.sdk.ai_surface.gen1`  
**EN:** [AGENTS.md](AGENTS.md)

---

## Bootstrap за 60 секунд

```typescript
import { AgentStackSDK, resolveAgentStackApiBase } from '@agentstack/sdk';

const sdk = new AgentStackSDK({ apiBase: resolveAgentStackApiBase() });

const catalog = sdk.getModuleCatalog();
const matrix = sdk.getCapabilityMatrix();

await sdk.platform.auth.login({
  email: process.env.AGENTSTACK_EMAIL!,
  password: process.env.AGENTSTACK_PASSWORD!,
});

const projects = await sdk.platform.api.getProjects();
sdk.updateProjectId(42);
```

**Контекст проекта:** [docs/PROJECT_CONTEXT_ru.md](docs/PROJECT_CONTEXT_ru.md)  
**Установка SDK:** [docs/SDK_INTEGRATION_FLOWS_ru.md](docs/SDK_INTEGRATION_FLOWS_ru.md)  
**Production API:** `https://agentstack.tech/api` · локально: `AGENTSTACK_API_BASE=http://localhost:8000/api`

---

## Discover → validate → execute

| Шаг | API | Когда |
|-----|-----|-------|
| Discover | `sdk.getModuleCatalog()` | Модули, hints, examples |
| Gate | `sdk.getCapabilityMatrix()` | Пропустить отключённые domain |
| Validate | `validateAppManifest()`, `assertIntegratorModule()` | Перед записью |
| Execute | `sdk.platform.*`, `sdk.protocol.*` | REST + команды |
| Deploy | `sdk.hosting.quickStart()` | Статический хостинг |

Рецепты: [docs/AI_APPLICATION_FACTORY.md](docs/AI_APPLICATION_FACTORY.md) (EN).

---

## Дерево решений

- **CRUD / проекты** → `sdk.platform.api` или `sdk.platform.dna`
- **DNA command bus** → `sdk.platform.protocol.executeCommand`
- **Снапшоты** → `sdk.platform.protocol.readThroughSnapshot`
- **MCP** → `https://agentstack.tech/mcp`
- **Tenant-приложения** → не `sdk.admin` ([INTEGRATOR_SCOPE_ru.md](docs/INTEGRATOR_SCOPE_ru.md))

---

## Анти-паттерны

- Не `fetch('/api/...')`, если есть `sdk.platform` / `sdk.protocol`.
- Не `sdk.admin` / `sdk.platform.adminData` у интеграторов.
- Проверять `getCapabilityMatrix()` перед optional domain.

---

## Ссылки

- Хаб документов: [docs/DOC_HUB_ru.md](docs/DOC_HUB_ru.md)
- Swagger: https://agentstack.tech/swagger
- MCP: https://agentstack.tech/mcp
