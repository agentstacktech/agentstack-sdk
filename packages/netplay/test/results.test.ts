import { describe, expect, it } from 'vitest';
import { createSession, seriesScore } from '../src/index.js';
import { createTable, microtasks, type Table } from '../src/testing/index.js';
import { ticTacToe } from '../examples/tic-tac-toe.js';

/** Plays one tic-tac-toe match where seat `w` completes the top row (or a draw when w = -1). */
async function playMatch<S, V>(t: Table<S, number, V>, w: number) {
  const bySeat = (k: number) => t.clients.find((c) => c.seat === k)!;
  const moves = w < 0 ? [0, 1, 2, 4, 3, 5, 7, 6, 8] : w === 0 ? [0, 3, 1, 4, 2] : [3, 0, 4, 1, 8, 2];
  for (let i = 0; i < moves.length; i++) { bySeat(i % 2).input(moves[i]!); await t.run(100); }
}

describe('match results (log-derived series)', () => {
  it('every client — players, spectator, a reloaded tab — sees the same results by player id', async () => {
    const t = await createTable(ticTacToe, { players: 2, spectators: 1, latencyMs: 20 });
    const [a, b, spec] = t.clients;
    await t.run(100);
    await playMatch(t, 0); // u1 wins
    expect(a!.snapshot.results).toEqual([{ match: 1, winner: 'u1', reason: 'line' }]);
    a!.rematch(); b!.rematch(); await t.run(300);
    expect(a!.snapshot.phase).toBe('playing');
    await playMatch(t, 1);
    const w2 = t.clients.find((c) => c.seat === 1)!.snapshot.self;
    a!.rematch(); b!.rematch(); await t.run(300);
    await playMatch(t, -1); // draw
    const want = [{ match: 1, winner: 'u1', reason: 'line' }, { match: 2, winner: w2, reason: 'line' }, { match: 3, winner: '', reason: 'draw' }];
    for (const s of t.snaps()) expect(s.results).toEqual(want);
    expect(spec!.snapshot.results).toEqual(want);
    const u1 = seriesScore(a!.snapshot);
    expect(u1).toEqual({ mine: w2 === 'u1' ? 2 : 1, theirs: w2 === 'u1' ? 0 : 1, draws: 1, played: 3 });
    expect(seriesScore(spec!.snapshot, 'u1')).toEqual(u1); // a spectator can show anyone's side
    // reload: a fresh session for u2 rebuilds the same results from the log
    const again = createSession(ticTacToe, { transport: t.hub.transport('u2'), room: a!.snapshot.room, name: 'u2', now: () => t.hub.now });
    await again.join();
    for (let i = 0; i < 20; i++) { again.update(); t.hub.advance(16); await microtasks(); }
    expect(again.snapshot.results).toEqual(want);
  });
});
