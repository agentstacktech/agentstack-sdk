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

## A new multiplayer game in 10 minutes (followed step by step, 2026-11-12)

Starting point: [examples/starter.ts](examples/starter.ts) — «21» (add 1–3 in turns, exactly 21 wins) with lobby, board and match bar in 67 lines, styled by the default theme (`applyTheme()`).
Tested by doing exactly these steps in an empty folder (`test/starter.test.ts` checks the same game headless).

1. **Project** (Node ≥ 20):
   ```bash
   mkdir my-game && cd my-game && npm init -y && npm pkg set type=module
   npm i -D vite typescript vitest
   (cd <sdk>/packages/netplay && npm i && npm run build)   # until the package is on npm
   npm i <sdk>/packages/netplay
   mkdir src && cp <sdk>/packages/netplay/examples/starter.ts src/game.ts
   ```
2. **Imports** in `src/game.ts`: `'../src/index.js'` → `'@agentstack/netplay'`, `'../src/ui/index.js'` → `'@agentstack/netplay/ui'`.
   **Look**: `applyTheme()` (already the first line of `startStarter`) injects the default theme — dark page, centred card filling the viewport, big 64 px keys, score + turn line, and the lobby / match bar in the same colours. Markup: `.np-app › .np-stage › .np-title / .np-score / .np-meter>i / .np-sub / .np-keys>.np-key` (`.np-keys.np-live` = your move). Re-colour with CSS variables (`:root { --np-accent:#7cf; --np-page:#0a1020 }`), `applyTheme({ scheme: 'auto' })` follows the system light/dark setting. Without it your page is a bare white document — the SDK widgets only style themselves.
3. **Page** `index.html`:
   ```html
   <!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width">
   <div id="app"></div>
   <script type="module">import { startStarter } from './src/game.ts'; startStarter(document.getElementById('app'), 'ru');</script>
   ```
4. **Two players + a spectator on one screen** `two.html` (same-origin iframes share one in-page hub; no server). The **page** creates the hub: if the first iframe created it, reloading that iframe would take every room with it (the hub's code dies with its page):
   ```html
   <!doctype html><meta charset="utf-8"><style>body{margin:0;display:flex;gap:2px;height:100vh;background:#0b0806}iframe{flex:1;min-width:0;border:0}</style>
   <script type="module">
     import { memoryHub } from '@agentstack/netplay';
     window.__netplayHub = memoryHub({ manual: false, latencyMs: 40 });
     const add = (u) => document.body.insertAdjacentHTML('beforeend', `<iframe name="${u}" src="/?join=TEST42&user=${u}"></iframe>`);
     add('ana'); add('bruno'); setTimeout(() => add('zoe'), 3000);
   </script>
   ```
5. **Run**: `npx vite` → open `http://localhost:5173/two.html` (the port vite prints). Both seats fill → the match starts; ana's `+1 +2 +3` are live, the bar says «bruno думает…»/«ana думает…», zoe sees «Вы зритель». Reach 21 → «Победа» / «Вы проиграли», «Реванш (1/2)», then «Счёт 1:0». Alone: open `/` — the lobby shows a room code and an invite link (memory hub = same page only; for two devices see step 8).
6. **Test** `src/game.test.ts` (`npx vitest run`):
   ```ts
   import { expect, it } from 'vitest';
   import { createTable } from '@agentstack/netplay/testing';
   import { twentyOne } from './game';
   it('two players + spectator agree', async () => {
     const t = await createTable(twentyOne, { players: 2, spectators: 1, latencyMs: 30 });
     for (const n of [3, 3, 3, 3, 3, 3]) { t.clients[t.snaps()[0]!.state!.turn]!.input(n); await t.run(200); }
     t.clients[0]!.input(3); await t.run(200);                 // 18 + 3 = 21 → seat 0 wins
     expect(t.snaps().map((s) => s.outcome?.winner)).toEqual([0, 0, 0]);
   });
   ```
   (`starter.ts` touches `window`/storage only inside `startStarter`/`localTransport`, so the rules import fine in plain Node.)
7. **Make it yours**: change `S21`, `input` (reject everything illegal), `apply`, `outcome`; bump `version` on every rule change. Pick another `mode` from the table above if your game is realtime or has hidden info.
8. **Two devices on a LAN** (DEV ONLY): `npm run dev-relay` in the SDK, then in `startStarter(app, 'ru', (u) => devRelayTransport('http://<lan-ip>:8787', u))`.
9. **Production**: `generateRoomScript(twentyOne, { prefix: 'twentyone' })` → commit it + a test; transport = `stackscriptTransport(...)` (step 12 of the recipe). Publishing the room script needs the project owner's approval.

## Ports (fit an existing game without rewriting it)

| Existing seam | Adapter idea | Real example |
|---------------|--------------|--------------|
| `Transport.submit/poll` lockstep loop | drive it from `session.confirmed(tick)` | Serpent `NetplayLockstepTransport` |
| `NetAdapter.sendInputs/onBeat` | `session.input(packed)`; emit from `session.onStep` | THERMOMORPHS `NetplayBeatNet` |
| UI `MatchPort.view/submit/subscribe` | private views + event window in `view()` | Tribute `RemotePort` |
| Local game loop that steps its own board | `fold` with `{t, inputs}` commands; others replay | Stones `DuelLink` |

## Several players on one screen (local seats)

When the design says «play together on one screen» (shared keyboard, gamepads, touch zones) **and** online, use local seats instead of a second code path:

1. Offline same-screen = the same `step` with `seats = N` fed from N local input devices (no session at all).
2. Online + same screen = `createSession(game, { locals: ['Bia'] })` (or the lobby button: `mountLobby(…, { locals: { name } })`). `session.seats` lists every seat on this device; send `session.inputs([mine, bia])` each tick (lockstep) or `session.input(cmd, j)` (fold / authority).
3. Show each seat's **name and colour** next to its piece, and the **controls of each local seat** before the first move (keys / pad / touch zone).
4. Pause: offline same-screen may pause everything; online it never pauses the room (others keep playing) — show «you can't pause an online match» instead.
5. `secret` games: no local seats (one screen shows every hidden move); offer a pass-the-device screen offline instead.
Tests: `test/locals.test.ts` (lockstep, fold, authority views, presence, leave, rematch, the unchanged generated room script).

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

- **Who**: `localName(game)` → `id` for the transport user, `name` for `createSession({ name })` and `mountLobby({ nameField })`. Never seat by display name. Create it once per page (a duplicated tab swaps its copied id before the first `me.id` read); `await me.ready` before joining straight from an invite link.
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
| `src/ui/*` | `localName`, `mountLobby`, `mountMatchBar`, `mountNetStatus` (+ ru/en/pt labels) |
| `examples/starter.ts` | whole browser game in 67 lines: rules + lobby + board + match bar + theme (start here) |
| `src/ui/theme.ts` | `applyTheme()` / `themeCss()`: default look (dark / light / auto), `--np-*` variables |

## Platform notes (AgentStack, 2026-11)

- StackScript P2 (`defineCommand` + `ctx.dna`) is what the generator targets; no room `onTick` needed.
- Guest (no sign-in) script calls may return 401 on some projects; WSS upgrade may be refused (403) → use `stackscriptTransport` (polling).
- Use the SDK client as the `ScriptRunner`: `sdk.stackscript(projectId, { hostedMcp: true })` for players on a hosted page (cookie MCP), `sdk.stackscript(projectId)` with an API key for agents/servers; do not hand-roll fetch. Its `run()` already matches `ScriptRunner`.
- Exactly-once: every body carries the sender counter `n`; the reducer drops `n <= lastN[from]`, so transports may retry appends freely. Never strip `n` in a custom transport. One identity = one live session per room (two tabs as the same user share `from`, so the older tab's counter loses).
