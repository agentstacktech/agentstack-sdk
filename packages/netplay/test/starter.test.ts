/** examples/starter.ts («21») — the game AGENTS.md «A new multiplayer game in 10 minutes» starts from. */
import { describe, expect, it } from 'vitest';
import { generateRoomScript } from '../src/index.js';
import { createTable, loadRoomScript } from '../src/testing/index.js';
import { matchBar } from '../src/ui/index.js';
import { twentyOne, type S21 } from '../examples/starter.js';

describe('starter: «21»', () => {
  it('hostile input: not your turn, not 1–3, past 21', () => {
    const s: S21 = { total: 20, turn: 0, moves: [] };
    expect([twentyOne.input(1, 0, s), twentyOne.input(2, 0, s), twentyOne.input(1, 1, s), twentyOne.input('1', 0, s), twentyOne.input(4, 0, { ...s, total: 0 })]).toEqual([1, undefined, undefined, undefined, undefined]);
  });

  it('the AGENTS.md step-6 test: two players + spectator agree; the bar says who is on turn; rematch → series', async () => {
    const t = await createTable(twentyOne, { players: 2, spectators: 1, latencyMs: 30 });
    for (const n of [3, 3, 3, 3, 3, 3]) { t.clients[t.snaps()[0]!.state!.turn]!.input(n); await t.run(200); }
    const done = (seat: number, s: { state: unknown }) => { const st = s.state as S21 | null; return st ? seat !== st.turn : undefined; };
    expect(matchBar(t.snaps()[2]!, { done }).players.map((p) => p.status)).toEqual(['thinking…', 'ready']);
    expect(t.clients[1]!.input(3)).toBe(false); // not bruno's turn
    t.clients[0]!.input(3); await t.run(200);
    expect(t.snaps().map((s) => s.outcome?.winner)).toEqual([0, 0, 0]);
    expect(matchBar(t.snaps()[2]!).end?.title).toBe(`Winner: ${t.snaps()[0]!.players[0]!.name}`); // spectator: by name
    t.clients[0]!.rematch(); t.clients[1]!.rematch(); await t.run(300);
    expect([t.snaps()[0]!.match, t.snaps()[2]!.results.length]).toEqual([2, 1]);
  });

  it('a room script generates and loads (publishing it is an owner action)', () => {
    expect(() => loadRoomScript(generateRoomScript(twentyOne, { prefix: 'twentyone' }))).not.toThrow();
  });
});
