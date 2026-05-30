# SDK module catalog

**Genetic tag:** `repo.platform.sdk.gen1`  
**RU:** [SDK_MODULE_CATALOG_ru.md](./SDK_MODULE_CATALOG_ru.md)

## Runtime discovery (integrators)

Always prefer live discovery over static lists:

```typescript
const catalog = sdk.getModuleCatalog();
const matrix = sdk.getCapabilityMatrix();

for (const mod of catalog.modules) {
  if (!matrix.domain.find((d) => d.id === mod.id)?.enabled) continue;
  // use mod.accessPaths, mod.aiHints, mod.examples
}
```

**Scope:** `admin` / `adminData` entries are omitted unless `sdkAudience: 'platform_operator'`. See [INTEGRATOR_SCOPE.md](./INTEGRATOR_SCOPE.md).

## Generated reference

Monorepo canonical table (regenerated from code): [../../docs/SDK_MODULE_CATALOG.md](../../docs/SDK_MODULE_CATALOG.md)

## Workflow for AI agents

1. `getModuleCatalog()` — pick module id and `accessPaths`  
2. `getCapabilityMatrix()` — skip disabled domains  
3. `assertIntegratorModule()` when validating manifests  
4. Execute via `sdk.platform.*` or documented subpath export  

Related: [MODULAR_ARCHITECTURE.md](./MODULAR_ARCHITECTURE.md) · [SDK_AI_SURFACE.md](../../docs/SDK_AI_SURFACE.md)
