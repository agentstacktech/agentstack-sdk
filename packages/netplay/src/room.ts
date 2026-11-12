/**
 * The room reducer: a pure fold over the server-ordered log. Every client (and a server-side
 * referee, and tests) runs exactly this code, which is why every client agrees on seats, phase,
 * timeouts, rematches and — for lockstep / fold games — the game state itself.
 */
import type { Game } from './define.js';
import { canonicalJson, hashString } from './hash.js';
import { createRng, deriveSeed, seedFromString } from './rng.js';
import type { Body, Desync, Entry, MatchResult, Outcome, Phase, PlayerStatus, Seat, StepCtx } from './types.js';

/** Confirmed lockstep rows kept for `Session.confirmed(tick)`. */
export const HISTORY = 1024;

export interface RoomPlayer {
  id: string;
  seat: Seat;
  name: string;
  status: PlayerStatus;
  ready: boolean;
  lastT: number;
  /** Local seat: the member id of the device that plays it. */
  owner?: string;
  /** Local seat index on that device (1, 2, …). */
  local?: number;
}

export interface RoomModel<S, I, V = S> {
  readonly game: Game<S, I, V>;
  readonly room: string;
  /** false on non-authority clients of an `authority` game: lobby only, state comes from views. */
  simulate: boolean;
  /** Private seed source for `authority` (only the authority knows it). */
  secretSeed: number | null;
  /** Called after every lockstep tick / applied command with the new tick count. */
  onStep: ((tick: number) => void) | null;
  params: Record<string, unknown>;
  players: RoomPlayer[];
  spectators: Set<string>;
  phase: Phase;
  match: number;
  seed: number;
  seats: number;
  state: S | null;
  tick: number;
  now: number;
  tickStartT: number;
  outcome: Outcome | null;
  desync: Desync | null;
  rematch: Set<Seat>;
  /** Finished matches (log-derived), capped at MAX_RESULTS. */
  results: MatchResult[];
  notice: string | null;
  lastSeq: number;
  /** Highest entry counter `n` seen per sender (duplicate suppression). */
  lastN: Map<string, number>;
  /** lockstep input buffer: tick → per-seat input (undefined = not received). */
  inputs: Map<number, (I | undefined)[]>;
  /** secret lockstep: tick whose commit window closed on the turn timer (-1 = none), and when. */
  closedTick: number;
  closedAt: number;
  /** lockstep: recently confirmed input rows (tick → inputs), for clients that step their own loop. */
  history: Map<number, I[]>;
  /** Keep the whole match's rows in `history` (SessionOptions.keepHistory). */
  keepHistory: boolean;
  commits: Map<number, (number | undefined)[]>;
  hashes: Map<number, Map<string, number>>;
  /** This client's user id (authority games: who simulates after a rematch re-seats players). '' = unknown. */
  self: string;
  /** authority: server time the authority seat was first seen away in this match (null = present). */
  hostLostAt: number | null;
}

export interface RoomOptions {
  simulate?: boolean;
  secretSeed?: number | null;
  keepHistory?: boolean;
}

export function createRoom<S, I, V>(game: Game<S, I, V>, room: string, opts: RoomOptions = {}): RoomModel<S, I, V> {
  return {
    game, room,
    simulate: opts.simulate ?? true,
    secretSeed: opts.secretSeed ?? null,
    params: {}, players: [], spectators: new Set(), phase: 'lobby', match: 0, seed: 0, seats: 0,
    state: null, tick: 0, now: 0, tickStartT: 0, outcome: null, desync: null, rematch: new Set(), results: [], notice: null, lastSeq: 0, lastN: new Map(),
    inputs: new Map(), commits: new Map(), hashes: new Map(), onStep: null, closedTick: -1, closedAt: 0, history: new Map(),
    self: '', hostLostAt: null, keepHistory: opts.keepHistory ?? false,
  };
}

export function playerById<S, I, V>(m: RoomModel<S, I, V>, id: string): RoomPlayer | undefined {
  return m.players.find((p) => p.id === id);
}

/** Player id of local seat `j` (1, 2, …) of member `owner`. `~` never appears in a server user id. */
export function localId(owner: string, j: number): string {
  return `${owner}~${j}`;
}

/** Local seats of a member, in local order. */
export function localsOf<S, I, V>(m: RoomModel<S, I, V>, owner: string): RoomPlayer[] {
  return m.players.filter((p) => p.owner === owner).sort((a, b) => (a.local ?? 0) - (b.local ?? 0));
}

/** Every seat played on one device: the member's own seat first, then its local seats (seat order of locals = local order). */
export function seatsOf<S, I, V>(m: RoomModel<S, I, V>, self: string): Seat[] {
  const own = playerById(m, self);
  if (!own) return [];
  return [own.seat, ...localsOf(m, self).map((p) => p.seat)];
}

/** Max local seats one hello / `locals` entry can claim (plus the member's own seat). */
export const MAX_LOCALS = 3;

/** Seat up to MAX_LOCALS local players of `owner` while the table has room (lobby only; secret games have none). */
function addLocals<S, I, V>(m: RoomModel<S, I, V>, owner: string, names: unknown): void {
  if (m.game.secret || !Array.isArray(names)) return;
  const n = Math.min(names.length, MAX_LOCALS);
  for (let j = 1; j <= n && m.players.length < m.game.seats.max; j++) {
    const name = String(names[j - 1] ?? '').slice(0, 32) || `P${m.players.length + 1}`;
    m.players.push({ id: localId(owner, j), owner, local: j, seat: m.players.length, name, status: 'on', ready: false, lastT: m.now });
  }
}

/** Seats whose input a lockstep tick does not wait for. */
export function absentSeats<S, I, V>(m: RoomModel<S, I, V>): boolean[] {
  const a: boolean[] = new Array(m.seats).fill(true);
  for (const p of m.players) if (p.seat >= 0 && p.seat < m.seats) a[p.seat] = p.status !== 'on';
  return a;
}

/** Commit hash for commit–reveal (lockstep `secret`). */
/** Inputs / commits further ahead than this are ignored (bounds the buffers a hostile client can fill). */
export const MAX_AHEAD_TICKS = 4096;

export function commitHash(inputs: readonly unknown[], salt: string): number {
  return hashString(canonicalJson(inputs) + '#' + salt);
}

function ctxFor<S, I, V>(m: RoomModel<S, I, V>, tick: number): StepCtx {
  return { tick, now: m.now, seed: m.seed, rng: createRng(deriveSeed(m.seed, tick)), absent: absentSeats(m) };
}

/** Results kept per room (a long evening of rematches stays bounded). */
export const MAX_RESULTS = 100;

function setOutcome<S, I, V>(m: RoomModel<S, I, V>, o: Outcome): void {
  if (m.phase === 'playing') {
    const winner = o.winner >= 0 ? (m.players.find((p) => p.seat === o.winner)?.id ?? '') : '';
    m.results.push(o.reason === undefined ? { match: m.match, winner } : { match: m.match, winner, reason: o.reason });
    if (m.results.length > MAX_RESULTS) m.results.shift();
  }
  m.outcome = o;
  m.phase = 'over';
  m.rematch.clear();
}

function checkOutcome<S, I, V>(m: RoomModel<S, I, V>): void {
  if (m.phase !== 'playing' || !m.state || !m.game.outcome) return;
  const o = m.game.outcome(m.state);
  if (o) setOutcome(m, o);
}

function startMatch<S, I, V>(m: RoomModel<S, I, V>): void {
  const g = m.game;
  m.match += 1;
  m.phase = 'playing';
  m.seats = m.players.length;
  m.seed = m.secretSeed !== null ? deriveSeed(m.secretSeed, m.match) : seedFromString(`${g.id}:${m.room}:${m.match}`);
  m.tick = 0;
  m.tickStartT = m.now;
  m.outcome = null;
  m.desync = null;
  m.rematch.clear();
  m.inputs.clear();
  m.commits.clear();
  m.hashes.clear();
  m.closedTick = -1;
  m.history.clear();
  for (const p of m.players) p.ready = false;
  m.hostLostAt = null;
  // authority: seat 0 simulates — after a rematch dropped the old host, the new seat 0 takes over
  if (g.mode === 'authority' && m.self) m.simulate = m.players[0]?.id === m.self;
  m.state = m.simulate ? g.setup({ seed: m.seed, seats: m.seats, rng: createRng(deriveSeed(m.seed, -1)), params: m.params }) : null;
}

function maybeStart<S, I, V>(m: RoomModel<S, I, V>): void {
  if (m.phase !== 'lobby') return;
  const seated = m.players.filter((p) => p.status !== 'left');
  const { min, max } = m.game.seats;
  if (seated.length >= max || (seated.length >= min && seated.every((p) => p.ready))) startMatch(m);
}

function renumber<S, I, V>(m: RoomModel<S, I, V>): void {
  m.players.forEach((p, i) => (p.seat = i));
}

/** Two-seat match where one side is gone: the other side wins. More seats: play on. */
function forfeit<S, I, V>(m: RoomModel<S, I, V>, seat: Seat, reason: string): void {
  if (m.phase !== 'playing') return;
  const alive = m.players.filter((p) => p.status === 'on' && p.seat !== seat);
  if (m.seats === 2 || alive.length <= 1) setOutcome(m, { winner: alive.length === 1 ? alive[0]!.seat : -1, reason });
}

/** fill: 'none' waits for every present seat; 'uncommitted' fills seats with no commit (secret); 'all' fills everyone. */
function stepLockstep<S, I, V>(m: RoomModel<S, I, V>, fill: 'none' | 'uncommitted' | 'all'): boolean {
  const g = m.game;
  if (m.phase !== 'playing' || !m.state || !g.step) return false;
  const absent = absentSeats(m);
  const buf = m.inputs.get(m.tick) ?? [];
  const commits = m.commits.get(m.tick) ?? [];
  const row: I[] = [];
  for (let s = 0; s < m.seats; s++) {
    const v = buf[s];
    const fillable = absent[s] || fill === 'all' || (fill === 'uncommitted' && commits[s] === undefined);
    if (v === undefined && !fillable) return false;
    row.push(v === undefined ? g.idle : v);
  }
  m.history.set(m.tick, row);
  if (!m.keepHistory && m.history.size > HISTORY) m.history.delete(m.history.keys().next().value as number);
  const next = g.step(m.state, row, ctxFor(m, m.tick));
  if (next !== undefined) m.state = next;
  m.inputs.delete(m.tick);
  m.commits.delete(m.tick);
  m.tick += 1;
  m.tickStartT = m.now;
  m.onStep?.(m.tick);
  checkOutcome(m);
  return true;
}

function drainLockstep<S, I, V>(m: RoomModel<S, I, V>): void {
  // bounded: a batch can confirm many realtime ticks at once
  for (let i = 0; i < 100_000 && stepLockstep(m, m.closedTick === m.tick ? 'uncommitted' : 'none'); i++);
}

function sweepTime<S, I, V>(m: RoomModel<S, I, V>): void {
  const g = m.game;
  for (const p of m.players) {
    if (p.status === 'on' && m.now - p.lastT > g.presenceMs) {
      p.status = 'away';
      if (m.phase === 'playing' && g.onTimeout === 'forfeit') forfeit(m, p.seat, 'timeout');
    }
  }
  if (g.mode === 'authority' && m.phase === 'playing') {
    // the host holds the hidden state, so nobody can take over mid-match: wait `hostGraceMs` for it to come back
    // (reconnect / reload refolds the same match), then end the match for everyone instead of freezing
    const host = m.players[0];
    if (host && host.status === 'on') m.hostLostAt = null;
    else if (host) {
      m.hostLostAt ??= m.now;
      if (m.now - m.hostLostAt > g.hostGraceMs) { setOutcome(m, { winner: -1, reason: 'host-lost' }); return; }
    }
  }
  if (m.phase !== 'playing' || !m.state) return;
  if (g.mode === 'lockstep') {
    if (g.turnMs > 0 && m.now - m.tickStartT > g.turnMs) {
      const buf = g.secret ? (m.commits.get(m.tick) ?? []) : (m.inputs.get(m.tick) ?? []);
      if (m.closedTick !== m.tick) {
        if (g.onTimeout === 'forfeit') {
          const late = m.players.find((p) => p.status !== 'left' && buf[p.seat] === undefined);
          if (late) { forfeit(m, late.seat, 'timeout'); if (m.phase !== 'playing') return; }
        }
        if (g.secret) { m.closedTick = m.tick; m.closedAt = m.now; } // committed seats may still reveal
        else stepLockstep(m, 'all');
      } else if (m.now - m.closedAt > g.turnMs) stepLockstep(m, 'all'); // reveal never came
    }
    drainLockstep(m); // seats that just went away no longer block
  } else if (g.clock && m.simulate) {
    const next = g.clock(m.state, m.now, ctxFor(m, m.tick));
    if (next !== undefined) m.state = next;
    checkOutcome(m);
  }
}

/** lockstep: write `len` ticks of one seat from `t0` (values past the array or invalid = idle; first write wins). */
function putInputs<S, I, V>(m: RoomModel<S, I, V>, seat: Seat, t0: number, d: readonly unknown[], len: number): void {
  const g = m.game;
  for (let i = 0; i < len; i++) {
    const t = t0 + i;
    if (t < m.tick) continue; // late (already filled with idle)
    const v = i < d.length ? g.input(d[i], seat, m.state as S) : undefined;
    const row = m.inputs.get(t) ?? [];
    // invalid input = idle for that tick (deterministic on every client): a hacked client cannot stall the others
    if (v === undefined) { if (i < d.length) m.notice = `rejected input seat ${seat} tick ${t}`; if (row[seat] === undefined) { row[seat] = g.idle as I; m.inputs.set(t, row); } continue; }
    if (row[seat] === undefined) row[seat] = v; // first write wins, no rewrites
    m.inputs.set(t, row);
  }
}

/** Apply one log entry. Never throws on bad input: bad entries are ignored with `notice`. */
export function reduceRoom<S, I, V>(m: RoomModel<S, I, V>, e: Entry): void {
  if (e.seq <= m.lastSeq) return; // duplicate delivery after reconnect
  m.lastSeq = e.seq;
  m.now = Math.max(m.now, e.t);
  const g = m.game;
  const p = playerById(m, e.from);
  if (p) {
    // local seats share their device's link: any entry from it is presence for all of them
    for (const q of m.players) {
      if (q !== p && q.owner !== e.from) continue;
      q.lastT = m.now;
      if (q.status === 'away') { q.status = 'on'; if (q.seat === 0) m.hostLostAt = null; }
    }
  }
  sweepTime(m);
  const b = e.body as Body;
  if (!b || typeof b !== 'object' || typeof (b as { k?: unknown }).k !== 'string') { m.notice = `bad entry ${e.seq}`; return; }
  if (typeof b.n === 'number') {
    if (b.n <= (m.lastN.get(e.from) ?? 0)) return; // the same append delivered twice (client retry)
    m.lastN.set(e.from, b.n);
  }
  switch (b.k) {
    case 'hello': {
      if (b.g !== g.id || b.v !== g.version) { m.notice = `version mismatch from ${e.from}: ${b.g}@${b.v}`; return; }
      if (p) { if (p.status === 'left' && m.phase === 'lobby') p.status = 'on'; return; }
      if (m.players.length === 0 && b.params && typeof b.params === 'object') m.params = { ...b.params };
      const canSit = m.phase === 'lobby' && !b.spectate && m.players.length < g.seats.max;
      if (!canSit) { m.spectators.add(e.from); return; }
      m.spectators.delete(e.from);
      m.players.push({ id: e.from, seat: m.players.length, name: String(b.name ?? '').slice(0, 32) || `P${m.players.length + 1}`, status: 'on', ready: false, lastT: m.now });
      addLocals(m, e.from, b.locals);
      maybeStart(m);
      return;
    }
    case 'locals': {
      if (!p || m.phase !== 'lobby' || p.owner !== undefined) return;
      m.players = m.players.filter((q) => q.owner !== e.from);
      renumber(m);
      addLocals(m, e.from, b.names);
      maybeStart(m);
      return;
    }
    case 'ready': if (p && m.phase === 'lobby') { p.ready = true; for (const q of localsOf(m, e.from)) q.ready = true; maybeStart(m); } return;
    case 'leave': {
      if (!p) { m.spectators.delete(e.from); return; }
      const l = Number.isInteger(b.l) && (b.l as number) > 0 ? (b.l as number) : 0;
      const one = l > 0 ? playerById(m, localId(e.from, l)) : undefined;
      if (l > 0 && !one) return;
      const gone = one ? [one] : [p, ...localsOf(m, e.from)];
      if (m.phase === 'lobby') { m.players = m.players.filter((q) => !gone.includes(q)); renumber(m); return; }
      for (const q of gone) {
        if (q.status === 'left') continue;
        q.status = 'left';
        q.ready = false;
        if (m.phase === 'playing') {
          forfeit(m, q.seat, 'left');
          if (g.mode === 'authority' && q.seat === 0 && m.phase === 'playing') setOutcome(m, { winner: -1, reason: 'host-left' });
        }
      }
      if (m.phase === 'playing' && g.mode === 'lockstep') drainLockstep(m);
      return;
    }
    case 'commit': {
      if (!p || m.phase !== 'playing' || b.m !== m.match || p.status === 'left') return;
      // a malformed commitment must not take the seat's slot (first commit wins): ignore it, the real one still counts
      if (!Number.isInteger(b.t) || typeof b.h !== 'number' || !Number.isFinite(b.h) || b.t > m.tick + MAX_AHEAD_TICKS) { m.notice = `bad commit from seat ${p.seat}`; return; }
      if (b.t < m.tick) return;
      if (b.t === m.closedTick) { m.notice = `late commit seat ${p.seat} tick ${b.t}`; return; }
      const row = m.commits.get(b.t) ?? [];
      if (row[p.seat] === undefined) row[p.seat] = b.h >>> 0;
      m.commits.set(b.t, row);
      return;
    }
    case 'in': {
      if (g.mode !== 'lockstep' || !p || m.phase !== 'playing' || b.m !== m.match || p.status === 'left' || !m.state) return;
      if (!Array.isArray(b.d) || !Number.isInteger(b.t)) { m.notice = `bad input from seat ${p.seat}`; return; }
      if (g.secret) {
        const c = m.commits.get(b.t)?.[p.seat];
        if (c === undefined) { m.notice = `reveal without commit seat ${p.seat} tick ${b.t}`; return; }
        const forged = b.d.length !== 1 || commitHash(b.d, String(b.salt ?? '')) !== c;
        if (forged || g.input(b.d[0], p.seat, m.state) === undefined) {
          // a committed seat that reveals something else (or an invalid move) plays idle this tick, so the others don't wait out the clock
          m.notice = forged ? `reveal mismatch seat ${p.seat} tick ${b.t}` : `rejected input seat ${p.seat} tick ${b.t}`;
          if (b.t >= m.tick) { const row = m.inputs.get(b.t) ?? []; if (row[p.seat] === undefined) row[p.seat] = g.idle; m.inputs.set(b.t, row); drainLockstep(m); }
          return;
        }
      }
      if (b.t > m.tick + MAX_AHEAD_TICKS) { m.notice = `input too far ahead seat ${p.seat}`; return; }
      putInputs(m, p.seat, b.t, b.d, b.d.length);
      // local seats ride in the same entry, tick for tick (a missing or short batch = idle: a device cannot stall the room)
      if (!g.secret) for (const q of localsOf(m, e.from)) if (q.status !== 'left') putInputs(m, q.seat, b.t, Array.isArray(b.x?.[(q.local ?? 1) - 1]) ? b.x![(q.local ?? 1) - 1]! : [], b.d.length);
      drainLockstep(m);
      return;
    }
    case 'cmd': {
      const l = Number.isInteger(b.l) && (b.l as number) > 0 ? (b.l as number) : 0;
      const a = l > 0 ? playerById(m, localId(e.from, l)) : p; // the acting seat: own or one of this device's local seats
      if (g.mode === 'lockstep' || !p || !a || m.phase !== 'playing' || b.m !== m.match || a.status === 'left') return;
      if (!m.simulate || !m.state || !g.apply) return;
      const v = g.input(b.d, a.seat, m.state);
      if (v === undefined) { m.notice = `rejected command seat ${a.seat}`; return; }
      const next = g.apply(m.state, a.seat, v, ctxFor(m, m.tick));
      if (next !== undefined) m.state = next;
      m.tick += 1;
      m.onStep?.(m.tick);
      checkOutcome(m);
      return;
    }
    case 'hash': {
      if (b.m !== m.match || !p || p.status === 'left') return;
      const row = m.hashes.get(b.t) ?? new Map<string, number>();
      row.set(e.from, b.h >>> 0);
      m.hashes.set(b.t, row);
      const vals = new Set(row.values());
      if (vals.size > 1) { if (!m.desync || b.t >= m.desync.tick) m.desync = { tick: b.t, hashes: Object.fromEntries(row) }; }
      else if (m.desync && b.t > m.desync.tick && m.players.every((q) => q.owner !== undefined || q.status !== 'on' || q.seat >= m.seats || row.has(q.id))) {
        m.desync = null; // a later checkpoint where every present seat agrees: recovered (resync)
      }
      if (m.hashes.size > 64) m.hashes.delete(m.hashes.keys().next().value as number);
      return;
    }
    case 'rematch': {
      if (!p || m.phase !== 'over' || b.m !== m.match || p.status === 'left') return;
      m.rematch.add(p.seat);
      for (const q of localsOf(m, e.from)) if (q.status === 'on') m.rematch.add(q.seat); // one device votes for its local seats
      // only present players vote; away/left seats are dropped from the next match (an authority host that was lost too)
      const voters = m.players.filter((q) => q.status === 'on');
      if (voters.length >= g.seats.min && voters.every((q) => m.rematch.has(q.seat))) {
        m.players = voters;
        renumber(m);
        startMatch(m);
      }
      return;
    }
    case 'view': {
      // non-authority clients learn the end of an authority match from the authority's views
      if (!m.simulate && m.phase === 'playing' && b.m === m.match && e.from === m.players[0]?.id && b.o) setOutcome(m, b.o);
      return;
    }
    case 'clock': return;
  }
}

/** Fold a whole log (server referee, replays, tests). */
export function foldLog<S, I, V>(game: Game<S, I, V>, room: string, entries: readonly Entry[], opts?: RoomOptions): RoomModel<S, I, V> {
  const m = createRoom(game, room, opts);
  for (const e of entries) reduceRoom(m, e);
  return m;
}
