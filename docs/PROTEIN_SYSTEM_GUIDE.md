# 🧬 AgentStack Protein System Guide

**Genetic tag:** `repo.platform.sdk.agent_protocol.gen1`  
**RU:** [PROTEIN_SYSTEM_GUIDE_ru.md](./PROTEIN_SYSTEM_GUIDE_ru.md)

> **Protocol-first:** For new integrator code use `sdk.platform.protocol.executeCommand` and snapshot invalidation — not ad-hoc `fetch` to `/commands/*`. Legacy `sdk.protein.*` remains for compatibility; see [AGENT_PROTOCOL_QUICKSTART.md](https://github.com/agentstacktech/AgentStack/blob/master/docs/AGENT_PROTOCOL_QUICKSTART.md).

---

## 🎯 Overview

Protein commands compose complex read models (pages, game data, dashboards) through the platform command channel. The system supports page composition, game entities, multi-level caching, events, and performance metrics.

### Key features

- **Protein commands** — unified command channel for composed data
- **Page composition** — templates for profile, shop, dashboard UIs
- **Game data** — characters, inventory, quests
- **Advanced caching** — TTL + snapshot reads via protocol
- **Event system** — cross-module notifications
- **Performance metrics** — command timing and cache stats

---

## 🏗️ Architecture

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

## 🎨 Page composition

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

### Component slot types

| Slot | Use |
|------|-----|
| `profile` | User profile block |
| `stats` | Metrics tiles |
| `achievements` | Badges / progress |
| `activity` | Feed |
| `products` / `cart` | Commerce UI |
| `character` / `inventory` / `quests` | Game UI |
| `world` | World map / regions |

---

## 🎮 Game data

### Sessions

```typescript
const session = await sdk.gameData.createGameSession(
  projectId,
  userId,
  'rpg_game',
  'char_001',
  'world_001',
);

await sdk.gameData.updateGameSession(session.id, {
  state: 'paused',
  metadata: { checkpoint: 'cp_001' },
});

await sdk.gameData.endGameSession(session.id, 'completed');
```

### Character & inventory

```typescript
const character = await sdk.gameData.getCharacterData(
  projectId,
  userId,
  'char_001',
  true, // inventory
  true, // quests
  true, // achievements
);

await sdk.gameData.updateCharacterData(projectId, userId, 'char_001', {
  level: 10,
  experience: 1500,
});

await sdk.gameData.addItemToInventory(projectId, userId, 'char_001', {
  id: 'sword_001',
  name: 'Iron Sword',
  type: 'weapon',
  quantity: 1,
}, 1);
```

### Quests

```typescript
const quest = await sdk.gameData.getQuestData(projectId, userId, 'quest_001');
await sdk.gameData.startQuest(projectId, userId, 'char_001', 'quest_001');
await sdk.gameData.updateQuestProgress(
  projectId,
  userId,
  'char_001',
  'quest_001',
  'objective_1',
  50,
);
await sdk.gameData.completeQuest(projectId, userId, 'char_001', 'quest_001');
```

---

## ⚡ Advanced features

### Batch protein requests

```typescript
const results = await sdk.protein.executeBatchRequests(1, 123, [
  {
    type: 'get_character_data',
    name: 'Load character',
    payload: { character_id: 'char_001' },
  },
  {
    type: 'get_inventory_data',
    name: 'Load inventory',
    payload: { character_id: 'char_001' },
  },
]);
```

### Complex structures

```typescript
const bundle = await sdk.protein.getComplexDataStructure(1, 123, {
  profile: true,
  inventory: true,
  quests: true,
  world: true,
  stats: true,
  achievements: true,
});
```

### Game script execution

```typescript
const scriptResult = await sdk.gameData.executeGameScript(1, 123, 'combat_script_001', {
  target: 'goblin',
  skill: 'fireball',
  character_id: 'char_001',
});
```

---

## 🔄 Event system

| Event family | Examples |
|--------------|----------|
| Protein | `protein:request:start`, `protein:request:success`, `protein:cache:hit` |
| Composition | `composition:start`, `composition:success`, `component:render:start` |
| Game data | `session:created`, `character:loaded`, `quest:completed` |

```typescript
sdk.on('protein:request:start', (data) => {
  console.debug('protein', data.command_type);
});

sdk.on('composition:success', (data) => {
  console.debug('composed in ms', data.compositionTime);
});
```

---

## 💾 Cache management

| Cache layer | Clear helper |
|-------------|--------------|
| Protein | `sdk.protein.clearProteinCache()` |
| Page composition | `sdk.pageComposition.clearCompositionCache()` |
| Game data | `sdk.gameData.clearGameCache()` |

After mutations, prefer **`sdk.platform.protocol.invalidateSnapshotPrefix`**.

---

### Caching and events

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

### Performance

- Use `readThroughSnapshot` for stable reads in UI loops  
- Batch protein commands where the server supports composition  
- Check `sdk.getCapabilityMatrix()` before optional game/commerce modules  

---

### Response processing

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

### Error handling

| Symptom | Action |
|---------|--------|
| 401 | Re-login via `sdk.platform.auth` |
| 403 | Check [INTEGRATOR_SCOPE.md](./INTEGRATOR_SCOPE.md) — admin commands on tenant SDK |
| 404 command | Verify command id in OpenAPI / `getModuleCatalog()` |
| Stale UI | `invalidateSnapshotPrefix` + React Query keys |

See [AI_ERROR_ACTION_MATRIX.md](./AI_ERROR_ACTION_MATRIX.md).

---

### Events and metrics

```typescript
sdk.neural.on('protein:executed', (payload) => {
  console.debug('protein', payload.command_type, payload.duration_ms);
});
```

Use events for diagnostics only — business logic should not depend on client-only neural events for authoritative state.

---

### Testing protein flows

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

## Related docs

- [AI_APPLICATION_FACTORY.md](./AI_APPLICATION_FACTORY.md) — deploy recipes R1–R6  
- [MODULAR_ARCHITECTURE.md](./MODULAR_ARCHITECTURE.md) — module map  
- [SDK_AI_SURFACE.md](https://github.com/agentstacktech/AgentStack/blob/master/docs/SDK_AI_SURFACE.md) — `sdk.platform` map  
- Russian deep dive: [PROTEIN_SYSTEM_GUIDE_ru.md](./PROTEIN_SYSTEM_GUIDE_ru.md)

**Version:** 0.3.6 · **Philosophy:** AgentProtocol + 8DNA + protein command bus

**Examples:** [examples/typescript/modular-usage.ts](../examples/typescript/modular-usage.ts) · [examples/protein-system-examples.ts](../examples/protein-system-examples.ts)

---

## 🛠️ Protein configuration

```typescript
const sdk = new AgentStackSDK({
  apiBase: resolveAgentStackApiBase(),
  projectId: 1,
  enableCaching: true,
  neural: { cache: { enabled: true, ttl: 300 } },
});
```

`enableCaching` affects client-side neural cache; server snapshot TTL is controlled via protocol invalidation.

```typescript
const stats = sdk.protein.getCacheStats?.();
sdk.protein.clearProteinCache();
```

---

## 🔍 Troubleshooting

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| Stale page data | Snapshot not invalidated | `invalidateSnapshotPrefix` after `executeCommand` |
| 403 on command | Wrong project scope | Pass `project_id` in command payload |
| Empty protein cache | `enableCaching: false` | Enable client neural cache in SDK config |
| Type errors on payload | Schema drift | Regenerate types from OpenAPI / capability matrix |

**Debug tip:** log `command` + `project_id` on every `executeCommand` during development; compare responses before/after `invalidateSnapshotPrefix`.

See also [docs/AI_ERROR_ACTION_MATRIX.md](./AI_ERROR_ACTION_MATRIX.md) for HTTP → UX mapping in SPAs.

### Debug events (development)

```typescript
sdk.on('protein:request:start', (data) => {
  console.debug('protein start', JSON.stringify(data, null, 2));
});
```

---

## 🚀 Best practices

### Performance

1. Enable client neural cache for hot read paths  
2. Batch independent commands when the server supports batch execute  
3. Keep page templates small — compose only fields the UI needs  
4. Monitor `sdk.getMetrics()` and neural cache stats in staging  

### Development

1. Invalidate snapshot prefixes after every successful write command  
2. Handle command errors with [AI_ERROR_ACTION_MATRIX.md](./AI_ERROR_ACTION_MATRIX.md)  
3. Use TypeScript types from `@agentstack/sdk` for payloads  
4. Add integration tests that login → command → snapshot read  

### Architecture

1. Prefer `sdk.platform.protocol` over legacy `sdk.protein` for new features  
2. Keep game/page logic in command handlers, not in client-only caches  
3. Scope all commands with `project_id`  
4. Document command names in your app’s ADR or 8DNA manifest  

---

## 📖 API reference (source)

- `packages/core/src/modules/AgentProtein.ts`  
- `packages/core/src/modules/ProteinResponseProcessor.ts`  
- `packages/core/src/protocol/` — AgentProtocol implementation  

**Examples:** [examples/protein-system-examples.ts](../examples/protein-system-examples.ts) — profile composition, game data, shop page, batch requests, cache management.

---

## 🤝 Support

Issues: https://github.com/agentstacktech/agentstack-sdk/issues · Protocol ADR: monorepo `docs/AGENT_PROTOCOL.md`

Russian deep dive: [PROTEIN_SYSTEM_GUIDE_ru.md](./PROTEIN_SYSTEM_GUIDE_ru.md)
