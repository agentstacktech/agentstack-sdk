# @agentstack/netplay — API reference

Everything public, with signatures and defaults. Types live in `src/types.ts` (every field has a doc comment).
Entry points: `@agentstack/netplay` (core), `@agentstack/netplay/testing` (test harness), `@agentstack/netplay/ui` (optional DOM lobby, match bar, status pill, `bindVisibility`).

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
| `outcome(state)` | `=> Outcome \| null` | never ends | `{ winner: seat \| -1, winners?: seat[], ranks?, reason? }` — `winners` for teams / shared wins (see below) |
| `audience` | `{ input, apply, from? }` | none | commands from spectators (bets, cheers, votes), see «Audience commands» |
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
**Rejected lockstep inputs = `idle`.** An invalid `in` (fails `input()`), or a committed seat whose reveal does not match its commit, plays `idle` for that tick on every client, so a hacked client can only hurt itself, never stall the others. Malformed commits (non-integer `t`, non-number `h`) are ignored and do not take the seat's slot; entries more than `MAX_AHEAD_TICKS` (4096) ahead are dropped.

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
| `secretStore` | none | secret lockstep: a `Storage` (`sessionStorage`) that keeps the pending move + salt, so a tab reloaded after committing still reveals it. Without it that turn plays `idle`; `input()` returns `false` while our commit for the turn is already in the log |
| `allowPublicViews` | `false` | authority over a transport without private entries |
| `keepLog` | `true` | keep `session.log` for replays and desync recovery |
| `autoResync` | `true` | on a desync where our hash is not the majority, re-fold from the log (≤ 3 per match); the next agreeing checkpoint clears `desync` for all |

| Member | Returns | Notes |
|---|---|---|
| `join()` | `Promise<void>` | connect + `hello`; resolves when connected (seat comes with the next snapshot) |
| `subscribe(fn)` | unsubscribe | `fn(snapshot)` after every batch of entries |
| `snapshot` | `Snapshot` | see below |
| `input(value, local?)` | `boolean` | `false` = not sent: not playing / spectator / fails `game.input` locally (fold, and the authority host) / lockstep too far ahead / secret already committed this tick. `true` = queued; **sent on the next `update()`** (or `autoPumpMs`) |
| `ready()` | — | lobby vote; the match starts when the room is full, or when ≥ `min` seated and all ready |
| `rematch()` | — | only in `over`; new match when every **present** seat voted (`away`/`left` seats are dropped; in authority the new seat 0 hosts) |
| `leave()` / `close()` | — | `leave` = tell the room (lobby seat freed, in-game forfeit); `close` = drop the link |
| `update()` | — | flush queued inputs, heartbeats, `clock` entries, reconnects |
| `audience(value)` | `boolean` | an audience command (`game.audience`); `false` = no hook / not playing / a player without `from: 'all'` / rejected locally |
| `turnLeftMs()` | `number \| null` | lockstep with `turnMs`: ms left on this turn, skew-free (room log time + local time since it was seen); null when not playing / no clock. Use it for turn clocks and buzzers, never `Date.now() − model.tickStartT` |
| `away(hidden)` | — | the tab went to the background / came back (`bindVisibility(session)` from `/ui` wires it): hidden seats are `away` at once, nobody waits for them, no heartbeats; back = present again. `forfeit` still applies after `presenceMs`; while hidden, polling transports poll no faster than `hiddenPollMs` (3000) and poll at once on return |
| `onStep(fn)` / `confirmed(tick)` | | lockstep: hook your own render loop |
| `resync()` | `boolean` | rebuild `model` from `log` (false if `keepLog: false`); fixes a locally corrupted state, not different code |
| `seat`, `model`, `log`, `game` | | low-level access |

**`Snapshot`**: `{ room, self, seat (-1 spectator), phase: 'lobby'|'playing'|'over', match, players: PlayerInfo[], spectators, tick,
state (null on non-authority clients in authority mode), view, outcome (null while playing), desync (null = in sync), rematch: seat[],
notice (last rejection / protocol hint, string|null), hostWaitMs (authority: ms left before `host-lost`, null = host present), connection: 'idle'|'connecting'|'online'|'reconnecting'|'offline' }`.
`PlayerInfo = { id, seat, name, status: 'on'|'away'|'left', ready, lastT, owner?, local?, hidden? }` (`hidden` = away because its tab is in the background, not a lost connection: `netStatus` raises no alarm for it, the match bar says «stepped away»).
`MatchResult = { match, winner: id | '', winners?: id[], reason? }` (`winners` only when the outcome had several).

**What to show the player:** `netStatus(snapshot)` → `null` (all good) | `{kind:'offline'}` | `{kind:'reconnecting'}` | `{kind:'host-away', seconds}` | `{kind:'player-away', names}` | `{kind:'desync'}` (priority in that order).
Ready-made pill: `mountNetStatus(session, { labels?: NET_STATUS_LABELS.ru, parent? })` → `{ el, destroy }` from `@agentstack/netplay/ui` (hidden while all is well).

## Local seats (several players on one device, mixed with remote players)

One device can hold **several seats**: friends on one screen (shared keyboard, several gamepads, touch zones) play in the same room as remote players. Nothing changes on the server: the extra seats ride on the device's member (same login, same request budget), the reducer seats them.

| API | What it does |
|---|---|
| `createSession(game, { locals: ['Bia'] })` | extra players on this device (max 3); each takes a seat right after mine while the table has room |
| `session.setLocals(names)` | lobby only: replace this device's extra players (`[]` removes them); `false` outside the lobby |
| `session.seats` / `snapshot.seats` | every seat played here: mine first, then the local seats in local order |
| `snapshot.players[i].owner` / `.local` | a local seat: the member id of its device, and its index there (1, 2, …) |
| `session.inputs([mine, local1, …])` | lockstep: this tick's input for every seat here, one entry (missing = `idle`) |
| `session.input(cmd, j)` | fold / authority: a command as local seat `j` (validated as that seat) |
| `session.inputAll(cmd)` | fold / authority: the same command for every seat here in **one** entry (`a: 1`; e.g. a clock report) — per-seat `input(cmd, j)` costs one entry per seat against the room rate limit |
| `session.viewFor(seat)` | authority: the view of one of my seats (the host sends each device its local seats' views) |
| `session.leaveLocal(j)` | only local seat `j` leaves; `leave()` takes the device with all its seats |
| `mountLobby(…, { locals: { name: (j) => 'Player ' + (j + 1) } })` | waiting screen: «+ Player on this device», «same screen» tags, remove buttons |
| `seatTag(p, self, seated, labels)` | the lobby tag (pure): « (you)», « · same screen» on my device, « · on Ana's screen» on the others (`labels.withOwner`) |
| `matchBar(…)` | local seats of this device count as `you` (no «thinking…», never «asked for a rematch») |

Rules: local seats share their device's presence (they go away and come back together); one `ready()` / `rematch()` from the device counts for all its seats; a device that omits a local seat's batch plays `idle` there (it cannot stall the room). **Not for `secret` games** (`locals` is ignored): one screen would show every hidden move — use a pass-the-device flow instead.

## Several winners and teams (`Outcome.winners`)

Return `{ winner: 0, winners: [0, 2], reason: 'team' }` from `outcome` when a team (2 on 2), a co-op group or a joint first place wins together. `winners` takes precedence over `winner` (which stays the first winner, or -1 for `[]`); every client stores the same normalized value (integer seats in range, no duplicates).

| API | What it does |
|---|---|
| `outcomeWinners(o)` / `isWinner(o, seat)` | read both forms (single `winner` or `winners`) |
| `resultWinners(r)` | every winner id of a `MatchResult` |
| `seriesScore(snapshot, id?)` | a shared win counts as `mine` for each winner |
| `matchBar(…, { team: (seat) => seat % 2, teamName: (t) => (t ? '☾' : '☀') })` | teammates listed together with their team sign, series per team, «You won!» for every member of the winning team, «Winner: ☀» for spectators; without `team`, spectators read «Winners: Ana, Caio» |

Migration: nothing to do for single-winner games. Team games that returned one seat of the team (and relabelled `lose`) can return `winners` instead and drop the workaround.

## Audience commands (`GameDef.audience`: bets, cheers, votes)

```ts
audience: {
  input: (raw, who, state) => (raw === 0 || raw === 1 ? raw : undefined), // who = { id, seat: -1 for spectators }
  apply: (state, who, pick) => { state.bets[who.id] = pick as number; },
  from: 'spectators', // default; 'all' lets players send them too
}
// a spectator's screen:
session.audience(1); // → false when there is no hook, the match is not running, or the game rejects it
```

Kept apart from player commands: no seat, no tick, never waited for, never blocks anyone. Every client that holds the state (fold / lockstep: all; authority: the host, which receives them privately) validates and applies them at their place in the log, so everyone agrees and desync hashes cover them. lockstep games that step their own world from `confirmed(t)` must read the audience part from `session.model.state`. Old clients (before this field) ignore `aud` entries; the room script needs no change.

## Simultaneous phase with a deadline (`openPhase` …, fold / authority)

Plain data kept in your state; every function is pure and returns a new value.

| Function | Meaning |
|---|---|
| `openPhase(now, needs, ms)` | new phase: `needs` = seats that act, `ms` = limit (0 = no clock) |
| `readyPhase(p, seat)` / `unreadyPhase(p, seat)` | mark a seat done / undo before the reveal |
| `touchPhase(p, now, graceMs)` | an input with < `graceMs` left stretches the clock once to `graceMs` |
| `phaseLeft(p, now)` | ms left, or `null` without a clock |
| `phaseTimedOut(p, now, slackMs?)` | the clock ran out (+ optional on-screen slack) |
| `phaseWaiting(p, absent?)` | seats still thinking (absent seats never wait) |
| `resolvePhase(p, now, absent?)` | `'all-ready'` / `'timeout'` (apply defaults) / `null` |
| `phaseDone(p, seat)` | for `mountMatchBar({ done })`: ready / thinking / not acting |
| `turnSeconds(raw, fallback, max?)` · `TURN_CHOICES` | sanitize `params.turnS`; `[0, 30, 60, 90]` |

UI (`@agentstack/netplay/ui`): `mountLobby(…, { choices: [turnChoice(LOBBY_LABELS.ru, 60)] })` — the room creator picks the timer before «Create»; the waiting screen shows the room's value to everyone (`choiceLine(choice, session.model.params)`).

## Private rooms & lobby (`createLobby`)

`roomCode()` → `'K7MQ2X'` (alphabet without 0/O/1/I/L) · `parseRoomCode(text)` accepts `k7mq 2x`, `K7MQ-2X` or a pasted invite link → code | null ·
`roomIdFor(game, code)` · `inviteLink(code, base = location.href, param = 'join')` · `codeFromUrl(url)`.

`createLobby({ game: myGame.id, connect(room, code) => Session, onStart?(session, code), baseUrl?, param? = 'join' })` → controller:
`state: LobbyState`, `subscribe(fn)`, `create()` → code, `join(text)` → boolean, `joinFromUrl(url?)` → code | null, `start()`, `cancel()`, `back()`, `session`.
`LobbyState = { screen: 'menu'|'waiting'|'playing'|'error', code, link, host, players, min, max, ready, canStart, error: 'bad-code'|'offline'|'version'|null }`.
A full/running room is not an error: you watch as a spectator (`session.seat === -1`). Optional UI: `mountLobby(el, lobby, { labels: LOBBY_LABELS.ru, title, note?, onClose?, hideOnStart? = true, nameField? })` → `{ el, show, hide, destroy }` from `@agentstack/netplay/ui`.
**Theme:** `applyTheme({ scheme?: 'dark'|'light'|'auto', doc? })` (`/ui`) injects `<style id="np-theme-css">` first in `<head>` (your CSS wins): page background, `.np-app` / `.np-stage` card, `.np-title`, `.np-score`, `.np-meter>i`, `.np-sub`/`.np-turn`, `.np-keys>.np-key` (64 px; `.np-keys.np-live` = accent), and the variables the lobby + match bar read (`--np-page`, `--np-surface`, `--np-bg`, `--np-fg`, `--np-muted`, `--np-line`, `--np-accent`, `--np-accent-fg`, `--np-font`, `--np-radius`). `themeCss(scheme)` returns the CSS string (SSR / your own file).
**Match bar:** `mountMatchBar(session, { labels: MATCH_BAR_LABELS.ru, kind?: 'versus'|'coop', done?(seat), detail?(seat), clock?(), reason?(outcome), pace?: 'turns'|'race', endPanel?, position?: 'top'|'bottom', quiet?, onNewRoom?, onMenu? })` (`/ui`) — players with thinking / ready / no connection / left, turn clock (red under 10 s), series, «You are watching»; at the end: result, «Rematch (1/2)», «Аня wants a rematch», blocked when too few players, New room, Menu. 48 px buttons, one polite live region. `endPanel: false` keeps your own result screen (the vote and New room sit in the strip); `quiet` shows the strip only for a spectator, an away/left player or the end. Teams: `team?(seat)`, `teamName?(t)` (see «Several winners and teams»). The strip and the end panel honour `[hidden]` (`.np-bar[hidden]{display:none!important}`), so a `quiet` strip really disappears — games no longer need their own CSS for it. `MATCH_BAR_CSS` is the injected stylesheet. `matchBar(snapshot, options)` is the pure presenter — test it instead of the DOM.

**Own loop + reload (lockstep):** `createSession(game, { keepHistory: true })` keeps every confirmed row of the match, so a game that steps its own world can rebuild it after a reload / late join: `while ((row = session.confirmed(w.tick))) step(w, row)`. Without it only the last 1024 rows are kept.

**Series:** `snapshot.results` = every finished match in the room `{ match, winner: playerId | '', reason }`, folded from the log (same for players, spectators and a reloaded tab). `seriesScore(snapshot, id = me)` → `{ mine, theirs, draws, played }`. Count by player id, never by seat.

**Names:** `localName(game, { params? })` (`/ui`) → `{ id, name }`: `id` = stable per tab (`P-7K2M`, or `?user=`) — use it as the transport user on memory / dev-relay; `name` = display name the player may change, remembered in `localStorage` (≤ 24 chars, cleaned). Pass `name: me.name` to `createSession` and `nameField: me` to `mountLobby` for a «Your name» field. Never use the display name as an id (two «Саша» would share a seat). «Duplicate tab» copies sessionStorage: on load the copy asks the live tabs over a `BroadcastChannel` and takes a fresh id if one of them already holds it; a reload or a tab the browser restored after killing it keeps its id (nobody answers). Call `localName` once per page, early (module load), and read `me.id` only when you open the session — the id is frozen from that first read. The live tab answers asynchronously: a page that joins at once (invite link) must `await me.ready` first (resolves at once for a new tab or `?user=`, else on the answer or after `waitMs` = 150 ms).

## Transports & matchmaking

`memoryHub({ latencyMs = 0, jitterMs = 0, manual = true, privateEntries = true, seed })` → `{ transport(user), advance(ms), settle(), disconnect(user), block(user), allow(user), log(room), now }`
(`manual: false` = real timers, for a browser demo). `stackscriptTransport(runner, { scriptId, exportPrefix, version? = 'live', intervalMs? = 400, maxErrors? = 6, maxBackoffMs? = 5000 })` with
`runner = sdk.stackscript(projectId, { hostedMcp: true })`. `createMatchmaker(stackscriptRoomApi(runner, opts))` → `quickMatch(game, seats)` → `{ room }`, `privateRoom(game)`.

### Hosted MCP runner (games without @agentstack/sdk)

`hostedMcpRunner({ projectId, origin? = '', token?, fetch? })` → a `ScriptRunner` that POSTs JSON-RPC `tools/call agentstack.execute { action: 'script.run' }` to `${origin}/s/${projectId}/mcp` with the page's `hosted_app` cookie (`credentials: 'include'`) and, when `token()` returns one, `Authorization: Bearer`. On HTTP 401 with a token it re-mints the cookie once (`POST /api/hosted-apps/{pid}/session`) and retries. Replies are unwrapped from `result.structuredContent` or `result.content[0].text` (`unwrapHostedReply`).
Failures throw `NetplayError { kind, code, retryAfterMs? }` — `errorKind(code, httpStatus)`: `auth` (401/403, auth_required, unauthorized, session_user_required, relogin_required, room-script `AUTH`), `rate` (429, rate_limit_exceeded, rate_limited, `RATE_LIMIT`, `*quota*`), `not-published` (script_not_found), `full` (room-script `ROOM_FULL` / `LOG_FULL`: open a new room; netStatus `full`, lobby error `full`, optional labels `full`), `offline` (network, 5xx), `server` (anything else).
`pollingTransport` reacts: `rate` → waits `max(retry_after_ms, backoff)` without counting it as a dead link (`onStatus('reconnecting', 'rate')`); `auth` / `not-published` → `onStatus('offline', kind)` and closes. The session keeps the reason in `snapshot.issue` (`'auth' | 'rate' | 'not-published' | null`), retries auth / not-published every ≥15 s, and `netStatus()` returns `sign-in` / `busy` / `unavailable` (labels `signIn`, `busy`, `unavailable` in `NET_STATUS_LABELS`; lobby errors `sign-in`, `unavailable`). `minPollMs` (polling option) caps after-send polls.

**Request budget.** `stackscriptTransport` defaults to `sendEveryMs: 100` (a `TransportCaps` hint; session option `sendEveryMs` overrides): realtime lockstep inputs are batched and flushed at most every 100 ms and never while the previous request is still on the wire; hash checks ride along. One flush = one `room.append` call with up to 16 entries (`items`) that also returns everything new since our cursor (`after`) — the timer poll is skipped while those piggybacked reads keep us fresh. In a quiet room the poll period stretches ×1.5 per empty poll up to `idleMaxMs` (1200 ms for stackscript; reset by new entries or our own send), nothing new is sent while a request is on the wire (Nagle), idle clock beats are ≥1 s, and requests time out after 15 s. Measured in `test/hosted.test.ts` (30 Hz lockstep, per client): 50 req/s → 9.8 req/s at 40 ms RTT, 13.4 req/s with stalls → 6.1 req/s with none at 150 ms RTT. The room script counts its `ratePer10s` per entry. `RETRY` (two players appended at the same instant, the room doc's CAS failed, nothing was written) is repeated by `stackscriptRoomApi` up to `conflictRetries` (4) times after a jittered pause `conflictDelayMs(n, conflictBackoffMs = 25, rnd)` = base·2^n·(0.5…1.5), each attempt with a **fresh idempotency key** (`<key>~r<n>`), so a platform that caches replies by key cannot hand the same RETRY back.

### Dev relay — DEV ONLY (two windows / devices on one LAN, no server)

`npm run dev-relay` (= `node tools/dev-relay.mjs --lan`; prints the LAN URLs) and on the client `devRelayTransport(url, user, pollingOptions?)` (poll 150 ms). Plain Node `http`, memory only, **no auth** (the client names itself), private `to` entries enforced, CORS `*`, 64 KB body cap. Never deploy it; production = `stackscriptTransport` + the published room script. Games: `?net=dev&relay=http://<lan-ip>:8787`.

## Room script generator

`generateRoomScript(game, { prefix = id, maxBody = 4000, ratePer10s = 120, maxUsers = max + 8, chunk = 16, maxLog = 100000, pollLimit = 256, lobbyTtlMs = 120000 })` → TypeScript source
(exports `<prefix>.room.join|append|poll`, `<prefix>.lobby.find`). CLI: `npm run gen:room -- <id> <min> <max> [version] [prefix]`.
Every append rewrites the current log chunk, so the default chunk is 16 entries (was 64: ~4× less written per move). `maxLog` caps a room's log (storage bound): past it `room.append` throws `LOG_FULL` (kind `server`) — open a new room. The log is never trimmed in place, because a reload or a late joiner refolds it from seq 1 (seats, params, match start); trimming would need a snapshot entry, which the reducer does not have yet.
**Platform contract the script relies on:** `script.run` is one transaction — `ctx.dna.cas` is checked at commit together with every `put` (otherwise two simultaneous appends get the same seq and one entry is lost), and `ctx.now_ms` is a real clock (with 0 the per-user rate window never rolls). Publishing = platform action, owner approval.

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
