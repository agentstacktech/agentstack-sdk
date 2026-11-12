# @agentstack/netplay

**Genetic tag:** `sdk.netplay.gen1` · **Status:** 0.1.0 (local branch `feat/netplay-sdk`, not published) · RU: [README_ru.md](README_ru.md) · Agents: [AGENTS.md](AGENTS.md) · Index: [AI_INDEX.md](AI_INDEX.md)

Game-agnostic multiplayer for deterministic games. You write the rules once as pure functions
(`defineGame`), netplay gives you rooms, lobby, seats, ready/rematch, timeouts, spectators,
reconnect, seeded RNG, desync detection and a generated StackScript room referee.

**One idea:** a room is a server-ordered, append-only log of small JSON entries. Every client folds
the same log with the same pure reducer, so every client computes the same lobby, the same seats and
the same game state. The server only orders entries and stamps who/when — no game code on the server.

| Mode | Use for | How state moves |
|------|---------|-----------------|
| `lockstep` | realtime (fixed tick) and simultaneous turns | `step(state, inputs[])` once every seat has an input for the tick; `secret: true` = commit–reveal |
| `fold` | races, async boards, open-information turn games | `apply(state, seat, cmd)` for each command in log order |
| `authority` | hidden information (cards, fog) | only seat 0 runs `apply`; others get private `view(state, seat)` |

## 5-minute quickstart

```ts
import { defineGame, createSession, memoryHub } from '@agentstack/netplay';

// 1. Rules: pure, deterministic, no Date.now / Math.random (use ctx.rng, ctx.now).
export const ticTacToe = defineGame<{ cells: number[]; turn: number }, number>({
  id: 'tic-tac-toe', version: 1, seats: { min: 2, max: 2 }, mode: 'fold',
  setup: () => ({ cells: Array(9).fill(-1), turn: 0 }),
  input: (raw, seat, s) => (Number.isInteger(raw) && s.turn === seat && s.cells[raw as number] === -1 ? (raw as number) : undefined),
  apply: (s, seat, cell) => { s.cells[cell] = seat; s.turn = 1 - seat; },
  outcome: (s) => {
    const L = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (const [a, b, c] of L) if (s.cells[a] >= 0 && s.cells[a] === s.cells[b] && s.cells[a] === s.cells[c]) return { winner: s.cells[a]!, reason: 'line' };
    return s.cells.every((x) => x >= 0) ? { winner: -1, reason: 'draw' } : null;
  },
});

// 2. A transport. memoryHub for tests/local; stackscriptTransport for AgentStack (below).
const hub = memoryHub({ manual: false, latencyMs: 40 });

// 3. A session per player.
const me = createSession(ticTacToe, { transport: hub.transport('alice'), room: 'demo', name: 'Alice', autoPumpMs: 50 });
await me.join();
me.subscribe((s) => render(s.phase, s.view, s.players, s.outcome)); // lobby → playing → over
me.input(4);       // validated locally and by every other client
me.rematch();      // after 'over', when all seats vote, a new match starts
```

### On AgentStack (StackScript room)

```ts
import { createHostedStackScriptClient } from '@agentstack/sdk';
import { generateRoomScript, stackscriptTransport, createMatchmaker, stackscriptRoomApi } from '@agentstack/netplay';

const source = generateRoomScript(ticTacToe, { prefix: 'ttt' }); // save as server/ttt-room.ts, publish with the platform tools
const runner = createHostedStackScriptClient({ /* your project config */ });
const opts = { scriptId: 'ttt-room', exportPrefix: 'ttt' };
const { room } = await createMatchmaker(stackscriptRoomApi(runner, opts)).quickMatch('tic-tac-toe', 2);
const s = createSession(ticTacToe, { transport: stackscriptTransport(runner, opts), room, autoPumpMs: 50 });
```

The generated script enforces auth, room membership, entry size, per-user rate limit, private `to`
entries, max users per room, chunked logs and lobby TTL. It needs no room `onTick`.

### Test it like a real match

```ts
import { createTable } from '@agentstack/netplay/testing';
const t = await createTable(ticTacToe, { players: 2, spectators: 1, latencyMs: 80, jitterMs: 40 });
t.clients[0]!.input(4); await t.run(500);
expect(t.snaps()[1]!.state).toEqual(t.snaps()[0]!.state);
```

`loadRoomScript(source)` + `scriptServer(rt, prefix)` run the generated StackScript in memory, so the
same test can go through the real referee.

## What you get

- **Lobby & seats** — join order = seat order; `min`/`max` seats; `ready()`; spectators (`spectate: true`).
- **Timeouts** — `presenceMs` (silent seat → away, `forfeit` ends a 2-seat match), lockstep `turnMs`, heartbeats.
- **Rematch** — `rematch()` votes; new seed per match (`match` counter in every entry).
- **Reconnect** — transports resume from the last seq; duplicates are ignored by the reducer.
- **Desync detection** — state hashes every `hashEvery` ticks (`hash` default: canonical FNV); `snapshot.desync`.
- **Determinism tools** — `ctx.rng` (sfc32, derived per tick), `deriveSeed`, `seedFromString`, `hashState`.
- **Anti-cheat** — every client re-runs `input()` validation; `secret` lockstep hides inputs until all committed; `authority` keeps hidden info on one machine and sends private views (needs a transport with private entries).
- **Latency** — lockstep input delay (`inputDelay`), `maxAhead`; `confirmed(tick)` / `onStep()` for your own render loop.

## Examples

- [examples/tic-tac-toe.ts](examples/tic-tac-toe.ts) — `fold`, forfeit on silence.
- [examples/tug-of-war.ts](examples/tug-of-war.ts) — `lockstep` realtime with hashes.

Games migrated onto this package (local branches `mp-suns-1`): Tribute (`authority`), Serpent (`lockstep` co-op, `fold` race),
Stones (`fold` duel), War Tactics (`lockstep secret` best-of-N), THERMOMORPHS (`lockstep secret` beats).

## Scripts

`npm test` (vitest) · `npm run typecheck` · `npm run gen:room -- <id> <minSeats> <maxSeats> [version] [prefix] > room.ts` (or `generateRoomScript(game, opts)` from code)
