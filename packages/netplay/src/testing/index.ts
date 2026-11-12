/**
 * Test helpers (`@agentstack/netplay/testing`): run N clients against an in-memory hub with
 * virtual time, scripted inputs and optional latency. Use them in every game's e2e test.
 */
import type { Game } from '../define.js';
import { createSession, type Session, type SessionOptions } from '../session.js';
import { memoryHub, type MemoryHub, type MemoryHubOptions } from '../transports/memory.js';
import type { Seat, Snapshot } from '../types.js';

export { loadRoomScript, scriptServer, ScriptError, type ScriptRuntime } from './scriptRuntime.js';

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
}

/** Seat `players` clients (+ spectators) in one room. Users are 'u1', 'u2', … ('s1' … for spectators). */
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

/** Convenience: seat of client i (spectators -1). */
export const seatOf = <S, I, V>(t: Table<S, I, V>, i: number): Seat => t.clients[i]!.seat;
