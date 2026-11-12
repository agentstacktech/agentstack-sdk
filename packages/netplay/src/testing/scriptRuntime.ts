/**
 * Local runner for scripts produced by generateRoomScript: an in-memory DNA with versions and
 * CAS, a caller identity and a clock. Lets tests drive the real generated server code.
 */
import type { Body, ConnectOptions, Entry, Link, Transport } from '../types.js';

export class ScriptError extends Error {
  constructor(readonly code: string, message: string) { super(`${code}: ${message}`); }
}

interface Cmd { name: string; validate: (raw: Record<string, unknown>) => unknown; run: (ctx: unknown, input: unknown) => unknown }

export interface ScriptRuntime {
  now: number;
  /** Call an export as `user` (null = anonymous). Throws ScriptError on err(). */
  call(user: string | null, exportName: string, input: Record<string, unknown>): Record<string, unknown>;
  readonly exports: readonly string[];
  readonly meta: Record<string, unknown>;
  /** Raw DNA (tests may inspect sizes). */
  readonly dna: Map<string, { v: string; ver: number }>;
}

export function loadRoomScript(source: string, start = 1_000_000): ScriptRuntime {
  const js = source
    .replace(/^import .*$/m, '')
    .replace(/^export const (\w+) =/gm, '__exp.$1 =');
  const __exp: Record<string, unknown> = {};
  const std = {
    defineCommand: (d: Cmd) => d,
    err: (code: string, msg: string) => new ScriptError(code, msg),
    idiv: (a: number, b: number) => Math.trunc(a / b),
  };
  new Function('__exp', 'defineCommand', 'err', 'idiv', js)(__exp, std.defineCommand, std.err, std.idiv);
  const cmds = new Map<string, Cmd>();
  for (const v of Object.values(__exp)) if (v && typeof v === 'object' && 'run' in v) cmds.set((v as Cmd).name, v as Cmd);
  const dna = new Map<string, { v: string; ver: number }>();
  const rt: ScriptRuntime = {
    now: start,
    exports: [...cmds.keys()],
    meta: __exp.NP_META as Record<string, unknown>,
    dna,
    call(user, name, input) {
      const c = cmds.get(name);
      if (!c) throw new ScriptError('NO_EXPORT', name);
      const staged = new Map<string, { v: string; ver: number }>();
      const key = (e: string, id: string): string => `${e}\u0000${id}`;
      const read = (e: string, id: string) => staged.get(key(e, id)) ?? dna.get(key(e, id));
      const ctx = {
        now_ms: rt.now,
        caller: { userId: user, roles: [], kind: 'user' },
        dna: {
          get(e: string, id: string) {
            const r = read(e, id);
            return r ? { ...JSON.parse(r.v), $id: id, $version: r.ver } : null;
          },
          put(e: string, id: string, v: unknown) {
            const cur = read(e, id);
            staged.set(key(e, id), { v: JSON.stringify(v), ver: (cur?.ver ?? 0) + 1 });
          },
          cas(e: string, id: string, ver: number, v: unknown) {
            const cur = read(e, id);
            if ((cur?.ver ?? 0) !== ver) return false;
            staged.set(key(e, id), { v: JSON.stringify(v), ver: ver + 1 });
            return true;
          },
        },
      };
      const out = c.run(ctx, c.validate(input)) as Record<string, unknown>;
      for (const [k, v] of staged) dna.set(k, v); // all-or-nothing commit
      return JSON.parse(JSON.stringify(out)) as Record<string, unknown>;
    },
  };
  return rt;
}

/**
 * Deterministic transport over a loaded room script: each client polls when you call `pump()`.
 * Mirrors what stackscriptTransport does over HTTP, without timers.
 */
export function scriptServer(rt: ScriptRuntime, prefix: string) {
  const subs: { user: string; room: string; cursor: number; on: ConnectOptions['onEntries']; alive: boolean }[] = [];
  const outbox: (() => void)[] = [];
  return {
    transport(user: string): Transport {
      return {
        caps: { privateEntries: true, kind: 'stackscript-local' },
        async connect(room: string, opts: ConnectOptions): Promise<Link> {
          const { self } = rt.call(user, `${prefix}.room.join`, { room }) as { self: string };
          const sub = { user, room, cursor: opts.afterSeq, on: opts.onEntries, alive: true };
          subs.push(sub);
          return {
            self,
            async send(body: Body, to?: string) {
              if (!sub.alive) throw new Error('closed');
              outbox.push(() => rt.call(user, `${prefix}.room.append`, { room, body: JSON.stringify(body), to: to ?? '' }));
            },
            close() { sub.alive = false; },
          };
        },
      };
    },
    /** Deliver queued appends, then let every client poll once. */
    pump(): void {
      while (outbox.length) outbox.shift()!();
      for (const s of subs) {
        if (!s.alive) continue;
        const r = rt.call(s.user, `${prefix}.room.poll`, { room: s.room, after: s.cursor }) as { entries: Record<string, unknown>[] };
        const es: Entry[] = r.entries.map((e) => ({ seq: Number(e.seq), from: String(e.from), t: Number(e.t), body: JSON.parse(String(e.body)) as Body, ...(e.to ? { to: String(e.to) } : {}) }));
        if (es.length) { s.cursor = es[es.length - 1]!.seq; s.on(es); }
      }
    },
  };
}
