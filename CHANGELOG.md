# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `@agentstack/netplay` pass 4: `hostedMcpRunner` sends requests under 8 kB with `keepalive`, so the leave/away of a closing tab or swiped-away phone app still reaches the room.
- `@agentstack/netplay` pass 4: quiet-room polling — presence beats and hash checks no longer reset the poll to full speed, stackscript `idleMaxMs` 1200 → 2000: both players thinking in a turn game 1.03 → 0.53 req/s per client.
- `@agentstack/netplay`: secret lockstep — the reveal kept in `secretStore` stays until the room moves past that turn (it was cleared when merely queued: a reveal that could not go out before a reload was lost and the turn waited for the clock).
- `@agentstack/netplay` pass 3 (fuzz: drops, hide/show, rematch, reloads on fold / realtime / secret / authority games): hash checkpoints carry their match (a reload after a rematch reported match-1 hashes as match 2 → a false desync); a catch-up reports only the newest 2 unreported checkpoints (was every one → rate-limit burst, 14 → ≤3 entries in the test); `memoryHub.disconnect` tells the client like a dropped socket (a silent spectator stayed stuck).
- `@agentstack/netplay`: a move from a background tab (a game that keeps playing while hidden) restores normal polling — it used to stay at `hiddenPollMs` while counted present.
- `@agentstack/netplay`: `Session.turnLeftMs()` — skew-free turn clock (room log time + local time since it was seen). `Date.now() − tickStartT` mixed the device clock with the server's: a device off by a minute, or a server stamping t = 0, showed 0 s and fired buzzers at once.
- `@agentstack/netplay`: background tab polls slower — `Link.pace?(ms|null)` (polling transports), `away(true)` slows polling to `SessionOptions.hiddenPollMs` (default 3000 ms), return polls at once (battery, mobile data, room request budget).
- `@agentstack/netplay`: `Session.inputAll(cmd)` — fold / authority command for every seat on the device in one entry (`{ k: 'cmd', a: 1 }`), so a shared-table clock report with local seats costs one entry instead of one per seat. Room generator: `maxLog` (default 100000, `LOG_FULL`), default `chunk` 64 → 16 (less rewritten per append).
- `@agentstack/netplay` 0.1.0 (`sdk.netplay.gen1`): game-agnostic deterministic multiplayer — `defineGame` (lockstep / fold / authority), room-log reducer (lobby, ready, rematch, timeouts, spectators, commit–reveal, desync hashes), transports (memory, polling, StackScript via the SDK client, WSS), matchmaking, StackScript room-script generator, `@agentstack/netplay/testing` harness. Docs: `packages/netplay/README.md`, `AGENTS.md`.
- `@agentstack/netplay`: several winners — `Outcome.winners` (teams, shared wins), `MatchResult.winners` (ids), `outcomeWinners` / `isWinner` / `resultWinners` / `normalizeOutcome`; `seriesScore` counts a shared win for each winner.
- `@agentstack/netplay`: audience commands — `GameDef.audience { input, apply, from? }` + `Session.audience(value)` (bets / cheers / votes from spectators, `aud` entries; old clients ignore them, no room-script change).
- `@agentstack/netplay`: background tab — `Session.away(hidden)`, `{ k: 'away' }` entry, `PlayerInfo.hidden`; `/ui` `bindVisibility(session)`. The room stops waiting for a hidden tab at once, `netStatus` raises no alarm for it, `forfeit` still applies after `presenceMs`.
- `@agentstack/netplay/ui` match bar: teams (`team`, `teamName`: grouped chips, team series, a team win is «You won!» for every member), `winners` / `stepped` labels (ru/en/pt), `MATCH_BAR_CSS`.

### Fixed

- `@agentstack/netplay`: a full room (`ROOM_FULL`, `LOG_FULL`) is its own issue `full` («Комната заполнена — откройте новую», ru/en/pt) instead of «no connection»; the generated room's rate window is `const` (lint).
- `@agentstack/netplay` StackScript transport: `RETRY` (room CAS conflict) now waits a jittered backoff (`conflictDelayMs`, options `conflictRetries` / `conflictBackoffMs`) and sends a fresh idempotency key per attempt (was: 3 immediate repeats with the same key).
- `@agentstack/netplay/ui` match bar: `.np-bar{display:flex}` overrode `[hidden]`, so a `quiet` strip never hid (a second player list on phones). Games that patched it with their own `.np-bar[hidden]` CSS can drop the patch.

## [0.4.21] - 2026-10-03

### Changed

- Aligned `@agentstack/sdk`, `@agentstack/react`, and `@agentstack/hooks` with platform **0.4.21** (`AGENTSTACK_CORE_VERSION` via `sync:agentstack-version`).

## [0.4.18] - 2026-09-08

### Changed

- Aligned `@agentstack/sdk`, `@agentstack/react`, and `@agentstack/hooks` with platform **0.4.18** (`AGENTSTACK_CORE_VERSION` via `sync:agentstack-version`).

## [0.4.13] - 2026-05-28

### Added

- **Git submodule consumer:** `scripts/submodule-add-sdk.mjs`, `link-sdk-deps.mjs`, `doctor-sdk-submodule.mjs`, `sdk.lock.json` — [docs/SUBMODULE_CONSUMER.md](docs/SUBMODULE_CONSUMER.md), [docs/sdk/SDK_SUBMODULE_INTEGRATION.md](../docs/sdk/SDK_SUBMODULE_INTEGRATION.md)
- **Project context:** `sdk.getProjectId()`, `requireProjectId()`, `updateProjectId()`, login → HTTPClient sync, [docs/PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md)
- **Integrator scope:** `SDKConfig.sdkAudience` (`integrator` default, `platform_operator` for AgentStack ops); guards on `sdk.admin`, `sdk.platform.adminData`, `/api/admin/*` HTTP; admin modules omitted from `getModuleCatalog()` for integrators; [docs/INTEGRATOR_SCOPE.md](docs/INTEGRATOR_SCOPE.md); `assertIntegratorModule()` in AI preflight
- `resolveAgentStackApiBase()` and production URL constants (`agentstack.tech`)
- `AGENTS.md`, AI Application Factory / integrator guides, `llms.txt`
- `getModuleCatalog()` documentation (`docs/SDK_MODULE_CATALOG.md`)
- Subpath exports: `@agentstack/sdk/capability-tasks`, `@agentstack/sdk/manifest`
- AI preflight: `validateAppManifest`, `assertModuleEnabled`, `listRegisteredTaskPorts`
- CI guards: `check:docs-urls`, `check:package-exports`, `check:docs-api-symbols`
- Examples under `examples/ai/`
- Mirror runbook: `docs/sdk/SDK_MIRROR_PUBLISH_RUNBOOK.md`

### Changed

- Docs/examples: production API `https://agentstack.tech/api` everywhere; removed misleading Docker deployment section; legacy hosts and broken doc TOC links fixed; `check-docs-urls` guards legacy hosts, bare `localhost:8000`, and missing `/api` on production origin
- Default integrator API base is production (`https://agentstack.tech/api`)
- GitHub repository metadata → `agentstacktech/agentstack-sdk`
- README project API examples use `sdk.platform.api` (not misleading `sdk.projects.get`)

## [1.1.0] - 2025-02-23

### Added

- AgentStackSDK core class with modular architecture
- AgentAuth, AgentAPI, AgentNeural, AgentDocs, AgentPayments, AgentAnalytics
- AgentWebhooks, AgentScheduler, AgentNotifications, AgentWallets
- AgentInvoices, AgentBilling, AgentRBAC, AgentI18n
- AgentDNA, AgentLogic, AgentCommand, AgentMarketplace
- AgentAssets, AgentGlobalAssets, AgentBuffs
- Protein system: AgentProtein, ProteinResponseProcessor, PageCompositionSystem, GameDataSystem
- FileStorageIntegration for DNA and Protein
- ESM and CJS builds with TypeScript declarations
- React peer dependencies (optional)

### Changed

- Unified Python SDK naming: `pip install agentstack`, `from agentstack import AgentStackSDK`

### Fixed

- N/A

## [1.0.0] - 2025-01-15

### Added

- Initial release
- Core HTTP client with retry and caching
- Basic auth and API modules

[1.1.0]: https://github.com/agentstacktech/agentstack-sdk/releases/tag/v1.1.0
[1.0.0]: https://github.com/agentstacktech/agentstack-sdk/releases/tag/v1.0.0
