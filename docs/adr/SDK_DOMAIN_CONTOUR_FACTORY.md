# SDK / SPA domain write contour factory

**Status:** Accepted  
**Genes:** `frontend.spa.server_state.golden_path.gen1` · `repo.platform.sdk.unified.gen1`  
**Frontend impl:** `agentstack-frontend/src/lib/cache/createWriteContour.ts`

## Context

Module hubs (CRM, agents, generations, grant OS, copilot) need a consistent **write → invalidate** path after mutations. Duplicating `invalidateQueriesByPrefixes` + `evictHttpCacheForQueryPrefixes` + optional `invalidateAfterWrite({ entity })` invites drift and missed HTTP eviction.

## Decision

Use **`createWriteContour(config)`** to produce a domain-specific async function:

```typescript
const crmHttpEvict = createWriteContour({ prefixes: [['crm']] });

await crmHttpEvict(queryClient, sdk, { httpOnly: true });
await grantOsWriteContour(queryClient, sdk);
await invalidateAfterWriteContour(queryClient, sdk, { entity: 'crm' });
```

### Config

| Field | Purpose |
|-------|---------|
| `prefixes` | Base TanStack key prefixes invalidated on every run |
| `entity` | Merges `ENTITY_TO_QUERY_KEY_PREFIXES` via `invalidateAfterWrite` |
| `evictHttp` | When true (default), evicts SDK HTTP cache for prefixes |

### Run options

| Option | Purpose |
|--------|---------|
| `prefixes` | Extra prefixes merged per call |
| `entity` | Override config entity |
| `refetchType` | TanStack refetch mode (`active` default) |
| `httpOnly` | HTTP eviction only — no RQ invalidation |

## Module pattern

1. Define `*QueryKeys.ts` — single SoT for read keys and root prefixes.
2. Add `*WriteContour.ts` beside the module — `createWriteContour` + targeted `queryClient.invalidateQueries` for scoped keys.
3. Wire mutation `onSuccess` to the contour — never raw prefix sweeps in hooks.
4. Add CI script under `agentstack-frontend/scripts/check-*-write-contour.mjs` when the hub is P0/P1.

## SDK pairing: `createAgentSession`

Agent scripts should discover surfaces before calling APIs:

```typescript
import { createAgentSession } from '@agentstack/sdk';

const { sdk, catalog, matrix } = createAgentSession({
  apiBase: 'https://agentstack.tech/api',
  apiKey: process.env.AGENTSTACK_API_KEY!,
  projectId: Number(process.env.AGENTSTACK_PROJECT_ID!),
});
```

## References

- `docs/frontend/FRONTEND_DATA_FLOW_GOLDEN_PATH.md`
- `docs/frontend/FRONTEND_HELPER_INVENTORY.md`
- `philosophy/genes/frontend.spa.server_state.golden_path.gen1.md`
