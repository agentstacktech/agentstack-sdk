/**
 * Client session: connects a Game to a Transport, folds the room log, schedules inputs,
 * keeps the connection alive and exposes one Snapshot for the UI (view layer stays yours).
 */
import { isIssue, NetplayError, type NetIssue } from './errors.js';
import type { Game } from './define.js';
import { commitHash, createRoom, localsOf, playerById, reduceRoom, seatsOf, type RoomModel } from './room.js';
import type { Body, ConnectionState, Entry, Link, Outcome, Seat, Snapshot, Transport } from './types.js';

type OutItem = { body: Body; to?: string };

export interface SessionOptions {
  transport: Transport;
  /** Room id (a quick-match result or a private code). */
  room: string;
  name?: string;
  /** Join as a spectator even if a seat is free. */
  spectate?: boolean;
  /**
   * Extra players on THIS device (same screen / shared keyboard / several gamepads): their names. Each takes its own
   * seat right after mine while the table has room (max 3). lockstep: send every local seat's input with
   * `inputs([mine, local1, …])`; fold / authority: `input(cmd, j)`. Not for `secret` games (one screen shows every move).
   * Change them in the lobby with `setLocals(names)`. Nothing changes on the server: the seats ride on my member.
   */
  locals?: string[];
  /** Room params (only the first player's params are used). */
  params?: Record<string, unknown>;
  /** lockstep: ticks of input delay. Default 0 for turn-based/secret games, 2 for realtime. */
  inputDelay?: number;
  /** lockstep: how many ticks a client may run ahead of the confirmed tick before input() stalls. */
  maxAhead?: number;
  /**
   * lockstep: keep every confirmed row of the current match for `confirmed(t)` (default: the last HISTORY = 1024).
   * Turn it on when the game runs its own fixed-step loop: after a reload or a late join, its fresh world can
   * catch up from tick 0 (`while (row = confirmed(w.tick)) step(w, row)`). Cleared at every match start.
   */
  keepHistory?: boolean;
  /** Wall clock for heartbeats (tests inject a virtual clock). */
  now?: () => number;
  /** Salt source for commit–reveal. Default: crypto random. */
  salt?: () => string;
  /** secret lockstep: keep the pending reveal (move + salt) here so a page reload can still reveal a move it committed
   *  before the reload. `sessionStorage` fits as is. Default: none (a reload after committing plays idle that turn). */
  secretStore?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
  /** Secret seed source for an authority. Default: crypto random. */
  secretSeed?: () => number;
  /** Allow `authority` views over a transport without private entries (views become visible to all). */
  allowPublicViews?: boolean;
  /** Keep the folded log in memory (replays, verification). Default true. */
  keepLog?: boolean;
  /** Call update() on this interval (ms). 0 = you call update() yourself (game loop / tests). */
  autoPumpMs?: number;
  /** Send queued lockstep inputs at most this often (ms); default = transport hint (`stackscriptTransport`: 100), else every update(). */
  sendEveryMs?: number;
  /** Refold from the log when a desync shows our hash outside the majority (needs keepLog). Default true. */
  autoResync?: boolean;
}

export type Listener<S, V> = (snap: Snapshot<S, V>) => void;

function randomU32(): number {
  const c = (globalThis as { crypto?: { getRandomValues?: (a: Uint32Array) => Uint32Array } }).crypto;
  if (c?.getRandomValues) return c.getRandomValues(new Uint32Array(1))[0]!;
  return Math.floor(Math.random() * 4294967296) >>> 0;
}

export class Session<S, I, V = S> {
  readonly game: Game<S, I, V>;
  /** The folded room (replaced by `resync()`). */
  model: RoomModel<S, I, V>;
  readonly log: Entry[] = [];
  private link: Link | null = null;
  private self = '';
  private connection: ConnectionState = 'idle';
  /** Why the link is down / slowed, when the transport could tell (see NetplayError). */
  private issue: NetIssue | null = null;
  private readonly listeners = new Set<Listener<S, V>>();
  private readonly stepListeners = new Set<(state: S | null, tick: number) => void>();
  private snap: Snapshot<S, V> | null = null;
  private outbox: OutItem[] = [];
  private batch: { t: number; d: unknown[]; x?: unknown[][] } | null = null;
  private nextTick = 0;
  private lastSendAt = -Infinity;
  /** sends not yet acknowledged by the transport */
  private sending = 0;
  private connecting: Promise<void> | null = null;
  private linkGen = 0;
  private reveals = new Map<number, { d: unknown[]; salt: string }>();
  private committed = new Set<number>();
  private lastView: V | null = null;
  /** authority: last views of my local seats (by seat). */
  private localViews = new Map<number, V>();
  private lastViewOutcome: Outcome | null = null;
  private hashLog: { t: number; h: number }[] = [];
  private viewsKey = '';
  private timer: ReturnType<typeof setInterval> | null = null;
  private retryAt = 0;
  private retries = 0;
  private readonly now: () => number;
  /** Last tick whose hash we reported (no duplicate reports after a resync refold). */
  private hashedUpTo = -1;
  /** Desync tick we already re-folded for, and how many auto-resyncs this match. */
  private resyncedFor = -1;
  private resyncCount = 0;
  /** Counter stamped into every outgoing body (`n`); resumes from the log after a reload. */
  private sendN: number;
  /** `away(true)` was called: no heartbeats / hash reports until `away(false)` or a real input. */
  private hidden = false;

  constructor(game: Game<S, I, V>, readonly opts: SessionOptions) {
    this.game = game;
    this.now = opts.now ?? (() => Date.now());
    // time-based start keeps the counter monotonic across reloads even before our old entries arrive
    this.sendN = Math.max(0, Math.floor(this.now())) * 1000;
    this.model = createRoom(game, opts.room, { simulate: game.mode !== 'authority', keepHistory: opts.keepHistory });
    this.model.onStep = (tick) => this.handleStep(tick);
    if (game.mode === 'authority' && !opts.transport.caps.privateEntries && !opts.allowPublicViews)
      throw new Error(`netplay: "${game.id}" hides information but transport "${opts.transport.caps.kind}" has no private entries; use a private transport or allowPublicViews`);
  }

  /** Connect and send hello. Resolves once the link is up (entries keep streaming in). */
  async join(): Promise<void> {
    await this.connect();
    const locals = this.opts.locals?.length && !this.game.secret ? { locals: this.opts.locals.slice(0, 3) } : {};
    this.push({ k: 'hello', g: this.game.id, v: this.game.version, name: this.opts.name, spectate: this.opts.spectate, params: this.opts.params, ...locals });
    this.flush();
    if (this.opts.autoPumpMs && !this.timer) this.timer = setInterval(() => this.update(), this.opts.autoPumpMs);
  }

  /** One connect at a time: update() keeps pumping while a slow (HTTP) join is still on the wire. */
  private connect(): Promise<void> {
    this.connecting ??= this.openLink().finally(() => { this.connecting = null; });
    return this.connecting;
  }

  private async openLink(): Promise<void> {
    this.setConnection(this.link ? 'reconnecting' : 'connecting');
    const gen = ++this.linkGen;
    const current = () => gen === this.linkGen; // statuses / entries of a replaced link are ignored
    try {
      const link = await this.opts.transport.connect(this.opts.room, {
        afterSeq: this.model.lastSeq,
        onEntries: (es) => { if (current()) this.receive(es); },
        onStatus: (s, detail) => {
          if (!current()) return;
          if (s === 'offline' && this.link) { this.link.close(); this.link = null; this.retries += 1; this.retryAt = this.now() + this.retryDelay(); }
          this.setIssue(s === 'online' ? null : isIssue(detail) ? detail : this.issue === 'rate' && s === 'reconnecting' ? null : this.issue);
          this.setConnection(s);
        },
      });
      if (!current()) { link.close(); return; }
      this.link = link;
      this.self = link.self;
      this.retries = 0;
      this.setIssue(null);
      this.setConnection('online');
    } catch (err) {
      if (!current()) return;
      this.link = null;
      this.retries += 1;
      this.setIssue(err instanceof NetplayError && isIssue(err.kind) ? err.kind : null);
      this.retryAt = this.now() + this.retryDelay((err as NetplayError)?.retryAfterMs);
      this.setConnection('offline');
      throw err;
    }
  }

  /** Reconnect delay: exponential up to 10 s; a guest (`auth`) or a missing script waits 15 s; `rate` honours the server. */
  private retryDelay(retryAfterMs = 0): number {
    const exp = Math.min(10_000, 250 * 2 ** Math.min(this.retries, 6));
    return this.issue === 'auth' || this.issue === 'not-published' ? Math.max(exp, 15_000) : Math.max(exp, retryAfterMs);
  }
  private setIssue(i: NetIssue | null): void {
    if (this.issue === i) return;
    this.issue = i;
    this.snap = null;
  }

  /** Subscribe to snapshots. Returns an unsubscribe function. Called immediately with the current one. */
  subscribe(fn: Listener<S, V>): () => void {
    this.listeners.add(fn);
    fn(this.snapshot);
    return () => this.listeners.delete(fn);
  }

  /** lockstep input delay in ticks (option, or 0 for turn-based, 2 for realtime). */
  get inputDelay(): number {
    return this.opts.inputDelay ?? (this.game.turnMs > 0 || this.game.secret ? 0 : 2);
  }

  /**
   * Run `fn` after every confirmed lockstep tick / applied command (before the batch's snapshot).
   * Use it for per-step effects (sounds, particles) — the snapshot may skip intermediate ticks.
   */
  onStep(fn: (state: S | null, tick: number) => void): () => void {
    this.stepListeners.add(fn);
    return () => this.stepListeners.delete(fn);
  }

  /**
   * lockstep: the confirmed inputs of `tick` (every seat, idle-filled), or null if not confirmed
   * yet. For games that keep their own fixed-step loop (`step(world, session.confirmed(t))`).
   */
  confirmed(tick: number): readonly I[] | null {
    return this.model.history.get(tick) ?? null;
  }

  get seat(): Seat {
    return playerById(this.model, this.self)?.seat ?? -1;
  }
  /** Every seat played on this device: mine first, then my local seats in local order ([] when spectating). */
  get seats(): Seat[] {
    return this.self ? seatsOf(this.model, this.self) : [];
  }
  /** Lobby: replace this device's extra players (names; [] removes them). Returns false outside the lobby or when not seated. */
  setLocals(names: readonly string[]): boolean {
    if (this.model.phase !== 'lobby' || this.seat < 0 || this.game.secret) return false;
    this.opts.locals = names.slice(0, 3);
    this.push({ k: 'locals', names: names.slice(0, 3).map(String) });
    this.flush();
    return true;
  }
  /** One local seat (1, 2, …) leaves; the others and my own seat stay. */
  leaveLocal(j: number): void {
    if (!Number.isInteger(j) || j < 1) return;
    this.push({ k: 'leave', l: j });
    this.flush();
  }
  /**
   * Audience command (`GameDef.audience`: a bet, a cheer, a vote) — from a spectator, or from a player when the game
   * allows `from: 'all'`. Separate from `input()`: no seat, no tick, never waits. Returns false when the game has no
   * audience, the match is not running, or (when this client holds the state) the game rejects it.
   */
  audience(value: unknown): boolean {
    const m = this.model, a = this.game.audience;
    if (!a || m.phase !== 'playing' || !this.self) return false;
    const seat = this.seat;
    if (seat >= 0 ? a.from !== 'all' : !m.spectators.has(this.self)) return false;
    if (m.simulate && m.state !== null && a.input(value, { id: this.self, seat }, m.state as S) === undefined) return false;
    const host = m.players[0]?.id;
    const to = this.game.mode === 'authority' && this.opts.transport.caps.privateEntries && host && host !== this.self ? host : undefined;
    this.push({ k: 'aud', m: m.match, d: value }, to);
    this.flush();
    return true;
  }
  /**
   * The page went to the background (`true`) or came back (`false`) — wire it to `visibilitychange`
   * (`bindVisibility(session)` in `/ui` does). Hidden: the room stops waiting for this device's seats at once
   * (instead of after `presenceMs` of silence) and no heartbeats go out; back: one heartbeat marks the seats present
   * again and lockstep `inputs()` re-anchors past the ticks played meanwhile. The `forfeit` timeout still applies.
   */
  away(hidden: boolean): void {
    if (!hidden) {
      if (!this.hidden) return;
      this.hidden = false;
      this.push({ k: 'clock' });
    } else {
      if (this.hidden || this.seat < 0 || this.model.phase !== 'playing') return;
      this.hidden = true;
      // inputs still batched (sendEveryMs) go out BEFORE the away entry: any entry after it would mark the seats present again
      this.flushBatch();
      this.push({ k: 'away' });
    }
    this.flush();
  }
  /** authority, non-host: the last view the host sent for one of my seats (`seats[i]`). */
  viewFor(seat: Seat): V | null {
    if (seat === this.seat) return this.snapshot.view;
    const m = this.model;
    if (m.simulate && m.state !== null) return this.game.view(m.state as S, seat);
    return this.localViews.get(seat) ?? null;
  }
  private get isAuthority(): boolean {
    return this.game.mode === 'authority' && this.model.players[0]?.id === this.self && this.self !== '';
  }

  get snapshot(): Snapshot<S, V> {
    if (this.snap) return this.snap;
    const m = this.model;
    const seat = this.seat;
    const own = m.simulate && m.state !== null;
    const outcome = own ? m.outcome : (m.outcome ?? this.lastViewOutcome);
    this.snap = {
      room: m.room, self: this.self, seat, seats: this.seats, phase: m.phase, match: m.match,
      players: m.players.map((p) => ({ ...p })), spectators: m.spectators.size, tick: m.tick,
      state: own ? m.state : null,
      view: own ? this.game.view(m.state as S, seat) : this.lastView,
      outcome, desync: m.desync, rematch: [...m.rematch], results: [...m.results], notice: m.notice, connection: this.connection, issue: this.issue,
      hostWaitMs: m.hostLostAt === null || m.phase !== 'playing' ? null : Math.max(0, m.hostLostAt + this.game.hostGraceMs - m.now),
    };
    return this.snap;
  }

  /**
   * Send my input. lockstep: one call per tick (realtime) or per turn; returns false when the
   * client is too far ahead (stall) or already committed this turn. fold/authority: a command.
   */
  input(value: I, local = 0): boolean {
    const m = this.model;
    const g = this.game;
    if (g.mode === 'lockstep' && !g.secret) return local > 0 ? false : this.inputs([value]); // several seats per tick: inputs([...])
    const own = this.seat;
    const seat = local > 0 ? (playerById(m, `${this.self}~${local}`)?.seat ?? -1) : own;
    if (own < 0 || seat < 0 || m.phase !== 'playing') return false;
    if (g.mode !== 'lockstep') {
      // validate locally when this client holds the state (fold: everyone; authority: the host) — same check every client runs
      if (m.state !== null && m.state !== undefined && g.input(value, seat, m.state as S) === undefined) return false;
      const host = m.players[0]?.id;
      const to = g.mode === 'authority' && this.opts.transport.caps.privateEntries && host && host !== this.self ? host : undefined;
      this.push(local > 0 ? { k: 'cmd', m: m.match, d: value, l: local } : { k: 'cmd', m: m.match, d: value }, to);
      return true;
    }
    if (local > 0) return false; // secret games have no local seats
    if (g.secret) {
      const t = m.tick;
      // our commitment is already in the log (e.g. sent before a reload): a second one would be ignored by everyone
      if (this.committed.has(t) || m.commits.get(t)?.[seat] !== undefined) return false;
      const salt = (this.opts.salt ?? (() => randomU32().toString(36) + randomU32().toString(36)))();
      this.committed.add(t);
      this.reveals.set(t, { d: [value], salt });
      this.storeReveal({ m: m.match, t, d: [value], salt });
      this.push({ k: 'commit', m: m.match, t, h: commitHash([value], salt) });
      return true;
    }
    return false;
  }

  /**
   * fold / authority: the same command for EVERY seat on this device (mine first, then the local seats) in ONE entry
   * (`{ k: 'cmd', a: 1 }`), e.g. a clock report on a shared table. Per-seat `input(cmd, j)` would cost one entry per
   * seat against the room's per-user rate limit. Returns false when no seat accepts it.
   */
  inputAll(value: I): boolean {
    const m = this.model;
    const g = this.game;
    const own = this.seat;
    if (g.mode === 'lockstep' || own < 0 || m.phase !== 'playing') return false;
    if (m.state !== null && m.state !== undefined && !this.seats.some((seat) => g.input(value, seat, m.state as S) !== undefined)) return false;
    const host = m.players[0]?.id;
    const to = g.mode === 'authority' && this.opts.transport.caps.privateEntries && host && host !== this.self ? host : undefined;
    this.push({ k: 'cmd', m: m.match, d: value, a: 1 }, to);
    return true;
  }

  /**
   * lockstep (realtime / turns, not secret): this tick's input for every seat on this device —
   * `values[0]` mine, `values[j]` local seat j (missing = idle). One entry carries them all. Same stall rule as `input`.
   */
  inputs(values: readonly I[]): boolean {
    const m = this.model;
    const seat = this.seat;
    const g = this.game;
    if (seat < 0 || m.phase !== 'playing' || g.mode !== 'lockstep' || g.secret) return false;
    const nl = localsOf(m, this.self).length;
    const delay = this.inputDelay;
    // keep a steady lead of `delay` ticks; only re-anchor if we fell behind (idle-filled while away, or a reload)
    let t = this.nextTick;
    if (t < m.tick) {
      // a seat that is present is waited for: fill our own gap with idle up to the new anchor, or the room
      // stalls at m.tick forever (a reloaded tab used to). Skip ticks the old tab already sent.
      let from = m.tick;
      while (m.inputs.get(from)?.[seat] !== undefined) from++;
      t = Math.max(from, m.tick + delay);
      if (this.batch && this.batch.t + this.batch.d.length <= m.tick) this.batch = null; // ticks already confirmed (e.g. queued during the reload's refold)
      this.flushBatch();
      if (t > from) this.batch = this.idleBatch(from, t - from, nl);
    }
    if (t > m.tick + delay + (this.opts.maxAhead ?? 8)) return false;
    if (this.batch && this.batch.t + this.batch.d.length !== t) this.flushBatch();
    if (!this.batch) this.batch = this.idleBatch(t, 0, nl);
    this.batch.d.push(values[0] ?? g.idle);
    if (this.batch.x) for (let j = 1; j <= this.batch.x.length; j++) this.batch.x[j - 1]!.push(values[j] ?? g.idle);
    this.nextTick = t + 1;
    this.hidden = false; // a move = back
    return true;
  }

  private idleBatch(t: number, n: number, locals: number): { t: number; d: unknown[]; x?: unknown[][] } {
    const idle = this.game.idle;
    const b: { t: number; d: unknown[]; x?: unknown[][] } = { t, d: new Array(n).fill(idle) };
    if (locals > 0) b.x = Array.from({ length: locals }, () => new Array(n).fill(idle));
    return b;
  }

  /** Mark ready in the lobby (starts once all seated players are ready and min seats are met). */
  ready(): void { this.push({ k: 'ready' }); this.flush(); }
  /** Vote for a rematch after the match is over. */
  rematch(): void { if (this.model.phase === 'over') { this.push({ k: 'rematch', m: this.model.match }); this.flush(); } }
  /** Leave the room (forfeits a running 2-seat match) and close the link. */
  leave(): void {
    this.push({ k: 'leave' });
    this.flush();
    this.close();
  }
  close(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.linkGen += 1; // a connect still on the wire is dropped when it lands
    this.link?.close();
    this.link = null;
    this.setConnection('idle');
  }

  /** Pump: flush inputs, heartbeat, reconnect, authority views. Call from your loop or autoPumpMs. */
  update(): void {
    const now = this.now();
    if (!this.link && this.connection !== 'idle' && now >= this.retryAt) {
      this.connect().then(() => this.flush(), () => {});
      return;
    }
    const g = this.game;
    const ticking = g.clockMs > 0 && this.model.phase === 'playing' && this.seat >= 0 && (g.mode !== 'authority' || this.isAuthority);
    // HTTP transports (every > 0): a realtime input batch waits up to sendEveryMs, and nothing new goes out while our
    // previous request is on the wire (Nagle) — the next request carries everything queued meanwhile; hash checks ride along.
    // Idle clock beats there are ≥1 s (timers keep 1 s resolution instead of 4 requests a second).
    const every = this.opts.sendEveryMs ?? this.opts.transport.caps.sendEveryMs ?? 0;
    const clockBeat = ticking ? Math.max(g.clockMs, every > 0 ? 1000 : 0) : Infinity;
    const beat = Math.max(250, Math.min(g.presenceMs / 4, g.turnMs > 0 ? g.turnMs / 2 : Infinity, clockBeat));
    if (every > 0 && this.sending > 0) return;
    if (this.hidden && !this.batch && this.outbox.every((o) => o.body.k === 'hash' || o.body.k === 'clock')) return; // background tab: stay quiet
    if (this.outbox.some((o) => o.body.k !== 'hash') || ((this.batch || this.outbox.length) && now - this.lastSendAt >= every)) this.flush();
    else if (this.link && this.model.phase !== 'over' && now - this.lastSendAt >= beat) { this.push({ k: 'clock' }); this.flush(); }
  }

  private push(body: Body, to?: string): void {
    if (body.k !== 'away' && body.k !== 'hash' && body.k !== 'clock' && body.k !== 'view') this.hidden = false; // a move = back
    const stamped = { ...body, n: ++this.sendN } as Body;
    this.outbox.push(to ? { body: stamped, to } : { body: stamped });
  }
  private flushBatch(): void {
    if (!this.batch) return;
    const b = this.batch;
    this.outbox.push({ body: b.x ? { k: 'in', m: this.model.match, t: b.t, d: b.d, x: b.x, n: ++this.sendN } : { k: 'in', m: this.model.match, t: b.t, d: b.d, n: ++this.sendN } });
    this.batch = null;
  }

  /** Send everything queued. Transports keep call order; a failed send re-queues the rest in order. */
  flush(): void {
    this.flushBatch();
    if (!this.link || !this.outbox.length) return;
    const link = this.link;
    const items = this.outbox;
    this.outbox = [];
    this.lastSendAt = this.now();
    if (link.sendMany) {
      // one request for the whole flush; on failure everything is re-sent (dedup by `n`)
      this.sending += 1;
      link.sendMany(items).then(() => { this.sending -= 1; }, (err: unknown) => { this.sending -= 1; this.sendFailed(link, items, 0, err); });
      return;
    }
    let failed = false;
    items.forEach((it, i) => {
      this.sending += 1;
      link.send(it.body, it.to).then(() => { this.sending -= 1; }, (err: unknown) => {
        this.sending -= 1;
        if (failed) return;
        failed = true;
        this.sendFailed(link, items, i, err);
      });
    });
  }

  /** Re-queue from the failed item (in order) and reconnect; known server reasons get their own wait + status. */
  private sendFailed(link: Link, items: readonly OutItem[], from: number, err: unknown): void {
    this.outbox.unshift(...items.slice(from));
    if (this.link !== link) return;
    link.close();
    this.link = null;
    const e = err instanceof NetplayError ? err : null;
    if (e && isIssue(e.kind)) {
      // rate: wait what the server asked (≥1 s); auth / not-published: slow retries (15 s) + plain status
      this.retries += 1;
      this.setIssue(e.kind);
      this.retryAt = this.now() + (e.kind === 'rate' ? Math.max(1000, e.retryAfterMs ?? 0) : this.retryDelay());
      this.setConnection(e.kind === 'rate' ? 'reconnecting' : 'offline');
    } else {
      this.retryAt = this.now();
      this.setConnection('reconnecting');
    }
  }

  private handleStep(tick: number): void {
    for (const fn of this.stepListeners) fn(this.model.state, tick);
    const every = this.game.hashEvery;
    if (!every || tick % every !== 0 || this.seat < 0 || !this.model.state || tick <= this.hashedUpTo) return;
    this.hashedUpTo = tick;
    if (this.game.mode === 'authority') return;
    const h = this.game.hash(this.model.state);
    this.hashLog.push({ t: tick, h });
  }

  private receive(es: readonly Entry[]): void {
    const m = this.model;
    const before = m.lastSeq;
    for (const e of es) {
      if (e.seq <= m.lastSeq) continue;
      if (e.from === this.self && typeof (e.body as Body)?.n === 'number') this.sendN = Math.max(this.sendN, (e.body as Body).n!); // reload: continue our counter
      m.self = this.self;
      if (this.game.mode === 'authority') m.simulate = m.players.length === 0 ? true : m.players[0]!.id === this.self;
      const prevMatch = m.match;
      if (e.body && (e.body as Body).k === 'view') this.takeView(e);
      reduceRoom(m, e);
      if (m.match !== prevMatch) this.onNewMatch();
      if (this.opts.keepLog !== false) this.log.push(e);
    }
    if (m.lastSeq === before) return;
    this.maybeResync();
    if (!this.hidden) for (const h of this.hashLog) this.push({ k: 'hash', m: m.match, t: h.t, h: h.h }); // a background tab stays quiet
    this.hashLog = [];
    this.revealReady();
    if (this.isAuthority) this.sendViews();
    if (this.outbox.length) this.flush();
    this.snap = null;
    const s = this.snapshot;
    for (const fn of this.listeners) fn(s);
  }

  /**
   * Desync recovery: rebuild the room from the kept log with a fresh reducer. A state that was corrupted locally
   * (a mutation outside the rules, a torn save) comes back identical to everyone else's; the next agreeing hash
   * checkpoint clears `snapshot.desync` for all clients. If the divergence is real (different code), it persists.
   * Returns false when the log is not kept (`keepLog: false`).
   */
  resync(): boolean {
    if (this.opts.keepLog === false) return false;
    const old = this.model;
    const m = createRoom(this.game, this.opts.room, { simulate: this.game.mode !== 'authority', secretSeed: old.secretSeed, keepHistory: this.opts.keepHistory });
    for (const e of this.log) {
      m.self = this.self;
      if (this.game.mode === 'authority') m.simulate = m.players.length === 0 ? true : m.players[0]!.id === this.self;
      reduceRoom(m, e);
    }
    m.onStep = (tick) => this.handleStep(tick);
    this.model = m;
    this.snap = null;
    return true;
  }

  /** autoResync: refold once per desync checkpoint where our hash is not the clear majority (max 3 per match). */
  private maybeResync(): void {
    const d = this.model.desync;
    if (!d || this.opts.autoResync === false || this.seat < 0 || d.tick === this.resyncedFor || this.resyncCount >= 3) return;
    const mine = d.hashes[this.self];
    if (mine === undefined) return;
    const votes = Object.values(d.hashes);
    const same = votes.filter((h) => h === mine).length;
    if (same * 2 > votes.length) return; // we are the majority: the others should refold
    this.resyncedFor = d.tick;
    this.resyncCount += 1;
    this.resync();
  }

  private onNewMatch(): void {
    this.hashedUpTo = -1;
    this.resyncedFor = -1;
    this.resyncCount = 0;
    this.nextTick = 0;
    this.batch = null;
    const g = this.game;
    const delay = this.inputDelay;
    if (g.mode === 'lockstep' && !g.secret && delay > 0 && this.seat >= 0) {
      // the first `delay` ticks have no real input yet: fill them so tick 0 can run
      this.batch = this.idleBatch(0, delay, localsOf(this.model, this.self).length);
      this.nextTick = delay;
    }
    this.reveals.clear();
    this.committed.clear();
    this.lastView = null;
    this.localViews.clear();
    this.lastViewOutcome = null;
    this.viewsKey = '';
  }

  private get revealKey(): string { return `netplay:reveal:${this.game.id}:${this.opts.room}`; }
  private storeReveal(r: { m: number; t: number; d: unknown[]; salt: string } | null): void {
    const st = this.opts.secretStore;
    if (!st) return;
    try { if (r) st.setItem(this.revealKey, JSON.stringify(r)); else st.removeItem(this.revealKey); } catch { /* storage full / blocked: reveal from memory only */ }
  }
  /** After a reload: our commit for this tick is in the log but the move is not in memory → take it from `secretStore` if it matches. */
  private restoreReveal(): void {
    const m = this.model, st = this.opts.secretStore, seat = this.seat;
    if (!st || seat < 0 || m.phase !== 'playing' || this.reveals.has(m.tick)) return;
    const c = m.commits.get(m.tick)?.[seat];
    if (c === undefined || m.inputs.get(m.tick)?.[seat] !== undefined) return;
    let r: { m: number; t: number; d: unknown[]; salt: string } | null = null;
    try { r = JSON.parse(st.getItem(this.revealKey) ?? 'null'); } catch { r = null; }
    if (!r || r.m !== m.match || r.t !== m.tick || !Array.isArray(r.d) || commitHash(r.d, String(r.salt)) !== c) return;
    this.committed.add(r.t);
    this.reveals.set(r.t, { d: r.d, salt: String(r.salt) });
  }

  private revealReady(): void {
    const m = this.model;
    if (!this.game.secret) return;
    this.restoreReveal();
    for (const [t, r] of this.reveals) {
      if (t < m.tick) { this.reveals.delete(t); continue; }
      const row = m.commits.get(t) ?? [];
      const absent = m.players.map((p) => p.status !== 'on');
      const all = m.closedTick === t || m.players.every((p) => absent[p.seat] || row[p.seat] !== undefined);
      if (all) { this.push({ k: 'in', m: m.match, t, d: r.d, salt: r.salt }); this.reveals.delete(t); this.storeReveal(null); }
    }
  }

  private takeView(e: Entry): void {
    const b = e.body as Extract<Body, { k: 'view' }>;
    const host = this.model.players[0]?.id;
    if (e.from !== host || host === this.self) return;
    const seats = this.seats;
    if (b.seat >= 0 && b.seat !== this.seat && seats.includes(b.seat)) { this.localViews.set(b.seat, b.d as V); this.lastViewOutcome = b.o ?? null; return; }
    const mine = e.to === this.self || (b.seat === -1 && this.seat < 0) || (b.seat === this.seat && this.seat >= 0);
    if (!mine) return;
    this.lastView = b.d as V;
    this.lastViewOutcome = b.o ?? null;
  }

  private sendViews(): void {
    const m = this.model;
    if (!m.state) return;
    // only when something visible changed (state, outcome, who is seated/watching)
    const key = `${m.match}:${this.game.hash(m.state)}:${m.phase}:${m.players.map((p) => p.id + p.status).join(',')}:${m.spectators.size}`;
    if (key === this.viewsKey) return;
    this.viewsKey = key;
    const priv = this.opts.transport.caps.privateEntries;
    for (const p of m.players) {
      // my own local seats read the state directly (viewFor); another device's local seats get theirs sent to that device
      if (p.id === this.self || p.owner === this.self || p.status === 'left') continue;
      this.push({ k: 'view', m: m.match, s: m.lastSeq, seat: p.seat, d: this.game.view(m.state, p.seat), o: m.outcome }, priv ? (p.owner ?? p.id) : undefined);
    }
    if (m.spectators.size) this.push({ k: 'view', m: m.match, s: m.lastSeq, seat: -1, d: this.game.view(m.state, -1), o: m.outcome });
  }

  private setConnection(c: ConnectionState): void {
    if (this.connection === c) return;
    this.connection = c;
    this.snap = null;
    const s = this.snapshot;
    for (const fn of this.listeners) fn(s);
  }
}

/** Create a client session. See README for the 5-minute quickstart. */
export function createSession<S, I, V>(game: Game<S, I, V>, opts: SessionOptions): Session<S, I, V> {
  const s = new Session(game, opts);
  if (game.mode === 'authority') s.model.secretSeed = (opts.secretSeed ?? randomU32)();
  return s;
}
