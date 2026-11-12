import { describe, expect, it } from 'vitest';
import { defineGame, netStatus } from '../src/index.js';
import { createTable } from '../src/testing/index.js';

const race = defineGame<{ n: number[] }, number>({
  id: 'race-s', version: 1, seats: { min: 2, max: 2 }, mode: 'fold', timeouts: { presenceMs: 2000 },
  setup: ({ seats }) => ({ n: Array(seats).fill(0) }), input: (r) => (r === 1 ? 1 : undefined), apply: (s, seat) => { s.n[seat]! += 1; },
});

describe('netStatus', () => {
  it('all good → null; a silent player → player-away for the other, offline/reconnecting for them; back → null', async () => {
    const t = await createTable(race, { players: 2, latencyMs: 20 });
    const [a, b] = t.clients;
    expect(netStatus(a!.snapshot)).toBeNull();
    t.hub.block('u2'); t.hub.disconnect('u2');
    await t.run(3500);
    expect(netStatus(a!.snapshot)).toEqual({ kind: 'player-away', names: ['u2'] });
    expect(['offline', 'reconnecting']).toContain(netStatus(b!.snapshot)!.kind);
    t.hub.allow('u2');
    await t.run(12_000);
    expect(netStatus(a!.snapshot)).toBeNull();
    expect(netStatus(b!.snapshot)).toBeNull();
  });
});
