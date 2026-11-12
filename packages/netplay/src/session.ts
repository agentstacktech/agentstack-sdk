/**
 * Client session: connects a Game to a Transport, folds the room log, schedules inputs,
 * keeps the connection alive and exposes one Snapshot for the UI (view layer stays yours).
 */
import type { Game } from './define.js';
import { commitHash, createRoom, playerById, reduceRoom, type RoomModel } from './room.js';
import type { Body, ConnectionState, Entry, Link, Outcome, Seat, Snapshot, Transport } from './types.js';

export interface SessionOptions {
  transport: Transport;
  /** Room id (a quick-match result or a private code). */
  room: string;
  name?: string;
  /** Join as a spectator even if a seat is free. */
  spectate?: boolean;
  /** Room params (only the first player's params are used). */
  params?: Record<string, unknown>;
  /** lockstep: ticks of input delay. Default 0 for turn-based/secret games, 2 for realtime. */
  inputDelay?: number;
  /** lockstep: how many ticks a client may run ahead of the confirmed tick before input() stalls. */
  maxAhead?: number;
  /** Wall clock for heartbeats (tests inject a virtual clock). */
  now?: () => number;
  /** Salt source for commit–reveal. Default: crypto random. */
  salt?: () => string;
  /** Secret seed source for an authority. Default: crypto random. */
  secretSeed?: () => number;
  /** Allow `authority` views over a transport without private entries (views become visible to all). */
  allowPublicViews?: boolean;
  /** Keep the folded log in memory (replays, verification). Default true. */
  keepLog?: boolean;
  /** Call update() on this interval (ms). 0 = you call update() yourself (game loop / tests). */
  autoPumpMs?: number;
}

export type Listener<S, V> = (snap: Snapshot<S, V>) => void;

function randomU32(): number {
  const c = (globalThis as { crypto?: { getRandomValues?: (a: Uint32Array) => Uint32Array } }).crypto;
  if (c?.getRandomValues) return c.getRandomValues(new Uint32Array(1))[0]!;
  return Math.floor(Math.random() * 4294967296) >>> 0;
}

export class Session<S, I, V = S> {
  readonly game: Game<S, I, V>;
  readonly model: RoomModel<S, I, V>;
  readonly log: Entry[] = [];
  private link: Link | null = null;
  private self = '';
  private connection: ConnectionState = 'idle';
  private readonly listeners = new Set<Listener<S, V>>();
  private readonly stepListeners = new Set<(state: S | null, tick: number) => void>();
  private snap: Snapshot<S, V> | null = null;
  private outbox: { body: Body; to?: string }[] = [];
  private batch: { t: number; d: unknown[] } | null = null;
  private nextTick = 0;
  private lastSendAt = -Infinity;
  private reveals = new Map<number, { d: unknown[]; salt: string }>();
  private committed = new Set<number>();
  private lastView: V | null = null;
  private lastViewOutcome: Outcome | null = null;
  private hashLog: { t: number; h: number }[] = [];
  private viewsKey = '';
  private timer: ReturnType<typeof setInterval> | null = null;
  private retryAt = 0;
  private retries = 0;
  private readonly now: () => number;
  /** Counter stamped into every outgoing body (`n`); resumes from the log after a reload. */
  private sendN: number;

  constructor(game: Game<S, I, V>, readonly opts: SessionOptions) {
    this.game = game;
    this.now = opts.now ?? (() => Date.now());
    // time-based start keeps the counter monotonic across reloads even before our old entries arrive
    this.sendN = Math.max(0, Math.floor(this.now())) * 1000;
    this.model = createRoom(game, opts.room, { simulate: game.mode !== 'authority' });
    this.model.onStep = (tick) => this.handleStep(tick);
    if (game.mode === 'authority' && !opts.transport.caps.privateEntries && !opts.allowPublicViews)
      throw new Error(`netplay: "${game.id}" hides information but transport "${opts.transport.caps.kind}" has no private entries; use a private transport or allowPublicViews`);
  }

  /** Connect and send hello. Resolves once the link is up (entries keep streaming in). */
  async join(): Promise<void> {
    await this.connect();
    this.push({ k: 'hello', g: this.game.id, v: this.game.version, name: this.opts.name, spectate: this.opts.spectate, params: this.opts.params });
    this.flush();
    if (this.opts.autoPumpMs && !this.timer) this.timer = setInterval(() => this.update(), this.opts.autoPumpMs);
  }

  private async connect(): Promise<void> {
    this.setConnection(this.link ? 'reconnecting' : 'connecting');
    try {
      this.link = await this.opts.transport.connect(this.opts.room, {
        afterSeq: this.model.lastSeq,
        onEntries: (es) => this.receive(es),
        onStatus: (s) => {
          if (s === 'offline' && this.link) { this.link.close(); this.link = null; this.retries += 1; this.retryAt = this.now() + Math.min(10_000, 250 * 2 ** Math.min(this.retries, 6)); }
          this.setConnection(s);
        },
      });
      this.self = this.link.self;
      this.retries = 0;
      this.setConnection('online');
    } catch (err) {
      this.link = null;
      this.retries += 1;
      this.retryAt = this.now() + Math.min(10_000, 250 * 2 ** Math.min(this.retries, 6));
      this.setConnection('offline');
      throw err;
    }
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
      room: m.room, self: this.self, seat, phase: m.phase, match: m.match,
      players: m.players.map((p) => ({ ...p })), spectators: m.spectators.size, tick: m.tick,
      state: own ? m.state : null,
      view: own ? this.game.view(m.state as S, seat) : this.lastView,
      outcome, desync: m.desync, rematch: [...m.rematch], notice: m.notice, connection: this.connection,
    };
    return this.snap;
  }

  /**
   * Send my input. lockstep: one call per tick (realtime) or per turn; returns false when the
   * client is too far ahead (stall) or already committed this turn. fold/authority: a command.
   */
  input(value: I): boolean {
    const m = this.model;
    const seat = this.seat;
    if (seat < 0 || m.phase !== 'playing') return false;
    const g = this.game;
    if (g.mode !== 'lockstep') {
      const host = m.players[0]?.id;
      const to = g.mode === 'authority' && this.opts.transport.caps.privateEntries && host && host !== this.self ? host : undefined;
      this.push({ k: 'cmd', m: m.match, d: value }, to);
      return true;
    }
    if (g.secret) {
      const t = m.tick;
      if (this.committed.has(t)) return false;
      const salt = (this.opts.salt ?? (() => randomU32().toString(36) + randomU32().toString(36)))();
      this.committed.add(t);
      this.reveals.set(t, { d: [value], salt });
      this.push({ k: 'commit', m: m.match, t, h: commitHash([value], salt) });
      return true;
    }
    const delay = this.inputDelay;
    // keep a steady lead of `delay` ticks; only re-anchor if we fell behind (our ticks were idle-filled)
    const t = this.nextTick >= m.tick ? this.nextTick : m.tick + delay;
    if (t > m.tick + delay + (this.opts.maxAhead ?? 8)) return false;
    if (this.batch && this.batch.t + this.batch.d.length !== t) this.flushBatch();
    if (!this.batch) this.batch = { t, d: [] };
    this.batch.d.push(value);
    this.nextTick = t + 1;
    return true;
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
    const beat = Math.max(250, Math.min(g.presenceMs / 4, g.turnMs > 0 ? g.turnMs / 2 : Infinity, ticking ? g.clockMs : Infinity));
    if (this.batch || this.outbox.length) this.flush();
    else if (this.link && this.model.phase !== 'over' && now - this.lastSendAt >= beat) { this.push({ k: 'clock' }); this.flush(); }
  }

  private push(body: Body, to?: string): void {
    const stamped = { ...body, n: ++this.sendN } as Body;
    this.outbox.push(to ? { body: stamped, to } : { body: stamped });
  }
  private flushBatch(): void {
    if (!this.batch) return;
    this.outbox.push({ body: { k: 'in', m: this.model.match, t: this.batch.t, d: this.batch.d, n: ++this.sendN } });
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
    let failed = false;
    items.forEach((it, i) => {
      link.send(it.body, it.to).catch(() => {
        if (failed) return;
        failed = true;
        this.outbox.unshift(...items.slice(i));
        if (this.link === link) { link.close(); this.link = null; this.retryAt = this.now(); this.setConnection('reconnecting'); }
      });
    });
  }

  private handleStep(tick: number): void {
    for (const fn of this.stepListeners) fn(this.model.state, tick);
    const every = this.game.hashEvery;
    if (!every || tick % every !== 0 || this.seat < 0 || !this.model.state) return;
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
      if (this.game.mode === 'authority') m.simulate = m.players.length === 0 ? true : m.players[0]!.id === this.self;
      const prevMatch = m.match;
      if (e.body && (e.body as Body).k === 'view') this.takeView(e);
      reduceRoom(m, e);
      if (m.match !== prevMatch) this.onNewMatch();
      if (this.opts.keepLog !== false) this.log.push(e);
    }
    if (m.lastSeq === before) return;
    for (const h of this.hashLog) this.push({ k: 'hash', m: m.match, t: h.t, h: h.h });
    this.hashLog = [];
    this.revealReady();
    if (this.isAuthority) this.sendViews();
    if (this.outbox.length) this.flush();
    this.snap = null;
    const s = this.snapshot;
    for (const fn of this.listeners) fn(s);
  }

  private onNewMatch(): void {
    this.nextTick = 0;
    this.batch = null;
    const g = this.game;
    const delay = this.inputDelay;
    if (g.mode === 'lockstep' && !g.secret && delay > 0 && this.seat >= 0) {
      // the first `delay` ticks have no real input yet: fill them so tick 0 can run
      this.batch = { t: 0, d: new Array(delay).fill(g.idle) };
      this.nextTick = delay;
    }
    this.reveals.clear();
    this.committed.clear();
    this.lastView = null;
    this.lastViewOutcome = null;
    this.viewsKey = '';
  }

  private revealReady(): void {
    const m = this.model;
    if (!this.game.secret) return;
    for (const [t, r] of this.reveals) {
      if (t < m.tick) { this.reveals.delete(t); continue; }
      const row = m.commits.get(t) ?? [];
      const absent = m.players.map((p) => p.status !== 'on');
      const all = m.closedTick === t || m.players.every((p) => absent[p.seat] || row[p.seat] !== undefined);
      if (all) { this.push({ k: 'in', m: m.match, t, d: r.d, salt: r.salt }); this.reveals.delete(t); }
    }
  }

  private takeView(e: Entry): void {
    const b = e.body as Extract<Body, { k: 'view' }>;
    const host = this.model.players[0]?.id;
    if (e.from !== host || host === this.self) return;
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
      if (p.id === this.self || p.status === 'left') continue;
      this.push({ k: 'view', m: m.match, s: m.lastSeq, seat: p.seat, d: this.game.view(m.state, p.seat), o: m.outcome }, priv ? p.id : undefined);
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
