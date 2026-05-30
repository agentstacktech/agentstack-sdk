# SDK architecture

**Genetic tag:** `repo.platform.sdk.unified.gen1`  
**RU:** [ARCHITECTURE_ru.md](./ARCHITECTURE_ru.md)

How the unified SDK is layered for integrators, React apps, and AI agents.

---

## Layers

```text
┌─────────────────────────────────────────┐
│  AI plane — catalog, manifests, tasks   │
├─────────────────────────────────────────┤
│  Facades — sdk.platform, protocol,      │
│            commerce, economy            │
├─────────────────────────────────────────┤
│  Domain modules — modules/*, economy/,  │
│                   commerce/, social     │
├─────────────────────────────────────────┤
│  Transport — HTTPClient, optrace, relay │
├─────────────────────────────────────────┤
│  Presentation — @agentstack/react, hooks│
└─────────────────────────────────────────┘
```

| Layer | Entry points |
|-------|----------------|
| **AI plane** | `getModuleCatalog()`, `getCapabilityMatrix()`, capability tasks |
| **Facades** | `sdk.platform`, `sdk.protocol`, `sdk.commerce` |
| **Domain** | `modules/*`, `@agentstack/sdk/economy`, `/commerce/*` |
| **Transport** | `HTTPClient`, shared endpoints config |
| **UI** | `@agentstack/react`, `@agentstack/hooks` |

---

## Patterns

- **Facade** — `sdk.platform` stays stable while domain modules evolve  
- **SRP** — one file per domain module  
- **DIP** — modules depend on `HTTPClient`, not raw `fetch`  
- **DRY** — `config/agentstackEndpoints.ts` for URL constants  

---

## Package layout

| Package | Role |
|---------|------|
| `@agentstack/sdk` | Core client, protocol, DNA, commerce subpaths |
| `@agentstack/react` | `SDKProvider`, React Query hooks |
| `@agentstack/hooks` | Headless hooks without UI |
| `agentstack-sdk` (Python) | Parity subset for backends |

---

## Discovery workflow

1. `sdk.getModuleCatalog()` — module ids, `accessPaths`, examples  
2. `sdk.getCapabilityMatrix()` — skip disabled domains  
3. Execute via `sdk.platform.*` or subpath exports  

See [SDK_MODULE_CATALOG.md](./SDK_MODULE_CATALOG.md) and monorepo [SDK_AI_SURFACE.md](../../docs/SDK_AI_SURFACE.md).

---

## Related

- [MODULAR_ARCHITECTURE.md](./MODULAR_ARCHITECTURE.md) — `Agent*` modules  
- [PROTEIN_SYSTEM_GUIDE.md](./PROTEIN_SYSTEM_GUIDE.md) — command bus  
- [AI_INDEX.md](../AI_INDEX.md) — full agent map (EN)
