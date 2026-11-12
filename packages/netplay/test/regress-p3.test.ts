import { describe, expect, it } from 'vitest';
import { createSession } from '../src/index.js';
import { createTable } from '../src/testing/index.js';
import { ticTacToe } from '../examples/tic-tac-toe.js';
import { tugOfWar } from '../examples/tug-of-war.js';

describe('pass 3 regressions', () => {
  it('a silent spectator whose link dropped reconnects and catches up (was stuck forever: it never sends, so it never noticed)', async () => {
    const t = await createTable(ticTacToe, { players: 2, spectators: 1, latencyMs: 30 });
    const [a, b, spec] = t.clients;
    t.hub.disconnect('s1');
    await t.run(200);
    a!.input(0); await t.run(300); b!.input(4); await t.run(300); a!.input(1);
    await t.run(3000);
    expect(spec!.snapshot.state).toEqual(a!.snapshot.state);
    expect(spec!.snapshot.connection).toBe('online');
  });
  it('a reload after a rematch: no match-1 hashes stamped as match 2 (false desync) and no burst of every old checkpoint (rate limit)', async () => {
    const t = await createTable(tugOfWar, { players: 2, latencyMs: 20 });
    await t.runToEnd((c, i) => c.input(i === 0 ? 1 : 0));
    t.clients.forEach((c) => c.rematch());
    await t.run(2000, (c) => c.input(0));
    expect(t.clients[0]!.snapshot.match).toBe(2);
    t.clients[1]!.close(); // reload: the new tab refolds match 1 and match 2 from the log in one go
    const s = createSession(tugOfWar, { transport: t.hub.transport('u2'), room: t.clients[0]!.snapshot.room, name: 'u2', now: () => t.hub.now, secretSeed: () => 12346 });
    const before = t.hub.log(s.snapshot.room).length;
    await s.join();
    t.clients[1] = s;
    await t.run(100, (c) => c.input(0));
    const burst = t.hub.log(s.snapshot.room).slice(before).filter((e) => e.from === 'u2' && (e.body as { k: string }).k === 'hash');
    expect(burst.length).toBeLessThanOrEqual(3); // was every checkpoint of both matches (rate-limit burst)
    await t.run(4000, (c) => c.input(0));
    expect(t.snaps().map((x) => x.desync)).toEqual([null, null]);
    expect(s.snapshot.state).toEqual(t.clients[0]!.snapshot.state);
  });
});

describe('secret reveal survives a reload while its send was failing', () => {
  it('reveal queued, link down, reload → the new tab reveals from secretStore at once (was: lost, the turn waited for the clock)', async () => {
    const { defineGame, memoryHub } = await import('../src/index.js');
    const { microtasks } = await import('../src/testing/index.js');
    const g = defineGame<{ r: number[] }, number>({
      id: 'p3-secret', version: 1, seats: { min: 2, max: 2 }, mode: 'lockstep', secret: true,
      setup: () => ({ r: [] }), input: (v) => (v === 1 || v === 2 ? v : undefined), idle: 0, step: (s, [a, b]) => { s.r.push(a! * 10 + b!); },
      timeouts: { turnMs: 60_000 },
    });
    const hub = memoryHub({ manual: true, latencyMs: 20 });
    const m = new Map<string, string>();
    const store = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
    let failA = false;
    const base = hub.transport('a');
    const flaky = { ...base, connect: async (room: string, o: Parameters<typeof base.connect>[1]) => { const l = await base.connect(room, o); return { ...l, send: (b: never, to?: string) => (failA ? Promise.reject(new Error('down')) : l.send(b, to)) }; } };
    const A = createSession(g, { transport: flaky, room: 'r', name: 'a', now: () => hub.now, secretStore: store });
    const B = createSession(g, { transport: hub.transport('b'), room: 'r', name: 'b', now: () => hub.now });
    const run = async (ms: number, ss = [A, B]) => { for (let e = 0; e < ms; e += 16) { ss.forEach((s) => s.update()); hub.advance(16); await microtasks(); } };
    await A.join(); await run(32); await B.join(); await run(32); A.ready(); B.ready(); await run(300);
    expect(A.snapshot.phase).toBe('playing');
    A.input(1); await run(200);
    failA = true; // A's sends start failing (entries still arrive)
    B.input(2); await run(300); // A sees both commits, queues its reveal — it cannot go out
    A.close(); // reload
    const A2 = createSession(g, { transport: hub.transport('a'), room: 'r', name: 'a', now: () => hub.now, secretStore: store });
    await A2.join();
    await run(2000, [A2, B]);
    expect(B.snapshot.state!.r).toEqual([12]);
  });
});

describe('pass 4: closing tab', () => {
  it('hosted requests ask for keepalive so the last write of a closing tab still goes out (big bodies do not)', async () => {
    const { hostedMcpRunner } = await import('../src/index.js');
    const seen: (boolean | undefined)[] = [];
    const r = hostedMcpRunner({ projectId: 1, fetch: (async (_u: string, init?: RequestInit) => {
      seen.push(init?.keepalive);
      return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { structuredContent: { success: true, data: { result: { ok: true } } } } }), { headers: { 'content-type': 'application/json' } });
    }) as typeof fetch });
    await r.run({ script_id: 's', export: 'x', input: { a: 1 } } as never).catch(() => {});
    await r.run({ script_id: 's', export: 'x', input: { a: 'z'.repeat(20_000) } } as never).catch(() => {});
    expect(seen).toEqual([true, false]);
  });
});
