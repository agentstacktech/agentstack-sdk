# AgentStack Protein System Guide

**Genetic tag:** `repo.platform.sdk.agent_protocol.gen1`  
**RU:** [PROTEIN_SYSTEM_GUIDE_ru.md](./PROTEIN_SYSTEM_GUIDE_ru.md)

> **Protocol-first:** For new integrator code use `sdk.platform.protocol.executeCommand` and snapshot invalidation — not ad-hoc `fetch` to `/commands/*`. Legacy `sdk.protein.*` remains for compatibility; see [AGENT_PROTOCOL_QUICKSTART.md](https://github.com/agentstacktech/AgentStack/blob/master/docs/AGENT_PROTOCOL_QUICKSTART.md).

Protein commands compose complex read models (pages, game data, dashboards) through the platform command channel.

---

## Architecture

| Component | Role |
|-----------|------|
| `sdk.platform.protocol` | **Preferred** — commands, snapshots, invalidation |
| `ProteinCommandChannel` | HTTP `/commands/*` via shared client |
| `sdk.protein` / `AgentProtein` | High-level protein queries (legacy facade) |
| `PageCompositionSystem` | `sdk.pageComposition` — UI templates |
| `GameDataSystem` | `sdk.gameData` — sessions, characters |

**Features:** composed page data, game entities, multi-level cache, events, performance metrics.

---

## Quick start

```typescript
import { AgentStackSDK, resolveAgentStackApiBase } from '@agentstack/sdk';

const sdk = new AgentStackSDK({
  apiBase: resolveAgentStackApiBase(),
  projectId: 1,
  timeout: 30000,
});

await sdk.platform.auth.login({ email, password, project_id: 1 });

// Recommended: protocol + snapshots
const snapshot = await sdk.platform.protocol.readThroughSnapshot({
  prefix: 'projects',
  projectId: 1,
});

await sdk.platform.protocol.executeCommand({
  command: 'your.protein.command',
  project_id: 1,
  payload: {},
});
```

### Legacy protein facade (when already in codebase)

```typescript
const profileData = await sdk.protein.getProfileData(1, 123, true, true);
const page = await sdk.pageComposition.composePage(
  'user_profile_3d',
  1,
  123,
  {},
  'desktop',
);
```

---

## Protein commands

| Command | Use case |
|---------|----------|
| `get_page_data` | UI page composition |
| `get_character_data` | Game character |
| `get_inventory_data` | Items / inventory |
| `get_quest_data` | Quest progress |
| `get_shop_data` | Commerce UI |
| `get_dashboard_data` | Analytics tiles |
| `get_news_data` | Content feeds |

### Request shape

```typescript
interface ProteinRequest {
  uuid: string;
  command_type: string;
  target: { project_id: number; user_id: number };
  data: Record<string, unknown>;
  timestamp: string;
}
```

### Example command call (protocol)

```typescript
await sdk.platform.protocol.executeCommand({
  command: 'get_page_data',
  project_id: 1,
  payload: {
    page_template: 'user_profile_3d',
    user_id: 123,
    device_type: 'desktop',
  },
});
```

---

## Page composition

Built-in templates: `user_profile_3d`, `game_dashboard_3d`, `shop_3d`.

```typescript
const page = await sdk.pageComposition.composePage(
  'user_profile_3d',
  projectId,
  userId,
  { theme: 'dark' },
  'desktop',
);

await sdk.pageComposition.registerTemplate('custom_dashboard', {
  name: 'Custom Dashboard',
  components: ['header', 'stats', 'actions'],
  layout: 'grid',
});
```

---

## Game data

```typescript
const character = await sdk.gameData.getCharacterData(
  projectId,
  userId,
  'char_001',
);

const session = await sdk.gameData.createGameSession(
  projectId,
  userId,
  'rpg_game',
  'char_001',
);
await sdk.gameData.endGameSession(session.id, 'completed');
```

---

## Caching and events

Enable neural cache in SDK config. After writes, invalidate snapshots:

```typescript
await sdk.platform.protocol.executeCommand({ command: 'update_entity', project_id: 1, payload: {} });
await sdk.platform.protocol.invalidateSnapshotPrefix('projects');
```

Client events:

```typescript
await sdk.neural.emitEvent('page_viewed', {
  page_id: 'dashboard',
  user_id: 123,
});
```

---

## Performance

- Use `readThroughSnapshot` for stable reads in UI loops  
- Batch protein commands where the server supports composition  
- Check `sdk.getCapabilityMatrix()` before optional game/commerce modules  

---

## Response processing

Server responses may include composed payloads (page slots, game entities). The SDK normalizes them for React Query and snapshot caches:

```typescript
const result = await sdk.platform.protocol.executeCommand({
  command: 'get_dashboard_data',
  project_id: 1,
  payload: { user_id: 123 },
});
// Merge into UI state or snapshot prefix 'dashboard'
```

Prefer invalidating the matching snapshot prefix after mutations that change dashboard or page data.

---

## Error handling

| Symptom | Action |
|---------|--------|
| 401 | Re-login via `sdk.platform.auth` |
| 403 | Check [INTEGRATOR_SCOPE.md](./INTEGRATOR_SCOPE.md) — admin commands on tenant SDK |
| 404 command | Verify command id in OpenAPI / `getModuleCatalog()` |
| Stale UI | `invalidateSnapshotPrefix` + React Query keys |

See [AI_ERROR_ACTION_MATRIX.md](./AI_ERROR_ACTION_MATRIX.md).

---

## Events and metrics

```typescript
sdk.neural.on('protein:executed', (payload) => {
  console.debug('protein', payload.command_type, payload.duration_ms);
});
```

Use events for diagnostics only — business logic should not depend on client-only neural events for authoritative state.

---

## Testing protein flows

1. Login with `project_id` set  
2. `getCapabilityMatrix()` — enable game/page modules if needed  
3. `executeCommand` with minimal payload  
4. Assert snapshot read matches write invalidation  

Example scripts: [examples/ai/](../examples/ai/) · [examples/typescript/](../examples/typescript/).

---

## Integrator vs operator

| Surface | Integrator | Operator |
|---------|------------|----------|
| `sdk.platform.protocol` | Yes | Yes |
| `sdk.protein` | Yes (legacy) | Yes |
| Admin protein / BFF | No | Monorepo only |

---

## Migrating from `sdk.protein` to protocol

| Legacy | Preferred |
|--------|-----------|
| `sdk.protein.getProfileData(...)` | `executeCommand` + snapshot prefix `profile` |
| `sdk.pageComposition.composePage(...)` | Keep facade or command `get_page_data` |
| Raw `POST /commands/execute` | `sdk.platform.protocol.executeCommand` |

Migrate incrementally: new features use protocol only; leave legacy calls until a release boundary.

---

## Configuration flags

```typescript
const sdk = new AgentStackSDK({
  apiBase: resolveAgentStackApiBase(),
  projectId: 1,
  enableCaching: true,
  neural: { cache: { enabled: true, ttl: 300 } },
});
```

`enableCaching` affects client-side neural cache; server-side snapshot TTL is controlled by protocol invalidation.

---

## Related docs

- [AI_APPLICATION_FACTORY.md](./AI_APPLICATION_FACTORY.md) — deploy recipes R1–R6  
- [MODULAR_ARCHITECTURE.md](./MODULAR_ARCHITECTURE.md) — module map  
- [SDK_AI_SURFACE.md](https://github.com/agentstacktech/AgentStack/blob/master/docs/SDK_AI_SURFACE.md) — `sdk.platform` map  
- Russian deep dive: [PROTEIN_SYSTEM_GUIDE_ru.md](./PROTEIN_SYSTEM_GUIDE_ru.md)

**Version:** 0.3.6 · **Philosophy:** AgentProtocol + 8DNA + protein command bus
