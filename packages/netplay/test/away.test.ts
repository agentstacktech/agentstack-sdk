/** Background tab: `session.away(true)` — nobody waits for the hidden seats; back = present again. */
import { describe, expect, it } from 'vitest';
import { defineGame, netStatus } from '../src/index.js';
import { bindVisibility, matchBar, MATCH_BAR_CSS, MATCH_BAR_LABELS } from '../src/ui/index.js';
import { createTable } from '../src/testing/index.js';

const race = defineGame<{ c: number[] }, number>({
  id: 'away-race', version: 1, seats: { min: 2, max: 2 }, mode: 'lockstep',
  setup: () => ({ c: [0, 0] }), input: (r) => (r === 0 || r === 1 ? r : undefined), idle: 0,
  step: (s, ins) => { ins.forEach((v, i) => (s.c[i]! += v as number)); },
  timeouts: { presenceMs: 5_000 }, hashEvery: 10,
});

describe('away (background tab)', () => {
  it('lockstep: the room stops waiting at once (not after presenceMs), shows «отошёл», no alarm; back = on again', async () => {
    const t = await createTable(race, { players: 2 });
    const [a, b] = t.clients;
    await t.run(200, (c) => c.input(1));
    b!.away(true);
    const tick0 = a!.snapshot.tick;
    await t.run(1000, (c, i) => { if (i === 0) c.input(1); }); // b's tab sleeps: sends nothing
    expect(a!.snapshot.tick).toBeGreaterThan(tick0 + 30); // ~60 ticks played without b, far before 5 s
    const pb = a!.snapshot.players[1]!;
    expect([pb.status, pb.hidden]).toEqual(['away', true]);
    expect(netStatus(a!.snapshot)).toBeNull(); // not a connection problem
    expect(matchBar(a!.snapshot, { labels: MATCH_BAR_LABELS.ru }).players[1]!.status).toBe('отошёл');
    // a background tab stays quiet: no heartbeats that would mark it present again
    await t.run(2000, (c, i) => { if (i === 0) c.input(1); });
    expect(a!.snapshot.players[1]!.status).toBe('away');
    b!.away(false);
    await t.run(400, (c) => c.input(1));
    expect(a!.snapshot.players[1]!.status).toBe('on');
    expect(a!.snapshot.players[1]!.hidden).toBeFalsy();
    expect(a!.snapshot.desync).toBeNull();
    expect(b!.snapshot.tick).toBeGreaterThan(0);
  });

  it('lockstep with batched inputs (HTTP sendEveryMs): inputs queued before away() do not bring the seat back', async () => {
    const t = await createTable(race, { players: 2, session: { sendEveryMs: 100 } });
    const [a, b] = t.clients;
    await t.run(300, (c) => c.input(1));
    b!.input(1); // still in b's batch when the tab hides
    b!.away(true);
    await t.run(1500, (c, i) => { if (i === 0) c.input(1); else c.update(); }); // b's throttled timer keeps pumping
    expect(a!.snapshot.players[1]).toMatchObject({ status: 'away', hidden: true });
    b!.away(false);
    await t.run(400, (c) => c.input(1));
    expect(a!.snapshot.players[1]!.status).toBe('on');
    expect(a!.snapshot.desync).toBeNull();
  });

  it('a hidden seat is still held to the forfeit timeout', async () => {
    const strict = defineGame({ ...race, id: 'away-strict', timeouts: { presenceMs: 3_000, onTimeout: 'forfeit' as const } });
    const t = await createTable(strict, { players: 2 });
    const [a, b] = t.clients;
    await t.run(100, (c) => c.input(1));
    b!.away(true);
    await t.run(1000, (c, i) => { if (i === 0) c.input(1); });
    expect(a!.snapshot.phase).toBe('playing');
    await t.run(3000, (c, i) => { if (i === 0) c.input(1); });
    expect(a!.snapshot.phase).toBe('over');
    expect(a!.snapshot.outcome).toMatchObject({ winner: 0, reason: 'timeout' });
  });

  it('away() outside a match or for a spectator sends nothing; repeated calls are one entry', async () => {
    const t = await createTable(race, { players: 2, spectators: 1, waitPlaying: true });
    const before = t.hub.log(`${race.id}-test`).length;
    t.clients[2]!.away(true);
    t.clients[0]!.away(true); t.clients[0]!.away(true);
    await t.run(50);
    const added = t.hub.log(`${race.id}-test`).slice(before).filter((e) => (e.body as { k: string }).k === 'away');
    expect(added.length).toBe(1);
  });

  it('bindVisibility wires visibilitychange both ways and unbinds', () => {
    const calls: boolean[] = [];
    let fn: (() => void) | null = null;
    const doc = { hidden: false, addEventListener: (_: string, f: () => void) => { fn = f; }, removeEventListener: () => { fn = null; } };
    const off = bindVisibility({ away: (h: boolean) => calls.push(h) }, doc as unknown as Document);
    doc.hidden = true; fn!(); doc.hidden = false; fn!();
    off();
    expect(calls).toEqual([true, false]);
    expect(fn).toBeNull();
  });
});

describe('match bar CSS', () => {
  it('[hidden] wins over .np-bar{display:flex} (the quiet strip really hides: no second player list on phones)', () => {
    expect(MATCH_BAR_CSS).toMatch(/\.np-bar\[hidden\][^{]*\{display:none!important\}/);
    expect(MATCH_BAR_CSS).toMatch(/\.np-end\[hidden\]/);
  });
});

describe('away: background polling slows down (battery, data, request budget)', () => {
  it('a hidden tab polls every ≥3 s instead of 0.4 s and catches up at once on return', async () => {
    const { vi } = await import('vitest');
    const { pollingTransport, createSession: cs } = await import('../src/index.js');
    vi.useFakeTimers();
    try {
      const log: { seq: number; from: string; t: number; body: { k: string } }[] = [];
      let polls = 0;
      const api = {
        privateEntries: false,
        async join() { return { self: 'b' }; },
        async append(_r: string, body: unknown) { log.push({ seq: log.length + 1, from: 'b', t: Date.now(), body: body as { k: string } }); },
        async poll(_r: string, after: number) { polls++; log.push({ seq: log.length + 1, from: 'a', t: Date.now(), body: { k: 'clock' } }); return log.filter((e) => e.seq > after); },
      };
      const s = cs(race, { transport: pollingTransport(api as never, { intervalMs: 400 }), room: 'r' });
      await s.join();
      await vi.advanceTimersByTimeAsync(4000);
      const active = polls;
      (s as unknown as { hidden: boolean; model: { phase: string } }).model.phase = 'playing'; // away() only acts mid-match
      s.away(true);
      polls = 0;
      await vi.advanceTimersByTimeAsync(12_000);
      const hidden = polls;
      polls = 0;
      s.away(false);
      await vi.advanceTimersByTimeAsync(10);
      expect(active).toBeGreaterThanOrEqual(8); // ~10 polls in 4 s
      expect(hidden).toBeLessThanOrEqual(5); // ≤ 4–5 polls in 12 s
      expect(polls).toBeGreaterThanOrEqual(1); // back: polled at once
      s.close();
    } finally { vi.useRealTimers(); }
  });
});

describe('away: a move from a background tab restores normal polling', () => {
  it('pace(3000) on away, pace(null) on the first move (was: stayed slow while counted present)', async () => {
    const t = await createTable(race, { players: 2 });
    await t.run(200, (c) => c.input(1));
    const b = t.clients[1]!;
    const calls: (number | null)[] = [];
    (b as unknown as { link: { pace?: (ms: number | null) => void } }).link.pace = (ms) => { calls.push(ms); };
    b.away(true);
    expect(calls).toEqual([3000]);
    await t.run(300, (c) => c.input(1)); // b plays from the background (e.g. an auto clock)
    expect(calls).toEqual([3000, null]);
  });
});
