/**
 * Test helpers (`@agentstack/netplay/testing`): run N clients against an in-memory hub with
 * virtual time, scripted inputs and optional latency. Use them in every game's e2e test.
 */
import type { Game } from '../define.js';
import { createSession, type Session, type SessionOptions } from '../session.js';
import { memoryHub, type MemoryHub, type MemoryHubOptions } from '../transports/memory.js';
import type { Body, Seat, Snapshot } from '../types.js';

export { loadRoomScript, scriptServer, ScriptError, type ScriptRuntime } from './scriptRuntime.js';
export { fakeHostedMcp, hostedFixture, type FakeHostedOptions, type FakeHostedStats } from './fakeHosted.js';

/** Let pending promise callbacks (reconnects, rejected sends) run between virtual frames. */
export async function microtasks(rounds = 8): Promise<void> {
  for (let i = 0; i < rounds; i++) await Promise.resolve();
}

export interface Table<S, I, V> {
  hub: MemoryHub;
  clients: Session<S, I, V>[];
  /** Advance virtual time by ms in frames of `frameMs`, pumping every client each frame. */
  run(ms: number, frame?: (c: Session<S, I, V>, i: number) => void): Promise<void>;
  /** Run until every client sees phase 'over' (or maxMs). */
  runToEnd(frame?: (c: Session<S, I, V>, i: number) => void, maxMs?: number): Promise<void>;
  snaps(): Snapshot<S, V>[];
}

export interface TableOptions extends MemoryHubOptions {
  room?: string;
  players?: number;
  spectators?: number;
  frameMs?: number;
  session?: Partial<Omit<SessionOptions, 'transport' | 'room'>>;
  /** Players press Ready after joining (needed when players < seats.max). Default: players < seats.max. */
  ready?: boolean;
  /** Resolve only once every player sees phase `playing` (up to 10 s virtual). Default true; false = return in the lobby. */
  waitPlaying?: boolean;
}

/**
 * Seat `players` clients (+ spectators) in one room. Users are 'u1', 'u2', … ('s1' … for spectators).
 * Resolves when the match is `playing` on every player (unless `waitPlaying: false` or players < seats.min).
 */
export async function createTable<S, I, V>(game: Game<S, I, V>, o: TableOptions = {}): Promise<Table<S, I, V>> {
  const hub = memoryHub({ manual: true, ...o });
  const room = o.room ?? `${game.id}-test`;
  const frameMs = o.frameMs ?? 16;
  const clients: Session<S, I, V>[] = [];
  const n = o.players ?? game.seats.max;
  let secret = 1;
  for (let i = 0; i < n + (o.spectators ?? 0); i++) {
    const user = i < n ? `u${i + 1}` : `s${i - n + 1}`;
    const s = createSession(game, { transport: hub.transport(user), room, name: user, now: () => hub.now, salt: () => `salt-${user}-${secret++}`, secretSeed: () => 12345 + i, spectate: i >= n, ...o.session });
    await s.join();
    hub.advance(frameMs);
    await microtasks(); // deterministic join order = seat order
    clients.push(s);
  }
  if (o.ready ?? n < game.seats.max) {
    for (const c of clients.slice(0, n)) c.ready();
    hub.advance(frameMs);
    await microtasks();
  }
  // with latency the seats may still be in the lobby here: settle until every player sees `playing`
  // (so `t.clients[0].input(...)` right after `await createTable(...)` just works)
  if (n >= game.seats.min && o.waitPlaying !== false) {
    for (let e = 0; e < 10_000 && !clients.slice(0, n).every((c) => c.snapshot.phase === 'playing'); e += frameMs) {
      clients.forEach((c) => c.update());
      hub.advance(frameMs);
      await microtasks();
    }
  }
  const t: Table<S, I, V> = {
    hub, clients,
    async run(ms, frame) {
      for (let e = 0; e < ms; e += frameMs) {
        clients.forEach((c, i) => { frame?.(c, i); c.update(); });
        hub.advance(frameMs);
        await microtasks();
      }
    },
    async runToEnd(frame, maxMs = 600_000) {
      for (let e = 0; e < maxMs; e += frameMs) {
        if (clients.every((c) => c.snapshot.phase === 'over')) return;
        await t.run(frameMs, frame);
      }
      throw new Error(`createTable.runToEnd: not over after ${maxMs} ms (phases ${clients.map((c) => c.snapshot.phase).join(',')})`);
    },
    snaps: () => clients.map((c) => c.snapshot),
  };
  return t;
}

/**
 * Simulate a hacked client: append a raw body to the room log as client `i`'s user, bypassing its local
 * `input()` checks (so you can assert that every other client rejects it). `n` is stamped above anything real.
 */
export async function sendRaw<S, I, V>(t: Table<S, I, V>, i: number, body: Body | Record<string, unknown>): Promise<void> {
  const c = t.clients[i]!;
  const link = await t.hub.transport(c.snapshot.self).connect(c.snapshot.room, { afterSeq: Number.MAX_SAFE_INTEGER, onEntries: () => {} });
  await link.send({ m: c.snapshot.match, ...body, n: 2 ** 52 + ++rawN } as Body);
  link.close();
}
let rawN = 0;

/** Convenience: seat of client i (spectators -1). */
export const seatOf = <S, I, V>(t: Table<S, I, V>, i: number): Seat => t.clients[i]!.seat;
