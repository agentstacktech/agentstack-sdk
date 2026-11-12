import { describe, expect, it } from 'vitest';
import { defineGame } from '../src/index.js';
import { createTable } from '../src/testing/index.js';

/** Hidden number 1..100 known only to the authority; seats guess; views say higher/lower. */
const guess = defineGame<{ secret: number; guesses: number[][]; won: number }, number, { mine: number[]; hint: string; won: number }>({
  id: 'guess', version: 1, seats: { min: 2, max: 3 }, mode: 'authority',
  timeouts: { presenceMs: 2000, hostGraceMs: 20_000 },
  setup: ({ rng, seats }) => ({ secret: 1 + rng.int(100), guesses: Array.from({ length: seats }, () => []), won: -1 }),
  input: (raw) => (Number.isInteger(raw) && (raw as number) >= 1 && (raw as number) <= 100 ? (raw as number) : undefined),
  apply: (s, seat, g) => { s.guesses[seat]!.push(g); if (g === s.secret) s.won = seat; },
  view: (s, seat) => {
    const mine = seat >= 0 ? s.guesses[seat]! : [];
    const last = mine[mine.length - 1];
    return { mine, hint: last === undefined ? '' : last < s.secret ? 'higher' : last > s.secret ? 'lower' : 'yes', won: s.won };
  },
  outcome: (s) => (s.won >= 0 ? { winner: s.won, reason: 'found' } : null),
});

describe('authority host drop', () => {
  it('host offline < grace: everyone sees the wait, the host resumes, the match continues with the same state', async () => {
    const t = await createTable(guess, { players: 3, latencyMs: 30 });
    const [host, b, c] = t.clients;
    b!.input(50); await t.run(300);
    expect(b!.snapshot.view!.mine).toEqual([50]);
    t.hub.block('u1'); t.hub.disconnect('u1');
    await t.run(4500); // presence 2 s → away; grace 20 s not reached
    expect(b!.snapshot.phase).toBe('playing');
    const wait = b!.snapshot.hostWaitMs;
    expect(wait).not.toBeNull();
    expect(wait!).toBeGreaterThan(0);
    expect(c!.snapshot.players[0]!.status).toBe('away');
    t.hub.allow('u1');
    await t.run(12_000); // reconnect backoff is capped at 10 s
    expect(b!.snapshot.hostWaitMs).toBeNull();
    expect(c!.snapshot.players[0]!.status).toBe('on');
    b!.input(25); await t.run(400);
    expect(b!.snapshot.view!.mine).toEqual([50, 25]); // the command sent after the resume was applied by the same host state
    expect(host!.snapshot.state!.guesses[1]).toEqual([50, 25]);
  });

  it('host offline > grace: the match ends as host-lost for everyone; the rest rematch and the next seat hosts', async () => {
    const t = await createTable(guess, { players: 3, latencyMs: 30 });
    const [, b, c] = t.clients;
    t.hub.block('u1'); t.hub.disconnect('u1');
    await t.run(24_000);
    for (const s of [b!, c!]) { expect(s.snapshot.phase).toBe('over'); expect(s.snapshot.outcome).toEqual({ winner: -1, reason: 'host-lost' }); }
    b!.rematch(); c!.rematch(); await t.run(600);
    for (const s of [b!, c!]) { expect(s.snapshot.phase).toBe('playing'); expect(s.snapshot.match).toBe(2); }
    expect(b!.seat).toBe(0); // the former seat 1 is the new authority
    expect(b!.snapshot.state).not.toBeNull();
    expect(c!.seat).toBe(1);
    c!.input(10); await t.run(400);
    expect(c!.snapshot.view!.mine).toEqual([10]);
    expect(['higher', 'lower', 'yes']).toContain(c!.snapshot.view!.hint);
    // the old host comes back: it refolds the same log and sees itself out of the new match
    t.hub.allow('u1'); await t.run(12_000);
    expect(t.clients[0]!.seat).toBe(-1);
    expect(t.clients[0]!.snapshot.match).toBe(2);
  });

  it('host leaves on purpose: the match ends at once (host-left)', async () => {
    const t = await createTable(guess, { players: 3, latencyMs: 30 });
    t.clients[0]!.leave(); await t.run(300);
    expect(t.clients[1]!.snapshot.outcome).toEqual({ winner: -1, reason: 'host-left' });
    expect(t.clients[2]!.snapshot.phase).toBe('over');
  });
});
