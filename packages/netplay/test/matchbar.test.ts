import { describe, expect, it } from 'vitest';
import { matchBar, MATCH_BAR_LABELS } from '../src/ui/index.js';
import { createTable } from '../src/testing/index.js';
import { ticTacToe } from '../examples/tic-tac-toe.js';
import type { Snapshot } from '../src/index.js';

const ru = { labels: MATCH_BAR_LABELS.ru };
type Snap = Snapshot<unknown, unknown>;
const base = (over: Partial<Snap>): Snap => ({
  room: 'r', self: 'a', seat: 0, seats: [0], phase: 'playing', match: 1, spectators: 0, tick: 0, state: null, view: null, outcome: null, desync: null,
  rematch: [], results: [], notice: null, hostWaitMs: null, connection: 'online', issue: null,
  players: [{ id: 'a', seat: 0, name: 'Аня', status: 'on', ready: false, lastT: 0 }, { id: 'b', seat: 1, name: 'Бруно', status: 'on', ready: false, lastT: 0 }],
  ...over,
});

describe('matchBar (presenter)', () => {
  it('players with you / thinking / ready / no connection, the clock, urgent under 10 s', () => {
    const s = base({});
    const m = matchBar(s, { ...ru, done: (seat) => seat === 0, clock: () => 9_200, detail: (seat) => `★ ${seat * 100}` });
    expect(m.players).toEqual([{ name: 'Аня', you: true, status: 'готов', detail: '★ 0' }, { name: 'Бруно', you: false, status: 'думает…', detail: '★ 100' }]);
    expect(m.clock).toEqual({ text: '10 с', urgent: true });
    expect(matchBar(s, { clock: () => 25_000 }).clock).toEqual({ text: '25 s', urgent: false });
    const away = base({ players: [s.players[0]!, { ...s.players[1]!, status: 'away' }] });
    expect(matchBar(away, { ...ru, done: () => false }).players[1]!.status).toBe('нет связи');
    expect([m.alert, matchBar(away).alert]).toEqual([false, true]); // `quiet` strips show only on an alert / spectator / end
    expect(matchBar(s, ru).players[1]!.status).toBe(''); // no turns → no thinking/ready
    expect(matchBar(s, { ...ru, pace: 'race', done: (seat) => seat === 0 }).players.map((p) => p.status)).toEqual(['закончил', 'играет…']);
  });

  it('local seats (same screen) are «you» too, and never «asked for a rematch»', () => {
    const s = base({ seats: [0, 1], players: [{ id: 'a', seat: 0, name: 'Аня', status: 'on', ready: false, lastT: 0 }, { id: 'a~1', owner: 'a', local: 1, seat: 1, name: 'Бия', status: 'on', ready: false, lastT: 0 }, { id: 'c', seat: 2, name: 'Caio', status: 'on', ready: false, lastT: 0 }] });
    expect(matchBar(s, ru).players.map((p) => p.you)).toEqual([true, true, false]);
  });

  it('end: win / lose / spectator «Победа: имя», rematch votes, the ask, blocked when someone left, series', () => {
    const over = { phase: 'over' as const, outcome: { winner: 1, reason: 'line' }, results: [{ match: 1, winner: 'a' }, { match: 2, winner: 'b' }, { match: 3, winner: '' }] };
    const lose = matchBar(base({ ...over, rematch: [1] }), ru);
    expect(lose.end).toEqual({ title: 'Вы проиграли', reason: '', rematch: { label: 'Реванш (1/2)', enabled: true }, note: 'Бруно: хочет реванш', inline: false });
    expect(lose.series).toBe('Счёт 1:1 (ничьих 1)');
    const waiting = matchBar(base({ ...over, rematch: [0] }), ru).end!;
    expect(waiting.rematch).toEqual({ label: 'Ждём остальных… (1/2)', enabled: false });
    const spec = matchBar(base({ ...over, self: 'z', seat: -1 }), { labels: MATCH_BAR_LABELS.pt });
    expect(spec.spectator).toBe(true);
    expect(spec.end!.title).toBe('Vitória: Бруно');
    expect(spec.end!.rematch).toBeNull();
    expect(spec.series).toBe('Аня 1 · Бруно 1');
    const left = base({ ...over, outcome: { winner: 0, reason: 'left' }, players: [base({}).players[0]!, { ...base({}).players[1]!, status: 'left' }] });
    const lm = matchBar(left, ru).end!;
    expect(lm.title).toBe('Вы победили!');
    expect(lm.reason).toBe('Бруно: вышел из игры');
    expect(lm.rematch!.enabled).toBe(false);
    expect(lm.note).toMatch(/новую комнату/);
    expect(matchBar(base({ ...over, rematch: [1] }), { ...ru, endPanel: false }).end).toMatchObject({ inline: true, rematch: { label: 'Реванш (1/2)', enabled: true }, note: 'Бруно: хочет реванш' });
    expect(matchBar(base({ ...over }), { ...ru, reason: (o) => (o.reason === 'line' ? 'Три в ряд' : undefined) }).end!.reason).toBe('Три в ряд');
  });

  it('coop: cleared / failed together, «Пройдено w из n»', () => {
    const s = base({ phase: 'over', outcome: { winner: -1, reason: 'cleared' }, results: [{ match: 1, winner: '', reason: 'lost' }, { match: 2, winner: '', reason: 'cleared' }] });
    const m = matchBar(s, { ...ru, kind: 'coop' });
    expect(m.end!.title).toBe('Пройдено вместе!');
    expect(m.series).toBe('Пройдено 1 из 2');
    expect(matchBar({ ...s, outcome: { winner: -1, reason: 'lost' } }, { ...ru, kind: 'coop' }).end!.title).toBe('В этот раз не вышло');
  });

  it('from a real table: same end for both players, the series after a rematch', async () => {
    const t = await createTable(ticTacToe, { players: 2, spectators: 1 });
    const [a, b, spec] = t.clients;
    for (const [who, cell] of [[a, 0], [b, 4], [a, 1], [b, 5], [a, 2]] as const) { who!.input(cell); await t.run(100); }
    expect(matchBar(a!.snapshot as Snap).end!.title).toBe('You won!');
    expect(matchBar(b!.snapshot as Snap).end!.title).toBe('You lost');
    expect(matchBar(spec!.snapshot as Snap).end!.title).toBe('Winner: u1');
    expect(matchBar(b!.snapshot as Snap).series).toBe('Series 0:1');
    a!.rematch(); await t.run(100);
    expect(matchBar(b!.snapshot as Snap).end!.note).toBe('u1 wants a rematch');
  });
});
