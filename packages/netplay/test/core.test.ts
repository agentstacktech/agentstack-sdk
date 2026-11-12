import { describe, expect, it } from 'vitest';
import { createRng, defineGame, deriveSeed, hashState, canonicalJson, foldLog, memoryMatchmaker } from '../src/index.js';
import { ticTacToe } from '../examples/tic-tac-toe.js';

describe('defineGame', () => {
  const base = { id: 'g', version: 1, seats: { min: 2, max: 2 }, setup: () => ({}), input: () => 1 } as const;
  it('rejects inconsistent definitions early', () => {
    expect(() => defineGame({ ...base, id: 'Bad Id', mode: 'fold', apply: () => {} })).toThrow(/id/);
    expect(() => defineGame({ ...base, mode: 'lockstep' })).toThrow(/step/);
    expect(() => defineGame({ ...base, mode: 'fold' })).toThrow(/apply/);
    expect(() => defineGame({ ...base, mode: 'authority', apply: () => {} })).toThrow(/view/);
    expect(() => defineGame({ ...base, seats: { min: 3, max: 2 }, mode: 'fold', apply: () => {} })).toThrow(/seats/);
    expect(() => defineGame({ ...base, mode: 'fold', apply: () => {}, secret: true })).toThrow(/secret/);
  });
  it('fills defaults', () => {
    const g = defineGame({ ...base, mode: 'lockstep', step: () => {} });
    expect(g.hashEvery).toBe(30);
    expect(g.presenceMs).toBe(20000);
    expect(g.idle).toBeNull();
    expect(g.view({ a: 1 } as never, 0)).toEqual({ a: 1 });
    expect(defineGame({ ...base, mode: 'lockstep', step: () => {}, timeouts: { turnMs: 30000 } }).hashEvery).toBe(1);
  });
});

describe('rng + hash', () => {
  it('rng is deterministic and resumable', () => {
    const a = createRng(42), b = createRng(42);
    const xs = Array.from({ length: 50 }, () => a.u32());
    expect(Array.from({ length: 50 }, () => b.u32())).toEqual(xs);
    const c = createRng(7); c.u32(); const saved = c.save();
    expect(createRng(saved).u32()).toBe(c.u32());
    expect(new Set(xs).size).toBe(50);
    const r = createRng(1);
    for (let i = 0; i < 1000; i++) { const v = r.int(6); expect(v >= 0 && v < 6).toBe(true); }
    expect(r.shuffle([1, 2, 3, 4, 5]).sort()).toEqual([1, 2, 3, 4, 5]);
    expect(() => r.int(0)).toThrow();
    expect(deriveSeed(1, 2)).not.toBe(deriveSeed(1, 3));
  });
  it('hash is canonical (key order) and sensitive', () => {
    expect(hashState({ a: 1, b: [1, 2] })).toBe(hashState({ b: [1, 2], a: 1 }));
    expect(hashState({ a: 1 })).not.toBe(hashState({ a: 2 }));
    expect(hashState(new Int16Array([1, 2]))).toBe(hashState(new Int16Array([1, 2])));
    expect(hashState(new Int16Array([1, 2]))).not.toBe(hashState([1, 2]));
    expect(hashState({ m: new Map([[1, 'x']]) })).not.toBe(hashState({ m: new Map([[1, 'y']]) }));
    expect(hashState(0.5)).not.toBe(hashState(0.25));
    const cyc: Record<string, unknown> = {}; cyc.self = cyc;
    expect(() => hashState(cyc)).toThrow(/cyclic/);
    expect(canonicalJson({ b: 1, a: [true, null] })).toBe('{"a":[true,null],"b":1}');
  });
});

describe('room reducer (pure fold)', () => {
  const hello = (seq: number, from: string, extra = {}) => ({ seq, from, t: seq * 10, body: { k: 'hello' as const, g: 'tic-tac-toe', v: 1, ...extra } });
  it('seats, version check, spectators, duplicates', () => {
    const m = foldLog(ticTacToe, 'r', [
      hello(1, 'a'), { ...hello(2, 'x'), body: { k: 'hello', g: 'tic-tac-toe', v: 2 } }, hello(3, 'b'), hello(3, 'dup'), hello(4, 'c'),
    ]);
    expect(m.players.map((p) => [p.id, p.seat])).toEqual([['a', 0], ['b', 1]]);
    expect(m.phase).toBe('playing');
    expect(m.spectators.has('c')).toBe(true);
    expect(m.notice).toMatch(/version mismatch/); // sticky until the next problem
  });
  it('lobby leave renumbers; min seats start on ready', () => {
    const g = defineGame({ id: 'party', version: 1, seats: { min: 2, max: 4 }, mode: 'fold', setup: () => ({ n: 0 }), input: () => 1, apply: (s: { n: number }) => { s.n++; } });
    const h = (seq: number, from: string) => ({ seq, from, t: seq, body: { k: 'hello' as const, g: 'party', v: 1 } });
    const m = foldLog(g, 'r', [h(1, 'a'), h(2, 'b'), h(3, 'c'), { seq: 4, from: 'a', t: 4, body: { k: 'leave' } }]);
    expect(m.players.map((p) => p.seat)).toEqual([0, 1]);
    expect(m.phase).toBe('lobby');
    const m2 = foldLog(g, 'r', [h(1, 'a'), h(2, 'b'), { seq: 3, from: 'a', t: 3, body: { k: 'ready' } }, { seq: 4, from: 'b', t: 4, body: { k: 'ready' } }]);
    expect(m2.phase).toBe('playing');
    expect(m2.seats).toBe(2);
  });
  it('ignores garbage bodies without throwing', () => {
    const m = foldLog(ticTacToe, 'r', [hello(1, 'a'), { seq: 2, from: 'a', t: 2, body: null as never }, { seq: 3, from: 'a', t: 3, body: { k: 'zzz' } as never }]);
    expect(m.notice).toMatch(/bad entry 2/);
    expect(m.players.length).toBe(1);
  });
});

describe('matchmaking (memory)', () => {
  it('fills rooms in order and is idempotent per user', async () => {
    const mm = memoryMatchmaker();
    const a = await mm.api.find('g', 2, 'a');
    expect(await mm.api.find('g', 2, 'a')).toEqual(a);
    const b = await mm.api.find('g', 2, 'b');
    const c = await mm.api.find('g', 2, 'c');
    expect(a.room).toBe(b.room);
    expect(c.room).not.toBe(a.room);
    expect(mm.privateRoom('g').room).toMatch(/^g-p-[a-z0-9]{6}$/);
  });
});

describe('clockMs', () => {
  it('validates and drives the authority clock at the requested cadence', async () => {
    const { createTable } = await import('../src/testing/index.js');
    const base = { id: 'clk', version: 1, seats: { min: 2, max: 2 }, setup: () => ({ n: 0, last: 0 }), input: () => undefined, apply: () => {} } as const;
    expect(() => defineGame({ ...base, mode: 'fold', clockMs: 500 })).toThrow(/clockMs/);
    const g = defineGame<{ n: number; last: number }, never, number>({
      ...base, mode: 'authority', view: (s) => s.n, clockMs: 500,
      clock: (s, now) => { if (s.last && now - s.last >= 400) s.n += 1; if (!s.last || now - s.last >= 400) s.last = now; },
    });
    const t = await createTable(g, { players: 2 });
    await t.run(10_000);
    const n = t.clients[0]!.snapshot.state!.n;
    expect(n).toBeGreaterThanOrEqual(15); // ~20 beats in 10 s, default heartbeat would give ~2
    expect(t.clients[1]!.snapshot.view).toBeGreaterThanOrEqual(n - 2);
  });
});
