# Каталог модулей SDK

**Genetic tag:** `repo.platform.sdk.gen1`  
**EN:** [SDK_MODULE_CATALOG.md](./SDK_MODULE_CATALOG.md)

## Discovery в runtime

```typescript
const catalog = sdk.getModuleCatalog();
const matrix = sdk.getCapabilityMatrix();
```

**Scope:** `admin` скрыт для npm-интеграторов. [INTEGRATOR_SCOPE_ru.md](./INTEGRATOR_SCOPE_ru.md).

## Таблица в monorepo

[../../docs/SDK_MODULE_CATALOG.md](../../docs/SDK_MODULE_CATALOG.md) — генерируется из кода.

## Workflow

1. `getModuleCatalog()`  
2. `getCapabilityMatrix()`  
3. Вызов через `sdk.platform.*`  

См. [MODULAR_ARCHITECTURE_ru.md](./MODULAR_ARCHITECTURE_ru.md) · [SDK_AI_SURFACE_ru.md](../../docs/SDK_AI_SURFACE_ru.md).
