import { describe, expect, it } from 'vitest';
import { createSession } from '../src/index.js';
import { createTable } from '../src/testing/index.js';
import { ticTacToe } from '../examples/tic-tac-toe.js';
import { tugOfWar } from '../examples/tug-of-war.js';

describe('pass 3 regressions', () => {
  it('a silent spectator whose link dropped reconnects and catches up (was stuck forever: it never sends, so it never noticed)', async () => {
    const t = await createTable(ticTacToe, { players: 2, spectators: 1, latencyMs: 30 });
    const [a, b, spec] = t.clients;
    t.hub.disconnect('s1');
    await t.run(200);
    a!.input(0); await t.run(300); b!.input(4); await t.run(300); a!.input(1);
    await t.run(3000);
    expect(spec!.snapshot.state).toEqual(a!.snapshot.state);
    expect(spec!.snapshot.connection).toBe('online');
  });
  it('a reload after a rematch: no match-1 hashes stamped as match 2 (false desync) and no burst of every old checkpoint (rate limit)', async () => {
    const t = await createTable(tugOfWar, { players: 2, latencyMs: 20 });
    await t.runToEnd((c, i) => c.input(i === 0 ? 1 : 0));
    t.clients.forEach((c) => c.rematch());
    await t.run(2000, (c) => c.input(0));
    expect(t.clients[0]!.snapshot.match).toBe(2);
    t.clients[1]!.close(); // reload: the new tab refolds match 1 and match 2 from the log in one go
    const s = createSession(tugOfWar, { transport: t.hub.transport('u2'), room: t.clients[0]!.snapshot.room, name: 'u2', now: () => t.hub.now, secretSeed: () => 12346 });
    const before = t.hub.log(s.snapshot.room).length;
    await s.join();
    t.clients[1] = s;
    await t.run(100, (c) => c.input(0));
    const burst = t.hub.log(s.snapshot.room).slice(before).filter((e) => e.from === 'u2' && (e.body as { k: string }).k === 'hash');
    expect(burst.length).toBeLessThanOrEqual(3); // was every checkpoint of both matches (rate-limit burst)
    await t.run(4000, (c) => c.input(0));
    expect(t.snaps().map((x) => x.desync)).toEqual([null, null]);
    expect(s.snapshot.state).toEqual(t.clients[0]!.snapshot.state);
  });
});
