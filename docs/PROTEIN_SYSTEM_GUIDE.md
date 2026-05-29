# AgentStack Protein System Guide

**Genetic tag:** `repo.platform.sdk.agent_protocol.gen1`  
**RU:** [PROTEIN_SYSTEM_GUIDE_ru.md](./PROTEIN_SYSTEM_GUIDE_ru.md)

Protein commands compose complex read models (pages, game data, dashboards) through the platform command channel. **Integrators:** prefer `sdk.platform.protocol.executeCommand` and snapshots — see [AGENT_PROTOCOL_QUICKSTART.md](https://github.com/agentstacktech/AgentStack/blob/master/docs/AGENT_PROTOCOL_QUICKSTART.md).

---

## Core components

| Component | Role |
|-----------|------|
| `AgentProtein` / `sdk.protein` | High-level protein queries |
| `ProteinCommandChannel` | `/commands/execute` via shared `HTTPClient` |
| `sdk.platform.protocol` | Command bus + snapshot invalidation (AI-first) |
| Page / game facades | Templates, sessions, characters |

---

## Quick start

```typescript
import { AgentStackSDK, resolveAgentStackApiBase } from '@agentstack/sdk';

const sdk = new AgentStackSDK({
  apiBase: resolveAgentStackApiBase(),
  projectId: 1,
});

await sdk.platform.auth.login({ email, password });

// Protocol (recommended)
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

---

## Common command types

| Command | Use case |
|---------|----------|
| `get_page_data` | UI page composition |
| `get_character_data` | Game character |
| `get_inventory_data` | Items |
| `get_quest_data` | Quest progress |
| `get_shop_data` | Commerce UI |
| `get_dashboard_data` | Analytics tiles |

Request shape (simplified):

```typescript
interface ProteinRequest {
  uuid: string;
  command_type: string;
  target: { project_id: number; user_id: number };
  data: Record<string, unknown>;
  timestamp: string;
}
```

---

## Page composition

Built-in templates include `user_profile_3d`, `game_dashboard_3d`, `shop_3d`. Register custom templates via `sdk.pageComposition.registerTemplate(...)`.

---

## Game data

```typescript
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

Enable client neural cache in SDK config; invalidate snapshot prefixes after writes:

```typescript
await sdk.platform.protocol.executeCommand({ /* … */ });
await sdk.platform.protocol.invalidateSnapshotPrefix('projects');
```

---

## Related docs

- [AI_APPLICATION_FACTORY.md](./AI_APPLICATION_FACTORY.md) — deploy recipes  
- [ARCHITECTURE.md](./ARCHITECTURE.md) — SDK layers  
- Full Russian guide: [PROTEIN_SYSTEM_GUIDE_ru.md](./PROTEIN_SYSTEM_GUIDE_ru.md)
