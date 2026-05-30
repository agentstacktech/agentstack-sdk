# SDK documentation claims audit (sample)

**Genetic tag:** `repo.platform.sdk.docs_i18n.gen1`  
**Optional P3** — spot-check docs vs runtime discovery.

## How to run (manual)

```typescript
const catalog = sdk.getModuleCatalog();
const matrix = sdk.getCapabilityMatrix();
console.log(catalog.modules.map((m) => m.id));
console.log(matrix.domain.filter((d) => d.enabled));
```

Compare output with statements in [INTEGRATOR_SCOPE.md](./INTEGRATOR_SCOPE.md) and [MODULAR_ARCHITECTURE.md](./MODULAR_ARCHITECTURE.md).

## Invariants (must hold)

| Claim | Verify |
|-------|--------|
| `sdk.admin` absent for integrators | `catalog` omits admin modules with default config |
| `sdk.platform` always enabled | `matrix.platform` entries `enabled: true` |
| Production base URL | `resolveAgentStackApiBase()` → `https://agentstack.tech/api` |

## Maintenance

Re-run after major SDK releases. Full matrix: [DOC_SYNC_MATRIX.md](./DOC_SYNC_MATRIX.md).
