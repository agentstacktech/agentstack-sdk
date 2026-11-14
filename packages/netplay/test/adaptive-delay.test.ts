import { describe, expect, it } from 'vitest';
import { createSession, defineGame, memoryHub } from '../src/index.js';
import { microtasks } from '../src/testing/index.js';

// 30 Hz realtime lockstep over a slow relay (≈500 ms one way, as measured on the live stream relay 13.11.2026)
const g = defineGame<{ n: number; sum: number }, number>({
  id: 'adaptive-rt', version: 1, seats: { min: 2, max: 2 }, mode: 'lockstep',
  setup: () => ({ n: 0, sum: 0 }), input: (v) => (typeof v === 'number' ? v : undefined), idle: 0,
  step: (s, row) => { s.n++; s.sum += (row[0] ?? 0) + (row[1] ?? 0); },
});
const TICK = 1000 / 30;

async function play(opts: Record<string, unknown>, ms: number) {
  const hub = memoryHub({ manual: true, latencyMs: 500 });
  const mk = (u: string) => createSession(g, { transport: hub.transport(u), room: 'r', name: u, now: () => hub.now, ...opts });
  const A = mk('a'), B = mk('b');
  const loop = async (span: number, game = false) => {
    let acc = [0, 0];
    for (let e = 0; e < span; e += 16) {
      [A, B].forEach((s, i) => {
        s.update();
        if (!game || s.snapshot.phase !== 'playing') return;
        acc[i]! += 16;
        // a fixed-step game loop: submit, then step only when the row is confirmed (stalls otherwise)
        while (acc[i]! >= TICK) { s.inputs([1]); if (!s.confirmed(s.model.tick)) break; acc[i]! -= TICK; }
      });
      hub.advance(16); await microtasks();
    }
  };
  await A.join(); await B.join(); await loop(2500); A.ready(); B.ready(); await loop(3000);
  expect(A.snapshot.phase).toBe('playing');
  const t0 = A.model.tick;
  await loop(ms, true);
  return { ticksPerS: ((A.model.tick - t0) * 1000) / ms, A, B };
}

describe('adaptiveDelay', () => {
  it('fixed 2-tick delay crawls on a 0.5 s relay (the live Serpent symptom)', async () => {
    const r = await play({ inputDelay: 2 }, 6000);
    expect(r.ticksPerS).toBeLessThan(12);
  });
  it('adaptive lead follows the slowest echo and keeps ~30 ticks/s; both worlds agree', async () => {
    const r = await play({ inputDelay: 2, adaptiveDelay: { tickMs: TICK, max: 60 }, maxAhead: 12 }, 8000);
    expect(r.ticksPerS).toBeGreaterThan(24);
    expect(r.A.leadInfo().target).toBeGreaterThanOrEqual(30);
    expect(r.B.leadInfo().target).toBe(r.A.leadInfo().target);
    const common = Math.min(r.A.model.tick, r.B.model.tick);
    expect(common).toBeGreaterThan(150);
    expect(r.A.snapshot.desync).toBeNull();
    expect(r.B.snapshot.desync).toBeNull();
  });
});
