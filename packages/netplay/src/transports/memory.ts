/**
 * In-memory room server for tests, demos and local hot-seat. Orders entries, stamps server time,
 * enforces private entries, and simulates latency, jitter and disconnects. Deterministic in
 * `manual` mode: time only moves when you call `hub.advance(ms)`.
 */
import { createRng } from '../rng.js';
import type { Body, ConnectOptions, Entry, Link, Transport } from '../types.js';

export interface MemoryHubOptions {
  /** One-way latency (ms) client→server and server→client. */
  latencyMs?: number;
  jitterMs?: number;
  seed?: number;
  /** Virtual time; advance with hub.advance(ms). Default true. false = real timers. */
  manual?: boolean;
  /** Server enforces `to` (default true). false emulates a public relay. */
  privateEntries?: boolean;
}

interface Sub { user: string; room: string; cursor: number; onEntries: ConnectOptions['onEntries']; alive: boolean; lastDue: number }
interface Job { due: number; order: number; run: () => void }

export interface MemoryHub {
  /** Transport bound to one user identity (what the platform session would assign). */
  transport(user: string): Transport;
  /** Move virtual time forward, delivering everything due. */
  advance(ms: number): void;
  /** Advance in `stepMs` slices until nothing is in flight (or `maxMs`). */
  settle(stepMs?: number, maxMs?: number): void;
  /** Drop all links of a user (sends fail until the session reconnects). */
  disconnect(user: string): void;
  /** Refuse new connections from a user until `allow(user)`. */
  block(user: string): void;
  allow(user: string): void;
  log(room: string): readonly Entry[];
  readonly now: number;
}

export function memoryHub(o: MemoryHubOptions = {}): MemoryHub {
  const manual = o.manual ?? true;
  const lat = o.latencyMs ?? 0;
  const jit = o.jitterMs ?? 0;
  const rng = createRng(o.seed ?? 1);
  const priv = o.privateEntries ?? true;
  const logs = new Map<string, Entry[]>();
  const subs = new Set<Sub>();
  const blocked = new Set<string>();
  let jobs: Job[] = [];
  let order = 0;
  let vnow = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const now = (): number => (manual ? vnow : Date.now());
  const delay = (): number => lat + (jit ? rng.int(jit + 1) : 0);

  function schedule(due: number, run: () => void): void {
    jobs.push({ due, order: order++, run });
    if (!manual && !timer) timer = setTimeout(pump, Math.max(0, due - Date.now()));
  }
  function pump(): void {
    timer = null;
    runDue(now());
    if (!manual && jobs.length) timer = setTimeout(pump, Math.max(0, Math.min(...jobs.map((j) => j.due)) - Date.now()));
  }
  function runDue(t: number): void {
    for (;;) {
      const due = jobs.filter((j) => j.due <= t).sort((a, b) => a.due - b.due || a.order - b.order);
      if (!due.length) return;
      jobs = jobs.filter((j) => !due.includes(j));
      for (const j of due) j.run();
    }
  }
  function visible(e: Entry, user: string): boolean {
    return !priv || e.to === undefined || e.to === user || e.from === user;
  }
  function deliver(sub: Sub): void {
    const log = logs.get(sub.room) ?? [];
    const fresh = log.filter((e) => e.seq > sub.cursor);
    if (!fresh.length) return;
    sub.cursor = fresh[fresh.length - 1]!.seq;
    const mine = fresh.filter((e) => visible(e, sub.user));
    if (!mine.length) return;
    const due = Math.max(now() + delay(), sub.lastDue); // per-subscriber FIFO
    sub.lastDue = due;
    schedule(due, () => { if (sub.alive) sub.onEntries(mine); });
  }
  function append(room: string, from: string, body: Body, to?: string): void {
    const log = logs.get(room) ?? [];
    logs.set(room, log);
    const e: Entry = { seq: log.length + 1, from, t: now(), body: JSON.parse(JSON.stringify(body)) as Body, ...(to ? { to } : {}) };
    log.push(e);
    for (const s of subs) if (s.room === room && s.alive) deliver(s);
  }

  const hub: MemoryHub = {
    transport(user) {
      return {
        caps: { privateEntries: priv, kind: 'memory' },
        async connect(room, opts): Promise<Link> {
          if (blocked.has(user)) throw new Error('memoryHub: connection refused');
          const sub: Sub = { user, room, cursor: opts.afterSeq, onEntries: opts.onEntries, alive: true, lastDue: 0 };
          let upDue = 0; // uplink FIFO: jitter never reorders one client's own entries
          subs.add(sub);
          deliver(sub); // backlog for late joiners / reconnects
          return {
            self: user,
            send(body, to) {
              if (!sub.alive) return Promise.reject(new Error('memoryHub: link closed'));
              upDue = Math.max(now() + delay(), upDue);
              schedule(upDue, () => append(room, user, body, to));
              return Promise.resolve();
            },
            close() { sub.alive = false; subs.delete(sub); },
          };
        },
      };
    },
    advance(ms) {
      const end = vnow + ms;
      for (;;) {
        const next = jobs.reduce((min, j) => Math.min(min, j.due), Infinity);
        if (next > end) break;
        vnow = Math.max(vnow, next);
        runDue(vnow);
      }
      vnow = end;
    },
    settle(stepMs = 16, maxMs = 120_000) {
      for (let t = 0; t < maxMs && jobs.length; t += stepMs) hub.advance(stepMs);
    },
    disconnect(user) { for (const s of [...subs]) if (s.user === user) { s.alive = false; subs.delete(s); } },
    block(user) { blocked.add(user); hub.disconnect(user); },
    allow(user) { blocked.delete(user); },
    log: (room) => logs.get(room) ?? [],
    get now() { return now(); },
  };
  return hub;
}
