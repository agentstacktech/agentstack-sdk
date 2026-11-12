import { describe, expect, it } from 'vitest';
import { defineGame } from '../src/index.js';
import { createTable } from '../src/testing/index.js';

const duel = defineGame<{ n: number }, number>({
  id: 'turn-clock', version: 1, seats: { min: 2, max: 2 }, mode: 'lockstep', secret: true,
  setup: () => ({ n: 0 }), input: (r) => (r === 1 ? 1 : undefined), idle: 0, step: (s) => { s.n++; },
  timeouts: { turnMs: 10_000 },
});

describe('turnLeftMs: the turn clock does not mix the device clock with the room clock', () => {
  it('a device clock 1 h ahead still shows the real time left and counts down', async () => {
    let skew = 0;
    const t = await createTable(duel, { players: 2 });
    // client 0 runs on a skewed clock (the hub stamps entries with its own time)
    (t.clients[0] as unknown as { now: () => number }).now = () => t.hub.now + skew;
    skew = 3_600_000;
    await t.run(1000);
    const a = t.clients[0]!, b = t.clients[1]!;
    const la = a.turnLeftMs()!, lb = b.turnLeftMs()!;
    expect(la).toBeGreaterThan(8000);
    expect(Math.abs(la - lb)).toBeLessThan(600);
    await t.run(3000);
    expect(a.turnLeftMs()!).toBeLessThan(la - 2500);
    expect(a.turnLeftMs()!).toBeGreaterThan(4000);
    // naive device-clock maths would say the turn ended an hour ago
    const m = (a as unknown as { model: { tickStartT: number } }).model;
    expect(10_000 - (t.hub.now + skew - m.tickStartT)).toBeLessThan(0);
  });
  it('null for a game without a turn clock', async () => {
    const t = await createTable(defineGame({ ...duel, id: 'no-clock', timeouts: {} }), { players: 2 });
    expect(t.clients[0]!.turnLeftMs()).toBeNull();
  });
});
