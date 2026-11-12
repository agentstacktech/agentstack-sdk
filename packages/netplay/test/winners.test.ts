/** Several winners (teams, shared wins): Outcome.winners → results by id, series, the match bar. */
import { describe, expect, it } from 'vitest';
import { defineGame, isWinner, normalizeOutcome, outcomeWinners, resultWinners, seriesScore, type Snapshot } from '../src/index.js';
import { matchBar, MATCH_BAR_LABELS } from '../src/ui/index.js';
import { createTable } from '../src/testing/index.js';

/** 2 on 2: seats 0+2 (team 0) vs 1+3 (team 1); a team that adds up to 10 wins together. */
const teams = defineGame<{ c: number[] }, number>({
  id: 'teams', version: 1, seats: { min: 4, max: 4 }, mode: 'fold',
  setup: ({ seats }) => ({ c: new Array(seats).fill(0) }),
  input: (raw) => (Number.isInteger(raw) && (raw as number) > 0 && (raw as number) <= 5 ? (raw as number) : undefined),
  apply: (s, seat, v) => { s.c[seat]! += v; },
  outcome: (s) => {
    for (const t of [0, 1]) if (s.c[t]! + s.c[t + 2]! >= 10) return { winner: t, winners: [t, t + 2], reason: 'team' };
    return null;
  },
});

describe('Outcome.winners', () => {
  it('helpers read both forms; normalize drops bad / duplicate seats and keeps `winner` consistent', () => {
    expect(outcomeWinners({ winner: 1 })).toEqual([1]);
    expect(outcomeWinners({ winner: -1 })).toEqual([]);
    expect(outcomeWinners({ winner: 0, winners: [0, 2] })).toEqual([0, 2]);
    expect(outcomeWinners(null)).toEqual([]);
    expect([isWinner({ winner: 0, winners: [0, 2] }, 2), isWinner({ winner: 0, winners: [0, 2] }, 1), isWinner({ winner: 0 }, -1)]).toEqual([true, false, false]);
    expect(normalizeOutcome({ winner: 7, winners: [2, 2, 9, -1, 1.5, 0] }, 4)).toEqual({ winner: 2, winners: [2, 0] });
    expect(normalizeOutcome({ winner: 1, winners: [] }, 4)).toEqual({ winner: -1, winners: [] });
    expect(normalizeOutcome({ winner: 9, reason: 'x' }, 4)).toEqual({ winner: -1, reason: 'x' });
    expect(resultWinners({ winner: 'a' })).toEqual(['a']);
    expect(resultWinners({ winner: '' })).toEqual([]);
    expect(resultWinners({ winner: 'a', winners: ['a', 'c'] })).toEqual(['a', 'c']);
  });

  it('a team win is stored with every winner id, the same on every client, and counts for each teammate', async () => {
    const t = await createTable(teams, { players: 4, spectators: 1 });
    const [a, b, c] = t.clients;
    a!.input(5); await t.run(50); c!.input(5); await t.run(200);
    for (const s of t.snaps()) {
      expect(s.phase).toBe('over');
      expect(s.outcome).toEqual({ winner: 0, winners: [0, 2], reason: 'team' });
      expect(s.results).toEqual([{ match: 1, winner: 'u1', winners: ['u1', 'u3'], reason: 'team' }]);
    }
    expect([seriesScore(a!.snapshot).mine, seriesScore(c!.snapshot).mine, seriesScore(b!.snapshot).theirs]).toEqual([1, 1, 1]);
  });
});

describe('matchBar: teams and several winners', () => {
  type Snap = Snapshot<unknown, unknown>;
  const P = (id: string, seat: number, name: string) => ({ id, seat, name, status: 'on' as const, ready: false, lastT: 0 });
  const players = [P('a', 0, 'Аня'), P('b', 1, 'Бруно'), P('c', 2, 'Caio'), P('d', 3, 'Dina')];
  const base = (over: Partial<Snap>): Snap => ({
    room: 'r', self: 'c', seat: 2, seats: [2], phase: 'over', match: 1, spectators: 0, tick: 0, state: null, view: null,
    outcome: { winner: 0, winners: [0, 2], reason: 'team' }, desync: null, rematch: [], notice: null, hostWaitMs: null, connection: 'online', issue: null,
    results: [{ match: 1, winner: 'a', winners: ['a', 'c'], reason: 'team' }], players, ...over,
  });
  const team = (seat: number) => seat % 2;
  const teamName = (t: number) => (t ? '☾ Луна' : '☀ Солнце');
  const ru = { labels: MATCH_BAR_LABELS.ru, team, teamName };

  it('every teammate of the winning team reads «Вы победили!», the other team «Вы проиграли»', () => {
    expect(matchBar(base({}), ru).end!.title).toBe('Вы победили!');
    expect(matchBar(base({ self: 'b', seat: 1, seats: [1] }), ru).end!.title).toBe('Вы проиграли');
  });

  it('a spectator sees the team by name; without teams, the winners by name', () => {
    expect(matchBar(base({ self: 'z', seat: -1, seats: [] }), ru).end!.title).toBe('Победа: ☀ Солнце');
    expect(matchBar(base({ self: 'z', seat: -1, seats: [] }), { labels: MATCH_BAR_LABELS.ru }).end!.title).toBe('Победили: Аня, Caio');
    // a custom label set that leaves `winners` out still says something sensible
    expect(matchBar(base({ self: 'z', seat: -1, seats: [] }), { labels: { ...MATCH_BAR_LABELS.en, winners: undefined } }).end!.title).toBe('Winner: Аня, Caio');
  });

  it('teammates are listed together with their team sign; the series is counted per team', () => {
    const m = matchBar(base({ phase: 'playing', outcome: null }), ru);
    expect(m.players.map((p) => `${p.team} ${p.name}`)).toEqual(['☀ Солнце Аня', '☀ Солнце Caio', '☾ Луна Бруно', '☾ Луна Dina']);
    expect(m.series).toBe('☀ Солнце 1 · ☾ Луна 0');
    expect(matchBar(base({ phase: 'playing', outcome: null }), { labels: MATCH_BAR_LABELS.ru }).players.every((p) => p.team === undefined)).toBe(true);
  });

  it('several players per side without teams: each winner gets the point', () => {
    expect(matchBar(base({ self: 'z', seat: -1, seats: [] }), { labels: MATCH_BAR_LABELS.ru }).series).toBe('Аня 1 · Бруно 0 · Caio 1 · Dina 0');
  });

  it('same screen: both my seats won → win; one of them won → the winner by name', () => {
    const two = base({ self: 'a', seat: 0, seats: [0, 2] });
    expect(matchBar(two, { labels: MATCH_BAR_LABELS.ru }).end!.title).toBe('Вы победили!');
    const split = base({ self: 'a', seat: 0, seats: [0, 1], outcome: { winner: 1, reason: 'x' } });
    expect(matchBar(split, { labels: MATCH_BAR_LABELS.ru }).end!.title).toBe('Победа: Бруно');
  });
});
