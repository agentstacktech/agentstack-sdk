# AGENTS.md — building a multiplayer game with @agentstack/netplay

**Gene:** `sdk.netplay.gen1` · For humans start with [README.md](README.md). This file is the contract for AI agents. Every signature and default: [API.md](API.md) — read it instead of the source.

## Mental model (read first)

1. A **room** is an append-only log ordered by the server. Entry = `{seq, from, t, to?, body}`; the server sets `from` (user id) and `t` (ms).
2. Every client runs the **same pure reducer** (`reduceRoom`) over the log → same seats, phase, timeouts, rematch votes and (lockstep/fold) the same game state. There is no "host sync" step to write.
3. Your game is a **`GameDef`**: pure functions only. Anything not derived from `(state, inputs, ctx)` breaks determinism.
4. The server (generated StackScript, or any log relay) **never runs game rules**. Anti-cheat comes from every client re-validating every input, commit–reveal, and hashes.

## Pick a mode

| Your game | Mode | Notes |
|-----------|------|-------|
| Realtime, everyone acts every frame (shooter, co-op action) | `lockstep` | `idle` input for silent seats; `hashEvery` ~10–60; tune `inputDelay` |
| Simultaneous secret turns (RPS, formations, beats) | `lockstep` + `secret: true` + `timeouts.turnMs` | inputs revealed only when all committed; `idle` = "no move"; pass `secretStore: sessionStorage` so a reload after locking still reveals |
| Each player on their own board / race / async turns, open info | `fold` | `apply(state, seat, cmd)` in log order; replays verify scores |
| Hidden hands, fog of war, private dice | `authority` | seat 0 simulates; `view(state, seat)` must strip secrets; needs a transport with private entries; add `clock` + `clockMs` for timers/bots; persist `secretSeed` per room so a reloading host resumes; show `snapshot.hostWaitMs` ("host reconnecting…"); `timeouts.hostGraceMs` then ends as `host-lost`, the rest can rematch with a new host |

## Recipe: a new game from scratch (copy this order)

1. **Types**: `State` (plain JSON-able data or a class you control), `Input` (small, JSON).
2. **`defineGame`**: `id` (`[a-z0-9-]`), `version` (bump on any rule change), `seats`, `mode`, `setup`, `input`, `step`/`apply`, `outcome`.
3. **`input(raw, seat, state)`**: treat `raw` as hostile. Check type, range, whose turn, budget. Return the typed value or `undefined`.
4. **Randomness**: only `ctx.rng` (per-tick derived) or a seed from `ctx.seed`. Never `Math.random`/`Date.now` inside rules.
5. **Time**: `ctx.now` is server time of the entry. Timers in `authority`/`fold` go in `clock(state, now)`.
6. **`hash`**: default canonical hash is fine for plain data; provide a fast custom one for big/class states.
7. **Tests** (always all three):
   - unit: rules + `input` rejection cases; a hacked client via `sendRaw(table, i, body)` must be rejected by everyone (lockstep: its move becomes `idle` for that tick, the others don't wait);
   - e2e: `createTable(game, { players: 2, spectators: 1, latencyMs, jitterMs })` and assert `snaps()[1].state` equals `snaps()[0].state`, outcome agreed, `desync === null`;
   - server: `loadRoomScript(generateRoomScript(game, { prefix }))` + `scriptServer(rt, prefix)` with two sessions.
8. **Room script**: commit the generated file and a test that it equals the generator output. Publishing it is a platform action that needs the project owner's approval.
9. **Two real devices before the server exists**: `npm run dev-relay` + `devRelayTransport(url, user)` (DEV ONLY, no auth — never ship it as the production transport).
10. **Lobby**: private rooms = `createLobby({ game, connect, onStart })` (+ optional `mountLobby` from `/ui`); quick match = `createMatchmaker(...)`.
11. **UI**: render from `session.subscribe(snapshot)`; `input()` only queues — `update()` (or `autoPumpMs`) sends; for realtime loops use `onStep()` / `confirmed(tick)`; show connection trouble with `netStatus(snapshot)` (or the `mountNetStatus` pill from `/ui`); for an existing engine write a thin adapter (see "Ports" below).
12. **Production transport (`net=as`)**: `stackscriptTransport(sdk.stackscript(pid, { hostedMcp: true }) | hostedMcpRunner({ projectId: pid }), { scriptId, exportPrefix })`; contract-test it with `fakeHostedMcp(loadRoomScript(source), …)` and keep the request rate under the room's `ratePer10s` (count with `stats`).

See [test/recipe.test.ts](test/recipe.test.ts) — rock-paper-scissors built only from this file.

## Ports (fit an existing game without rewriting it)

| Existing seam | Adapter idea | Real example |
|---------------|--------------|--------------|
| `Transport.submit/poll` lockstep loop | drive it from `session.confirmed(tick)` | Serpent `NetplayLockstepTransport` |
| `NetAdapter.sendInputs/onBeat` | `session.input(packed)`; emit from `session.onStep` | THERMOMORPHS `NetplayBeatNet` |
| UI `MatchPort.view/submit/subscribe` | private views + event window in `view()` | Tribute `RemotePort` |
| Local game loop that steps its own board | `fold` with `{t, inputs}` commands; others replay | Stones `DuelLink` |

## Do / don't

- **Do** keep `input()` cheap — it runs on every client for every entry.
- **Do** make the authority's `view()` the only place secrets leave the host; add a test that scans the log for leaks.
- **Do** cap per-entry size (views ≤ the script's `maxBody`); encode big arrays compactly.
- **Do** use `session.ready()` when `min < max` seats (a full room starts by itself); `createTable` does it for you and resolves once `playing`.
- **Do** check `input()`'s boolean: `false` = refused locally (not playing, not your turn per `game.input`, spectator).
- **Don't** read `Date.now()` / `Math.random()` / DOM inside rules, or mutate state outside `step`/`apply`/`clock`.
- **Don't** trust `snapshot.view` on non-authority clients for anything but rendering.
- **Don't** assume join order = connect-call order: seats follow server order (`hello` entries).
- **Don't** publish/promote room scripts or touch live sites from an agent run without the owner's explicit approval.

## Match screen checklist (bugs found in real games, 2026-11-12)

Keep the screen a **presenter**: one pure function `snapshot → plain data` (stage, clock, names, rematch state), unit-tested; the DOM code only paints it.

- **Who**: `localName(game)` → `id` for the transport user, `name` for `createSession({ name })` and `mountLobby({ nameField })`. Never seat by display name.
- **Reload**: everything the screen shows must come from the log, not local flags. A «locked this round» flag must be keyed by `match` *and* round (a rematch restarts round 0 — a stale flag froze WT's form), or read `session.model.commits`. Secret games: `secretStore: sessionStorage`.
- **Late join / reload after the end**: wait for `phase !== 'lobby'`, not `=== 'playing'` — a finished room never plays again until a rematch.
- **Spectators** (`seat === -1`): hide inputs and the rematch button; say who won by name («Victory: Ana»), not «Defeat».
- **Rematch**: show the vote count, «your opponent wants a rematch», and when they left (`status === 'left'`) hide Rematch and offer «New room». Keep a series score by **player id** (seats can change after a rematch).
- **Clock**: `turnMs - (now - model.tickStartT)`; highlight the last 10 s; consider locking a legal pending move at the buzzer instead of losing the turn.
- **Errors**: map `input()` refusal codes to sentences in every language you ship.

## File map

| Path | Role |
|------|------|
| `src/types.ts` | public types (`GameDef`, `Entry`, `Body`, `Snapshot`, `Transport`) |
| `src/define.ts` | `defineGame` validation + defaults |
| `src/room.ts` | pure reducer `reduceRoom` / `foldLog` (lobby, phases, timeouts, lockstep, commit–reveal, hashes) |
| `src/session.ts` | client: join, inputs, batching, heartbeats/clock, reconnect, authority views |
| `src/rng.ts`, `src/hash.ts` | sfc32 RNG, seed derivation, canonical hashing |
| `src/transports/*` | `memory` (tests), `polling` (any HTTP log), `stackscript` (SDK client), `wss` |
| `src/matchmaking.ts` | quick match / private room codes (`<prefix>.lobby.find`) |
| `src/generator/roomScript.ts` | StackScript room referee generator |
| `src/testing/*` | `createTable`, `loadRoomScript`, `scriptServer`, `microtasks` |

## Platform notes (AgentStack, 2026-11)

- StackScript P2 (`defineCommand` + `ctx.dna`) is what the generator targets; no room `onTick` needed.
- Guest (no sign-in) script calls may return 401 on some projects; WSS upgrade may be refused (403) → use `stackscriptTransport` (polling).
- Use the SDK client as the `ScriptRunner`: `sdk.stackscript(projectId, { hostedMcp: true })` for players on a hosted page (cookie MCP), `sdk.stackscript(projectId)` with an API key for agents/servers; do not hand-roll fetch. Its `run()` already matches `ScriptRunner`.
- Exactly-once: every body carries the sender counter `n`; the reducer drops `n <= lastN[from]`, so transports may retry appends freely. Never strip `n` in a custom transport. One identity = one live session per room (two tabs as the same user share `from`, so the older tab's counter loses).
