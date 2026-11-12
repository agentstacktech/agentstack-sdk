# @agentstack/netplay — API reference

Everything public, with signatures and defaults. Types live in `src/types.ts` (every field has a doc comment).
Entry points: `@agentstack/netplay` (core), `@agentstack/netplay/testing` (test harness), `@agentstack/netplay/ui` (optional DOM lobby).

## `defineGame<State, Input, View = State>(def): Game`

Validates `def` and fills defaults. Throws (`defineGame: …`) on: `id` not `[a-z0-9-]`, `version` not an integer ≥ 1,
seats not `1 ≤ min ≤ max ≤ 64`, missing `step` (lockstep) / `apply` (fold, authority), authority without `view`,
`clockMs` without `clock` or in lockstep, `secret` outside lockstep.

| Field | Type | Default | Notes |
|---|---|---|---|
| `id` | `string` | — | `[a-z0-9-]`; room ids, script ids, matchmaking queues |
| `version` | `number` | — | bump on any rule change; different versions never sit together |
| `seats` | `{ min, max }` | — | join order = seat order |
| `mode` | `'lockstep' \| 'fold' \| 'authority'` | — | see README table |
| `setup(ctx)` | `(SetupCtx) => S` | — | `ctx = { seed, seats, rng, params }` |
| `input(raw, seat, state)` | `=> I \| undefined` | — | hostile `raw`; return typed input or `undefined` |
| `step(state, inputs, ctx)` | lockstep | — | `inputs[seat]` (idle for silent seats); mutate or return new |
| `apply(state, seat, input, ctx)` | fold / authority | — | one command, log order |
| `clock(state, now, ctx)` | optional | — | deadlines; called with server time before each entry |
| `clockMs` | `number` | presence beat | fold/authority: min interval of `clock` entries while playing (≥ 250) |
| `outcome(state)` | `=> Outcome \| null` | never ends | `{ winner: seat \| -1, ranks?, reason? }` |
| `view(state, seat)` | `=> V` | identity | authority: must strip secrets; `seat -1` = spectator |
| `hash(state)` | `=> number` | canonical FNV-1a | provide a fast one for big/class states |
| `idle` | `I` | `null` | lockstep input for a silent seat |
| `secret` | `boolean` | `false` | lockstep commit–reveal |
| `hashEvery` | `number` | 30 (1 if `secret` or `turnMs ≥ 1000`) | lockstep desync check period, 0 = off |
| `timeouts.presenceMs` | `number` | 20000 | silent seat → `away` |
| `timeouts.turnMs` | `number` | none | lockstep: max wait for one tick/turn |
| `timeouts.onTimeout` | `'idle' \| 'forfeit'` | `'idle'` | `forfeit` ends a 2-seat match when a seat goes away/leaves |
| `timeouts.hostGraceMs` | `number` | 60000 | authority: host away → wait this long for it to return (reconnect / reload with the same `secretSeed`), then end as `host-lost`; host `leave()` ends at once (`host-left`) |

**`StepCtx`** (`step`, `apply`, `clock`): `{ tick, now, seed, rng, absent: boolean[] }` — `tick` = lockstep tick or command index.

**`Rng`** (`ctx.rng`, `createRng(seed)`): `int(n)` → `[0, n)`, `float()` → `[0, 1)`, `u32()`, `pick(arr)`, `shuffle(arr)` (in place),
`save()` → `RngState` (`createRng(saved)` continues). `ctx.rng` is derived per tick: no state to store. Helpers: `deriveSeed(seed, ...ints)`,
`seedFromString(s)`, `mix32(x)`, `hashState(v)`, `hashString(s)`, `canonicalJson(v)`.

**Errors:** `defineGame` throws `defineGame: …` for a bad id/version/seats, a missing `step`/`apply`/`view` for the mode, `clockMs` without `clock`, `secret` outside lockstep, any negative/NaN number (`hashEvery`, `clockMs`, `timeouts.*`) and an unknown `onTimeout`. Runtime rejections never throw: they land in `snapshot.notice`.

## `createSession(game, options): Session`

| Option | Default | Notes |
|---|---|---|
| `transport` | — | `memoryHub().transport(user)`, `stackscriptTransport(runner, opts)`, `pollingTransport(api)`, `wssTransport(opts)` |
| `room` | — | room id (quick-match ticket, `roomIdFor(game, code)`, any string) |
| `name` | user id | shown in the lobby |
| `spectate` | `false` | watch even if a seat is free (a full or running room makes you a spectator anyway) |
| `params` | `{}` | room params; only the first player's count (`setup` gets them) |
| `autoPumpMs` | `0` | `> 0` = call `update()` on a timer; `0` = **you** call `update()` from your loop |
| `inputDelay` / `maxAhead` | 2 (0 if `secret` or `turnMs`) / 8 | lockstep latency tuning |
| `now` | `Date.now` | inject virtual time in tests |
| `secretSeed`, `salt` | crypto | authority seed / commit salts (persist `secretSeed` if the host must survive a reload) |
| `allowPublicViews` | `false` | authority over a transport without private entries |
| `keepLog` | `true` | keep `session.log` for replays and desync recovery |
| `autoResync` | `true` | on a desync where our hash is not the majority, re-fold from the log (≤ 3 per match); the next agreeing checkpoint clears `desync` for all |

| Member | Returns | Notes |
|---|---|---|
| `join()` | `Promise<void>` | connect + `hello`; resolves when connected (seat comes with the next snapshot) |
| `subscribe(fn)` | unsubscribe | `fn(snapshot)` after every batch of entries |
| `snapshot` | `Snapshot` | see below |
| `input(value)` | `boolean` | `false` = not sent: not playing / spectator / fails `game.input` locally (fold, and the authority host) / lockstep too far ahead / secret already committed this tick. `true` = queued; **sent on the next `update()`** (or `autoPumpMs`) |
| `ready()` | — | lobby vote; the match starts when the room is full, or when ≥ `min` seated and all ready |
| `rematch()` | — | only in `over`; new match when every **present** seat voted (`away`/`left` seats are dropped; in authority the new seat 0 hosts) |
| `leave()` / `close()` | — | `leave` = tell the room (lobby seat freed, in-game forfeit); `close` = drop the link |
| `update()` | — | flush queued inputs, heartbeats, `clock` entries, reconnects |
| `onStep(fn)` / `confirmed(tick)` | | lockstep: hook your own render loop |
| `resync()` | `boolean` | rebuild `model` from `log` (false if `keepLog: false`); fixes a locally corrupted state, not different code |
| `seat`, `model`, `log`, `game` | | low-level access |

**`Snapshot`**: `{ room, self, seat (-1 spectator), phase: 'lobby'|'playing'|'over', match, players: PlayerInfo[], spectators, tick,
state (null on non-authority clients in authority mode), view, outcome (null while playing), desync (null = in sync), rematch: seat[],
notice (last rejection / protocol hint, string|null), hostWaitMs (authority: ms left before `host-lost`, null = host present), connection: 'idle'|'connecting'|'online'|'reconnecting'|'offline' }`.
`PlayerInfo = { id, seat, name, status: 'on'|'away'|'left', ready, lastT }`.

**What to show the player:** `netStatus(snapshot)` → `null` (all good) | `{kind:'offline'}` | `{kind:'reconnecting'}` | `{kind:'host-away', seconds}` | `{kind:'player-away', names}` | `{kind:'desync'}` (priority in that order).
Ready-made pill: `mountNetStatus(session, { labels?: NET_STATUS_LABELS.ru, parent? })` → `{ el, destroy }` from `@agentstack/netplay/ui` (hidden while all is well).

## Private rooms & lobby (`createLobby`)

`roomCode()` → `'K7MQ2X'` (alphabet without 0/O/1/I/L) · `parseRoomCode(text)` accepts `k7mq 2x`, `K7MQ-2X` or a pasted invite link → code | null ·
`roomIdFor(game, code)` · `inviteLink(code, base = location.href, param = 'join')` · `codeFromUrl(url)`.

`createLobby({ game, connect(room, code) => Session, onStart?(session, code), baseUrl?, param? = 'join' })` → controller:
`state: LobbyState`, `subscribe(fn)`, `create()` → code, `join(text)` → boolean, `joinFromUrl(url?)` → code | null, `start()`, `cancel()`, `back()`, `session`.
`LobbyState = { screen: 'menu'|'waiting'|'playing'|'error', code, link, host, players, min, max, ready, canStart, error: 'bad-code'|'offline'|'version'|null }`.
A full/running room is not an error: you watch as a spectator (`session.seat === -1`). Optional UI: `mountLobby(el, lobby, { labels: LOBBY_LABELS.ru, title, note?, onClose?, hideOnStart? = true })` → `{ el, show, hide, destroy }` from `@agentstack/netplay/ui`.

## Transports & matchmaking

`memoryHub({ latencyMs = 0, jitterMs = 0, manual = true, privateEntries = true, seed })` → `{ transport(user), advance(ms), settle(), disconnect(user), block(user), allow(user), log(room), now }`
(`manual: false` = real timers, for a browser demo). `stackscriptTransport(runner, { scriptId, exportPrefix, version? = 'live', intervalMs? = 400, maxErrors? = 6, maxBackoffMs? = 5000 })` with
`runner = sdk.stackscript(projectId, { hostedMcp: true })`. `createMatchmaker(stackscriptRoomApi(runner, opts))` → `quickMatch(game, seats)` → `{ room }`, `privateRoom(game)`.

### Hosted MCP runner (games without @agentstack/sdk)

`hostedMcpRunner({ projectId, origin? = '', token?, fetch? })` → a `ScriptRunner` that POSTs JSON-RPC `tools/call agentstack.execute { action: 'script.run' }` to `${origin}/s/${projectId}/mcp` with the page's `hosted_app` cookie (`credentials: 'include'`) and, when `token()` returns one, `Authorization: Bearer`. On HTTP 401 with a token it re-mints the cookie once (`POST /api/hosted-apps/{pid}/session`) and retries. Replies are unwrapped from `result.structuredContent` or `result.content[0].text` (`unwrapHostedReply`).
Failures throw `NetplayError { kind, code, retryAfterMs? }` — `errorKind(code, httpStatus)`: `auth` (401/403, auth_required, unauthorized, session_user_required, relogin_required, room-script `AUTH`), `rate` (429, rate_limit_exceeded, rate_limited, `RATE_LIMIT`, `*quota*`), `not-published` (script_not_found), `offline` (network, 5xx), `server` (anything else).
`pollingTransport` reacts: `rate` → waits `max(retry_after_ms, backoff)` without counting it as a dead link (`onStatus('reconnecting', 'rate')`); `auth` / `not-published` → `onStatus('offline', kind)` and closes. The session keeps the reason in `snapshot.issue` (`'auth' | 'rate' | 'not-published' | null`), retries auth / not-published every ≥15 s, and `netStatus()` returns `sign-in` / `busy` / `unavailable` (labels `signIn`, `busy`, `unavailable` in `NET_STATUS_LABELS`; lobby errors `sign-in`, `unavailable`). `minPollMs` (polling option) caps after-send polls.

**Request budget.** `stackscriptTransport` defaults to `sendEveryMs: 100` (a `TransportCaps` hint; session option `sendEveryMs` overrides): realtime lockstep inputs are batched and flushed at most every 100 ms and never while the previous request is still on the wire; hash checks ride along. One flush = one `room.append` call with up to 16 entries (`items`) that also returns everything new since our cursor (`after`) — the timer poll is skipped while those piggybacked reads keep us fresh. Measured in `test/hosted.test.ts` (30 Hz lockstep, per client): 50 req/s → 9.8 req/s at 40 ms RTT, 13.4 req/s with stalls → 6.1 req/s with none at 150 ms RTT. The room script counts its `ratePer10s` per entry. `RETRY` (two players appended at the same instant) is repeated by `stackscriptRoomApi` up to 3 times.

### Dev relay — DEV ONLY (two windows / devices on one LAN, no server)

`npm run dev-relay` (= `node tools/dev-relay.mjs --lan`; prints the LAN URLs) and on the client `devRelayTransport(url, user, pollingOptions?)` (poll 150 ms). Plain Node `http`, memory only, **no auth** (the client names itself), private `to` entries enforced, CORS `*`, 64 KB body cap. Never deploy it; production = `stackscriptTransport` + the published room script. Games: `?net=dev&relay=http://<lan-ip>:8787`.

## Room script generator

`generateRoomScript(game, { prefix = id, maxBody = 4000, ratePer10s = 120, maxUsers = max + 8, chunk = 64, pollLimit = 256, lobbyTtlMs = 120000 })` → TypeScript source
(exports `<prefix>.room.join|append|poll`, `<prefix>.lobby.find`). CLI: `npm run gen:room -- <id> <min> <max> [version] [prefix]`. Publishing = platform action, owner approval.

## Testing (`@agentstack/netplay/testing`)

`await createTable(game, { players = seats.max, spectators = 0, latencyMs, jitterMs, frameMs = 16, room, session: {...}, ready = players < max, waitPlaying = true })`
→ `{ hub, clients, run(ms, frame?), runToEnd(frame?, maxMs?), snaps() }`. Resolves once every player sees `playing` (so you can `input` at once);
`run` calls `update()` on every client each frame. Users are `u1…`, spectators `s1…`.
`loadRoomScript(source)` (sync) → runtime; `scriptServer(rt, prefix)` → `{ transport(user), pump() }` — `pump()` delivers everything synchronously; call it after `join`/`input`/`update`.
`fakeHostedMcp(rt, { projectId, scriptId, tokens?, now?, rateLimitPerSec?, retryAfterMs?, mcpAcceptsBearer? })` → `{ fetch, browser(signedInUser?), stats }`: the hosted endpoints with recorded envelopes (guest 401 `auth_required`, mint 401/200, 429 `rate_limit_exceeded` + `retry_after_ms`, `script_not_found`, idempotent replays) around a `loadRoomScript` runtime — pass `browser('alice')` as `hostedMcpRunner({ fetch })` for contract tests; `stats` counts requests per export / user. `hostedFixture(source, { projectId, scriptId, exportPrefix }, fakeOptions?)` → `{ rt, fake, transport(user, pollingOptions?) }` wires it in one line.
`microtasks()` lets pending promises run between virtual frames. `seatOf(table, i)`.
`await sendRaw(table, i, { k: 'cmd', d: … })` = a hacked client i (bypasses its local `input()` check; `m` defaults to the current match) — assert that everyone rejects it (`snapshot.notice` matches `/rejected/`).

## Bundle size (esbuild, minified, gzip -9; measured at 1e8468e)

| Import | min | gzip |
|---|---|---|
| typical game: `defineGame`, `createSession`, `stackscriptTransport` | 21.5 KB | 7.7 KB |
| + `memoryHub`, `createLobby`, `/ui` `mountLobby` + `mountNetStatus` | 32.4 KB | 12.0 KB |
| everything from `.` | 35.2 KB | 12.5 KB |
| `/ui` alone | 12.7 KB | 4.8 KB |
| `generateRoomScript` alone (build-time) | 6.4 KB | 2.3 KB |

No runtime dependencies; `sideEffects: false`, so unused transports/generator are tree-shaken.
