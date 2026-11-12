import { describe, expect, it } from 'vitest';
import {
  defineGame, openPhase, phaseDone, phaseLeft, phaseTimedOut, phaseWaiting, readyPhase, resolvePhase, touchPhase, turnSeconds, unreadyPhase, TURN_CHOICES, type SimPhase,
} from '../src/index.js';
import { createTable } from '../src/testing/index.js';

describe('simultaneous phase with a deadline', () => {
  it('resolves when everyone who acts is ready; others and repeats are ignored', () => {
    let p = openPhase(1000, [2, 0, 0], 30_000);
    expect(p.needs).toEqual([0, 2]);
    expect(resolvePhase(p, 1000)).toBeNull();
    p = readyPhase(readyPhase(readyPhase(p, 1), 0), 0);
    expect(p.ready).toEqual([0]);
    expect(phaseWaiting(p)).toEqual([2]);
    expect([phaseDone(p, 0), phaseDone(p, 2), phaseDone(p, 1), phaseDone(null, 0)]).toEqual([true, false, undefined, undefined]);
    p = unreadyPhase(p, 0);
    expect(phaseDone(p, 0)).toBe(false);
    p = readyPhase(readyPhase(p, 0), 2);
    expect(resolvePhase(p, 1001)).toBe('all-ready');
  });

  it('times out (absent seats never hold it up), no clock = wait forever', () => {
    const p = openPhase(0, [0, 1], 10_000);
    expect(phaseLeft(p, 4000)).toBe(6000);
    expect(phaseLeft(p, 20_000)).toBe(0);
    expect(resolvePhase(p, 9999)).toBeNull();
    expect(resolvePhase(p, 10_000)).toBe('timeout');
    expect(phaseTimedOut(p, 10_000, 500)).toBe(false);
    expect(resolvePhase(readyPhase(p, 0), 1, [false, true])).toBe('all-ready');
    const off = openPhase(0, [0], 0);
    expect(phaseLeft(off, 1e9)).toBeNull();
    expect(resolvePhase(off, 1e9)).toBeNull();
  });

  it('a last-second input stretches the clock once', () => {
    let p = openPhase(0, [0, 1], 10_000);
    expect(touchPhase(p, 2000, 3000)).toBe(p); // plenty of time left
    p = touchPhase(p, 9000, 3000);
    expect(phaseLeft(p, 9000)).toBe(3000);
    expect(touchPhase(p, 11_500, 3000)).toBe(p); // only once
    expect(touchPhase(openPhase(0, [0], 0), 5, 3000).ms).toBe(0);
  });

  it('turnSeconds sanitizes a room param; TURN_CHOICES offers off / 30 / 60 / 90', () => {
    expect(TURN_CHOICES).toEqual([0, 30, 60, 90]);
    expect([turnSeconds(60, 30), turnSeconds(0, 30), turnSeconds(-1, 30), turnSeconds(1.5, 30), turnSeconds('60', 30), turnSeconds(999, 30)]).toEqual([60, 0, 30, 30, 30, 30]);
  });

  it('in a fold game: secret bids, reveal on all-ready or at the deadline with a default', async () => {
    type S = { ph: SimPhase; bids: (number | null)[]; shown: number[] | null; round: number };
    const ms = 5000;
    const game = defineGame<S, number, { ph: SimPhase; mine: number | null; shown: number[] | null; round: number }>({
      id: 'sealed', version: 1, seats: { min: 2, max: 2 }, mode: 'fold', clockMs: 250,
      setup: ({ seats }) => ({ ph: openPhase(0, [0, 1], ms), bids: Array(seats).fill(null), shown: null, round: 0 }),
      input: (r) => (typeof r === 'number' && Number.isInteger(r) && r >= 0 && r <= 9 ? r : undefined),
      apply: (s, seat, bid, ctx) => {
        if (s.ph.opened === 0) s.ph = { ...s.ph, opened: ctx.now };
        s.bids[seat] = bid;
        s.ph = readyPhase(touchPhase(s.ph, ctx.now, 1000), seat);
        reveal(s, ctx.now);
      },
      clock: (s, now) => { if (s.ph.opened === 0) s.ph = { ...s.ph, opened: now }; reveal(s, now); },
      view: (s, seat) => ({ ph: s.ph, mine: seat >= 0 ? s.bids[seat]! : null, shown: s.shown, round: s.round }),
    });
    function reveal(s: S, now: number) {
      const r = resolvePhase(s.ph, now);
      if (!r) return;
      s.shown = s.bids.map((b) => b ?? 0); // timeout → the default bid 0
      s.bids = s.bids.map(() => null);
      s.round += 1;
      s.ph = openPhase(now, [0, 1], ms);
    }
    const t = await createTable(game, { players: 2, latencyMs: 10 });
    const [a, b] = t.clients;
    a!.input(7);
    await t.run(300);
    expect(b!.snapshot.view!.shown).toBeNull(); // not revealed yet (fold logs are public: real secrets need `authority`)
    expect(phaseDone(b!.snapshot.view!.ph, 0)).toBe(true);
    expect(phaseDone(b!.snapshot.view!.ph, 1)).toBe(false);
    b!.input(3);
    await t.run(300);
    expect(a!.snapshot.view!.shown).toEqual([7, 3]);
    a!.input(5);
    await t.run(ms + 1000); // b never bids → default 0 at the deadline
    expect(b!.snapshot.view!.shown).toEqual([5, 0]);
    expect(b!.snapshot.view!.round).toBe(2);
  });
});
