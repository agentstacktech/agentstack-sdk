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
| [pathAtom.ts](./pathAtom.ts) | PathAtom grammar mirror (`shared.atoms.path.gen1`) — `parsePath` / `getPath` / `setPath` / `projectPaths` |
| [proteinDraft.ts](./proteinDraft.ts) | Client `ProteinDraftJournal` + DELTA body builder (`commit_mode` / `domain` / `op_id`) |
| [../cache/snapshot-key-contract.ts](../cache/snapshot-key-contract.ts) | Имена ключей снимков |
| [../cache/entity-snapshot-repository.ts](../cache/entity-snapshot-repository.ts) | Хранилище снимков |
| [../modules/ProteinCommandChannel.ts](../modules/ProteinCommandChannel.ts) | Шина команд + `deltaUpdate()` |

## Sideways

- **Единый контур связи + офлайн-first (узел↔сервер, outbox, relay vs REST):** [docs/sdk/SDK_UNIFIED_CONNECTION_OFFLINE_FIRST_DECOMPOSITION.md](../../../../docs/sdk/SDK_UNIFIED_CONNECTION_OFFLINE_FIRST_DECOMPOSITION.md)
- Каналы HTTP vs MCP vs команды: [docs/API_CHANNELS_AND_PROTOCOLS.md](../../../../docs/API_CHANNELS_AND_PROTOCOLS.md)
- Стабильный срез `sdk.platform`: [docs/SDK_AI_SURFACE.md](../../../../docs/SDK_AI_SURFACE.md)

## Remarks (for agents)

| Field | Value |
|-------|-------|
| **Diátaxis** | reference |
| **Pillars** | Creation: one `AgentProtocol` facade; Minimalism: delegate to `sdk.social` / `ProteinCommandChannel` — no parallel HTTP stacks |
| **Cluster** | GENE_COMPRESSION_MAP — SDK / agent protocol (`repo.platform.sdk.agent_protocol.gen1`) |
| **Git root** | `agentstack-unified-sdk` (nested repo when vendored standalone) |
| **Anti-patterns** | Treating `searchSnapshots` as server search; confusing Rules `/command` with protein bus `/commands/*`; ad hoc `new ProteinCommandSDK` when `sdk.protocol` is available |
| **Tests** | `npm run test:scope -- --gene repo.platform.sdk.agent_protocol.gen1` |

- React SPA bridge: [agentstack-frontend/src/lib/entitySnapshotRepositoryBridge.ts](../../../../agentstack-frontend/src/lib/entitySnapshotRepositoryBridge.ts) — TanStack Query ↔ snapshot repo (outside core).
- Messenger UI: REST + TanStack Query remains canonical until spike criteria in [docs/MESSENGER_AGENTPROTOCOL_READ_SPIKE.md](../../../../docs/MESSENGER_AGENTPROTOCOL_READ_SPIKE.md) are met.
