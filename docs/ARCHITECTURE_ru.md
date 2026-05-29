# Архитектура SDK

**Genetic tag:** `repo.platform.sdk.unified.gen1`  
**EN:** [ARCHITECTURE.md](./ARCHITECTURE.md)

Краткое зеркало. Полная детализация — в английском каноне и [AI_INDEX.md](../AI_INDEX.md).

## Слои

1. **AI plane** — `getModuleCatalog`, zod manifests, capability tasks  
2. **Facades** — `sdk.platform`, `sdk.protocol`, `sdk.commerce`  
3. **Domain modules** — `modules/*`, `economy/`, `commerce/`  
4. **Transport** — `HTTPClient`, optrace  
5. **Presentation** — `@agentstack/react`, `@agentstack/hooks`

## Паттерны

- **Facade** — стабильный срез для агентов (`sdk.platform`)  
- **SRP** — файл на модуль  
- **DIP** — модули зависят от `HTTPClient`  
- **DRY** — `config/agentstackEndpoints.ts` для URL

См. [SDK_AI_SURFACE.md](https://github.com/agentstacktech/AgentStack/blob/master/docs/SDK_AI_SURFACE.md).
