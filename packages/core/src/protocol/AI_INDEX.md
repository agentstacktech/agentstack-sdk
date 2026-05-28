# AI Index — AgentProtocol (`sdk.protocol`)

**Genetic tag:** `repo.platform.sdk.agent_protocol.gen1`  
**Parent map:** [docs/AGENT_PROTOCOL.md](../../../../docs/AGENT_PROTOCOL.md) (spec v0) · [docs/AGENT_PROTOCOL_QUICKSTART.md](../../../../docs/AGENT_PROTOCOL_QUICKSTART.md) · [docs/AI_NAVIGATION_MAP.md](../../../../docs/AI_NAVIGATION_MAP.md)

## Read first (under 2 min)

- Один вход для приложений/агентов: **`AgentProtocol`** → REST + command bus + snapshots + path read + поиск по плоскому индексу.
- **`searchSnapshots`** — только по данным, уже лежащим в репозитории снимков (не серверный поиск); см. [docs/AGENT_PROTOCOL.md](../../../../docs/AGENT_PROTOCOL.md) § «Поиск по снимкам».
- Не путать: `AgentCommand` = `/command` (Rules); `ProteinCommandChannel` = `/commands/*`.

## Hot files

| File | Role |
|------|------|
| [AgentProtocol.ts](./AgentProtocol.ts) | Фасад, REST, 8DNA `dna*`, command bus, read-through, `searchSnapshots`, `runMutation`, AgentSocial (`social*` — полный мессенджер/PAS/public, зеркало `sdk.social`), Web Push (`webPush*`) |
| [../modules/AgentSocial.ts](../modules/AgentSocial.ts) | Прямой REST мессенджер/друзья/PAS — дублирует маршруты protocol; `sdk.social` |
| [../modules/AgentWebPush.ts](../modules/AgentWebPush.ts) | VAPID subscribe/unsubscribe — `sdk.webPush`, `sdk.notifications.webPush` |
| [command-queue.ts](./command-queue.ts) | Serial mutation queue (браузер / одна вкладка) |
| [../cache/snapshot-key-contract.ts](../cache/snapshot-key-contract.ts) | Имена ключей снимков |
| [../cache/entity-snapshot-repository.ts](../cache/entity-snapshot-repository.ts) | Хранилище снимков |
| [../modules/ProteinCommandChannel.ts](../modules/ProteinCommandChannel.ts) | Шина команд |

## Sideways

- **Единый контур связи + офлайн-first (узел↔сервер, outbox, relay vs REST):** [docs/sdk/SDK_UNIFIED_CONNECTION_OFFLINE_FIRST_DECOMPOSITION.md](../../../../docs/sdk/SDK_UNIFIED_CONNECTION_OFFLINE_FIRST_DECOMPOSITION.md)
- Каналы HTTP vs MCP vs команды: [docs/API_CHANNELS_AND_PROTOCOLS.md](../../../../docs/API_CHANNELS_AND_PROTOCOLS.md)
- Стабильный срез `sdk.platform`: [docs/SDK_AI_SURFACE.md](../../../../docs/SDK_AI_SURFACE.md)
- React SPA: [agentstack-frontend/src/lib/entitySnapshotRepositoryBridge.ts](../../../../agentstack-frontend/src/lib/entitySnapshotRepositoryBridge.ts) — синх TanStack Query ↔ репозиторий (вне core).
- Мессенджер (UI): канонический контур — REST + TanStack Query + [`chatHistoryNormalize`](../../../../agentstack-frontend/src/lib/chatHistoryNormalize.ts); spike path/snapshot vs REST — критерии в [docs/MESSENGER_AGENTPROTOCOL_READ_SPIKE.md](../../../../docs/MESSENGER_AGENTPROTOCOL_READ_SPIKE.md) (до измерений REST остаётся основным).
