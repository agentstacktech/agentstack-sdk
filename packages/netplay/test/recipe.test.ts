/**
 * AGENTS.md recipe, followed literally: rock–paper–scissors, best of 3, simultaneous secret moves.
 * If this file needs anything AGENTS.md does not mention, fix AGENTS.md.
 */
import { describe, expect, it } from 'vitest';
import { createSession, defineGame, generateRoomScript } from '../src/index.js';
import { createTable, loadRoomScript, microtasks, scriptServer } from '../src/testing/index.js';

// 1. types
type Move = 'r' | 'p' | 's';
interface Rps { wins: [number, number]; rounds: [Move | null, Move | null][] }
// 2–5. defineGame: hostile input check, no randomness needed, idle = no move
const beats: Record<Move, Move> = { r: 's', p: 'r', s: 'p' };
export const rps = defineGame<Rps, Move | null>({
  id: 'rps', version: 1, seats: { min: 2, max: 2 }, mode: 'lockstep', secret: true,
  setup: () => ({ wins: [0, 0], rounds: [] }),
  input: (raw) => (raw === 'r' || raw === 'p' || raw === 's' ? raw : raw === null ? null : undefined),
  idle: null,
  step: (s, [a, b]) => {
    const x = a ?? null, y = b ?? null;
    s.rounds.push([x, y]);
    if (x && (!y || beats[x] === y)) s.wins[0] += 1;
    else if (y && (!x || beats[y] === x)) s.wins[1] += 1;
  },
  outcome: (s) => (s.wins[0] >= 2 ? { winner: 0, reason: 'bo3' } : s.wins[1] >= 2 ? { winner: 1, reason: 'bo3' } : s.rounds.length >= 9 ? { winner: -1, reason: 'draw' } : null),
  timeouts: { turnMs: 15_000 },
});

describe('recipe: rock–paper–scissors from AGENTS.md', () => {
  it('unit: rules and hostile input', () => {
    expect(rps.input('x', 0, rps.setup({ seed: 1, seats: 2, rng: null as never, params: {} }))).toBeUndefined();
    expect(rps.input(42, 0, null as never)).toBeUndefined();
    const s = rps.setup({ seed: 1, seats: 2, rng: null as never, params: {} });
    rps.step!(s, ['r', 's'], null as never); rps.step!(s, [null, 'p'], null as never);
    expect(s.wins).toEqual([1, 1]);
    expect(rps.hashEvery).toBe(1); // secret ⇒ hash every turn
  });

  it('e2e: two players + spectator over a laggy link agree on everything; moves stay hidden until both commit', async () => {
    const t = await createTable(rps, { players: 2, spectators: 1, latencyMs: 80, jitterMs: 40 });
    await t.run(300);
    const play = async (a: Move, b: Move) => {
      t.clients[0]!.input(a); await t.run(400);
      expect(t.hub.log('rps-test').filter((e) => e.body.k === 'in' && (e.body as { t: number }).t === t.snaps()[0]!.tick).length).toBe(0);
      t.clients[1]!.input(b); await t.run(800);
    };
    await play('r', 's'); await play('p', 's'); await play('s', 'p');
    const [a, b, spec] = t.snaps();
    expect(a!.outcome).toEqual({ winner: 0, reason: 'bo3' });
    expect(b!.state).toEqual(a!.state); expect(spec!.state).toEqual(a!.state);
    expect(a!.desync).toBeNull();
  });

  it('server: the generated room script referees the same match', async () => {
    const rt = loadRoomScript(generateRoomScript(rps, { prefix: 'rps' }));
    const srv = scriptServer(rt, 'rps');
    const A = createSession(rps, { transport: srv.transport('ann'), room: 'g', now: () => rt.now });
    const B = createSession(rps, { transport: srv.transport('ben'), room: 'g', now: () => rt.now });
    await A.join(); srv.pump(); await B.join();
    const tick = async (n = 4) => { for (let i = 0; i < n; i++) { A.update(); B.update(); await microtasks(); srv.pump(); rt.now += 100; } };
    await tick();
    for (const [x, y] of [['r', 'p'], ['s', 'r']] as [Move, Move][]) { A.input(x); B.input(y); await tick(); }
    expect(B.snapshot.outcome).toEqual({ winner: 1, reason: 'bo3' });
    expect(A.snapshot.state).toEqual(B.snapshot.state);
  });
});
