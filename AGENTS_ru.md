# AgentStack SDK — гид для AI-агентов

**Genetic tag:** `repo.platform.sdk.ai_surface.gen1`  
**EN:** [AGENTS.md](AGENTS.md) · **Хаб:** [docs/DOC_HUB_ru.md](docs/DOC_HUB_ru.md) · **Глоссарий:** [docs/GLOSSARY_ru.md](docs/GLOSSARY_ru.md)  
**Цель:** быстрая и надёжная сборка приложений и сайтов на AgentStack через типизированный SDK и self-description.

---

## Bootstrap за 60 секунд

```typescript
import { AgentStackSDK, resolveAgentStackApiBase } from '@agentstack/sdk';

const sdk = new AgentStackSDK({ apiBase: resolveAgentStackApiBase() });

const catalog = sdk.getModuleCatalog();
const matrix = sdk.getCapabilityMatrix();

// Headless-агент (скрипты / CI)
sdk.platform.auth.useApiKey(process.env.AGENTSTACK_API_KEY!, Number(process.env.AGENTSTACK_PROJECT_ID!));

// SPA с логином человека:
// await sdk.platform.auth.login({ email, password });

const projects = await sdk.platform.api.getProjects();
```

**Скрипт агента (~15 строк):**

```typescript
import { AgentStackSDK, mcpExecute, resolveMcpUrl } from '@agentstack/sdk';
const apiKey = process.env.AGENTSTACK_API_KEY!;
const projectId = Number(process.env.AGENTSTACK_PROJECT_ID!);
const sdk = new AgentStackSDK({ apiBase: 'https://agentstack.tech/api', apiKey, projectId });
sdk.platform.auth.useApiKey(apiKey, projectId);
const discovery = await mcpExecute(
  [{ action: 'discovery.list', params: {} }],
  { token: apiKey, projectId, mcpUrl: resolveMcpUrl('https://agentstack.tech/api') },
);
console.log('tools', discovery);
```

**CLI:** `npx @agentstack/cli` — gene `repo.tooling.user_cli.gen1` · [docs/CLI_QUICKSTART.md](../docs/CLI_QUICKSTART.md)

**Контекст проекта:** [docs/PROJECT_CONTEXT_ru.md](docs/PROJECT_CONTEXT_ru.md) · `sdk.updateProjectId(42)`  
**Установка SDK:** [docs/SDK_INTEGRATION_FLOWS_ru.md](docs/SDK_INTEGRATION_FLOWS_ru.md)  
**Production API:** `https://agentstack.tech/api` · локально: `AGENTSTACK_API_BASE=http://localhost:8000/api` · Vite: `VITE_API_BASE_URL`

---

## Discover → validate → execute

| Шаг | API | Когда |
|-----|-----|-------|
| Discover | `sdk.getModuleCatalog()` | Модули, hints, examples |
| Gate | `sdk.getCapabilityMatrix()` | Пропустить отключённые domain |
| Validate | `validateAppManifest()`, `assertIntegratorModule()`, `parseTaskManifest()` | Перед записью |
| Execute | `sdk.platform.*`, `sdk.protocol.*` | REST + команды + снапшоты |
| Deploy | `sdk.hosting.quickStart()` | Статический хостинг |

Рецепты: [docs/AI_APPLICATION_FACTORY.md](docs/AI_APPLICATION_FACTORY.md) (EN).

---

## Дерево решений

- **CRUD / проекты** → `sdk.platform.api` или `sdk.platform.dna`
- **DNA command bus** → `sdk.platform.protocol.executeCommand` (новый код — не сырой `sdk.protein.*`, см. [PROTEIN_SYSTEM_GUIDE_ru.md](docs/PROTEIN_SYSTEM_GUIDE_ru.md))
- **Rules engine** → `sdk.platform.command` или `protocol.executeRulesCommand`
- **Снапшоты** → `sdk.platform.protocol.readThroughSnapshot`
- **MCP** → `sdk.mcp.execute` / `mcpExecute()` · `@agentstack/sdk/mcp` · `sdk.mcp.discoverByIntent()`
- **Терминал / CI** → `@agentstack/cli`
- **Tenant-приложения** → не `sdk.admin` ([INTEGRATOR_SCOPE_ru.md](docs/INTEGRATOR_SCOPE_ru.md))

---

## Genetic routing

| Tag | Документ / код |
|-----|----------------|
| `repo.platform.sdk.gen1` | [AI_INDEX.md](AI_INDEX.md) |
| `repo.platform.sdk.ai_surface.gen1` | [SDK_AI_SURFACE_ru.md](../docs/SDK_AI_SURFACE_ru.md) |
| `repo.platform.sdk.agent_protocol.gen1` | [PROTEIN_SYSTEM_GUIDE_ru.md](docs/PROTEIN_SYSTEM_GUIDE_ru.md) |
| `repo.platform.app_manifest.gen1` | `@agentstack/sdk/manifest` |
| `sdk.hosting.gen2` | `sdk.hosting.quickStart` |
| `repo.platform.sdk.docs_i18n.gen1` | [DOCS_I18N_ru.md](docs/DOCS_I18N_ru.md) |

---

## Анти-паттерны

- Не `fetch('/api/...')`, если есть `sdk.platform` / `sdk.protocol`.
- Не `sdk.protocol.searchSnapshots` как серверный full-text search (только scan кеша).
- Не `sdk.projects.get(uuid)` — `projects` это 8DNA wrapper; используйте `sdk.platform.api.getProject(id)`.
- Не `sdk.admin` / `sdk.platform.adminData` у интеграторов.
- Проверять `getCapabilityMatrix()` перед optional domain (`payments`, `gameData`, …).

---

## Ссылки

- Модульная архитектура: [docs/MODULAR_ARCHITECTURE_ru.md](docs/MODULAR_ARCHITECTURE_ru.md)
- Protein / protocol: [docs/PROTEIN_SYSTEM_GUIDE_ru.md](docs/PROTEIN_SYSTEM_GUIDE_ru.md)
- Каталог модулей: [docs/SDK_MODULE_CATALOG_ru.md](docs/SDK_MODULE_CATALOG_ru.md)
- Интегратор: [docs/AI_INTEGRATOR_GUIDE_ru.md](docs/AI_INTEGRATOR_GUIDE_ru.md)
- Scope: [docs/INTEGRATOR_SCOPE_ru.md](docs/INTEGRATOR_SCOPE_ru.md)
- Ошибки: [docs/AI_ERROR_ACTION_MATRIX_ru.md](docs/AI_ERROR_ACTION_MATRIX_ru.md)
- Swagger: https://agentstack.tech/swagger
- MCP: https://agentstack.tech/mcp
