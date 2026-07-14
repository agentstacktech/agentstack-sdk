# SDK SEO module — AI index

**Genetic tag:** `sdk.seo.gen1`

## Surface

| Export | Role |
|--------|------|
| `@agentstack/sdk/seo` | `AgentSeo`, `getMeta`, `getHostingFunnelCopy` |
| `HOSTING_FUNNEL_PATHS` | G1–G4 marketing paths |

## Hot files

| File | Role |
|------|------|
| [`packages/core/src/seo/index.ts`](../packages/core/src/seo/index.ts) | REST client for `/api/seo/meta` |
| [`shared/seo/seo_copy_registry.py`](../../../shared/seo/seo_copy_registry.py) | Python SoT (codegen → frontend JSON) |
| [`docs/seo/AI_INDEX.md`](../../../docs/seo/AI_INDEX.md) | Platform SEO docs index |

## Usage

```typescript
import { AgentSeo } from '@agentstack/sdk/seo';

const seo = new AgentSeo(sdk.httpClient);
const meta = await seo.getMeta('/host-site', { locale: 'ru' });
const funnel = await seo.getHostingFunnelCopy('en');
```

## Cross-links

- [SEO_SURFACE_ARCHITECTURE.md](../../../docs/adr/SEO_SURFACE_ARCHITECTURE.md)
- [sdk.hosting.gen1](../../../philosophy/genes/sdk.hosting.gen1.md)
