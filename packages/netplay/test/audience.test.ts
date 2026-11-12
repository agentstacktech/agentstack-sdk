/** Audience commands (bets, cheers): from spectators (or players with `from: 'all'`), apart from player commands. */
import { describe, expect, it } from 'vitest';
import { defineGame, type Audience } from '../src/index.js';
import { createTable, sendRaw } from '../src/testing/index.js';

type Bets = Record<string, number>;
const bet = (raw: unknown, _who: Audience, s: { bets: Bets }) => (raw === 0 || raw === 1) && s ? raw : undefined;

/** fold: first to 3 wins; the audience bets on a seat (one bet per member, the last one counts). */
const duel = defineGame<{ c: number[]; bets: Bets; seen: number[] }, number>({
  id: 'bet-duel', version: 1, seats: { min: 2, max: 2 }, mode: 'fold',
  setup: () => ({ c: [0, 0], bets: {}, seen: [] }),
  input: (raw) => (raw === 1 ? 1 : undefined),
  apply: (s, seat) => { s.c[seat]! += 1; },
  outcome: (s) => (s.c.some((v) => v >= 3) ? { winner: s.c.findIndex((v) => v >= 3), reason: 'three' } : null),
  audience: { input: bet, apply: (s, who, v, ctx) => { s.bets[who.id] = v as number; s.seen.push(who.seat, ctx.tick); } },
});

describe('audience commands', () => {
  it('fold: a spectator bets, every client applies it at the same place in the log, the tick does not move', async () => {
    const t = await createTable(duel, { players: 2, spectators: 2 });
    const [a, , s1, s2] = t.clients;
    a!.input(1); await t.run(50);
    expect(s1!.audience(1)).toBe(true);
    expect(s2!.audience(5)).toBe(false); // the game rejects it locally
    await t.run(100);
    for (const s of t.snaps()) {
      expect(s.state!.bets).toEqual({ s1: 1 });
      expect(s.state!.seen).toEqual([-1, 1]); // a spectator (seat -1), at tick 1
      expect(s.tick).toBe(1);
    }
  });

  it('players may not bet unless the game says `from: all`; forged / foreign-match / non-members are ignored', async () => {
    const t = await createTable(duel, { players: 2, spectators: 1 });
    const [a] = t.clients;
    expect(a!.audience(0)).toBe(false);
    await sendRaw(t, 0, { k: 'aud', d: 0 }); // a hacked player client
    await sendRaw(t, 2, { k: 'aud', d: 7 }); // an invalid bet
    await sendRaw(t, 2, { k: 'aud', d: 1, m: 99 }); // an old match
    await t.run(100);
    for (const s of t.snaps()) expect(s.state!.bets).toEqual({});
    expect(t.clients[1]!.snapshot.notice).toMatch(/rejected audience/);
  });

  it('`from: all` lets players bet too; no audience hook = audience() is false and entries are ignored', async () => {
    const open = defineGame({ ...duel, id: 'bet-open', audience: { ...duel.audience!, from: 'all' as const } });
    const t = await createTable(open, { players: 2 });
    expect(t.clients[1]!.audience(0)).toBe(true);
    await t.run(100);
    for (const s of t.snaps()) expect(s.state!.bets).toEqual({ u2: 0 });
    const plain = defineGame({ ...duel, id: 'no-bets', audience: undefined });
    const p = await createTable(plain, { players: 2, spectators: 1 });
    expect(p.clients[2]!.audience(1)).toBe(false);
    await sendRaw(p, 2, { k: 'aud', d: 1 }); await p.run(100);
    expect(p.clients[0]!.snapshot.state!.bets).toEqual({});
  });

  it('authority: the bet goes privately to the host, which folds it into the views', async () => {
    const hidden = defineGame<{ n: number; bets: number }, number, { n: number; bets: number }>({
      id: 'bet-auth', version: 1, seats: { min: 2, max: 2 }, mode: 'authority',
      setup: () => ({ n: 0, bets: 0 }), input: (r) => (r === 1 ? 1 : undefined), apply: (s) => { s.n++; },
      view: (s) => ({ n: s.n, bets: s.bets }),
      audience: { input: (r) => (r === 1 ? 1 : undefined), apply: (s) => { s.bets += 1; } },
    });
    const t = await createTable(hidden, { players: 2, spectators: 1 });
    expect(t.clients[2]!.audience(1)).toBe(true);
    await t.run(200);
    expect(t.clients[0]!.snapshot.state!.bets).toBe(1);
    expect(t.clients[2]!.snapshot.view).toEqual({ n: 0, bets: 1 });
    expect(t.clients[1]!.snapshot.view).toEqual({ n: 0, bets: 1 });
  });

  it('lockstep: cheers land between ticks the same way everywhere (hashes keep agreeing)', async () => {
    const tug = defineGame<{ pos: number; cheers: number }, number>({
      id: 'cheer-tug', version: 1, seats: { min: 2, max: 2 }, mode: 'lockstep',
      setup: () => ({ pos: 0, cheers: 0 }), input: (r) => (r === 0 || r === 1 ? r : undefined), idle: 0,
      step: (s, [a, b]) => { s.pos += (b as number) - (a as number) + (s.cheers % 2); },
      hashEvery: 5,
      audience: { input: (r) => (r === 1 ? 1 : undefined), apply: (s) => { s.cheers += 1; } },
    });
    const t = await createTable(tug, { players: 2, spectators: 1, latencyMs: 30 });
    await t.run(300, (c, i) => { if (i < 2) c.input(i as 0 | 1); });
    t.clients[2]!.audience(1);
    await t.run(500, (c, i) => { if (i < 2) c.input(i as 0 | 1); });
    const [a, b, s] = t.snaps();
    expect(a!.state!.cheers).toBe(1);
    expect(a!.desync).toBeNull();
    expect(b!.desync).toBeNull();
    expect(s!.state!.cheers).toBe(1);
  });
});
