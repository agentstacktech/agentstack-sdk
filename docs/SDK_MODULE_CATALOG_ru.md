# Каталог модулей SDK

**Genetic tag:** `repo.platform.sdk.gen1`  
**EN:** [SDK_MODULE_CATALOG.md](./SDK_MODULE_CATALOG.md)

Канонический список в monorepo: [docs/SDK_MODULE_CATALOG.md](https://github.com/agentstacktech/AgentStack/blob/master/docs/SDK_MODULE_CATALOG.md).

## В рантайме

```typescript
const catalog = sdk.getModuleCatalog();
const matrix = sdk.getCapabilityMatrix();
```

Вызывайте **до** произвольных API: в каталоге — `accessPaths`, `aiHints`, `examples`.

## Integrator scope

Модули `admin` / `adminData` **скрыты**, если `sdkAudience` не `platform_operator`. См. [INTEGRATOR_SCOPE_ru.md](./INTEGRATOR_SCOPE_ru.md).

## Обновление каталога

В monorepo: `python agentstack-core/scripts/build_module_catalog.py` — не редактируйте сгенерированные JSON вручную.

Тело каталога (таблицы модулей) — только на **английском** в EN-файле и в выводе `getModuleCatalog()`.
