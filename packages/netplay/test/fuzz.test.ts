/** Pass 3: random play + drops + hide/show + rematch votes + reloads on 4 games (fold, lockstep realtime, lockstep secret, authority); every client must agree at the end. SEEDS=300 for a long run. */
import { describe, expect, it } from 'vitest';
import { createRng, createSession, defineGame, type Session } from '../src/index.js';
import { createTable, microtasks } from '../src/testing/index.js';
import { ticTacToe } from '../examples/tic-tac-toe.js';
import { tugOfWar } from '../examples/tug-of-war.js';

const rps = defineGame<{ round: number; score: [number, number] }, number>({
  id: 'fz-rps', version: 1, seats: { min: 2, max: 2 }, mode: 'lockstep', secret: true,
  setup: () => ({ round: 0, score: [0, 0] }), input: (r) => (r === 0 || r === 1 || r === 2 ? r : undefined), idle: -1,
  step: (s, [a, b]) => { s.round++; if (a !== -1 && (b === -1 || (a! - b! + 3) % 3 === 1)) s.score[0]++; else if (b !== -1 && a !== b) s.score[1]++; },
  outcome: (s) => (s.score[0] >= 3 ? { winner: 0 } : s.score[1] >= 3 ? { winner: 1 } : s.round >= 12 ? { winner: -1 } : null),
  timeouts: { turnMs: 2000 },
});
const auth = defineGame<{ n: number[]; turns: number }, number, { mine: number; total: number }>({
  id: 'fz-auth', version: 1, seats: { min: 2, max: 2 }, mode: 'authority',
  setup: () => ({ n: [0, 0], turns: 0 }), input: (r) => (r === 1 || r === 2 ? r : undefined),
  apply: (s, seat, v) => { s.n[seat]! += v; s.turns++; },
  view: (s, seat) => ({ mine: s.n[seat] ?? 0, total: s.n[0]! + s.n[1]! }),
  outcome: (s) => (s.turns >= 25 ? { winner: s.n[0]! > s.n[1]! ? 0 : s.n[1]! > s.n[0]! ? 1 : -1 } : null),
});
const games = { ttt: ticTacToe, tug: tugOfWar, rps, auth } as const;
for (const [name, game] of Object.entries(games)) {
  describe(`fuzz ${name}`, () => {
    for (let seed = 1; seed <= Number(process.env.SEEDS ?? 15); seed++) {
      it(`seed ${seed}`, async () => {
        const rng = createRng(seed);
        const t = await createTable(game as never, { players: 2, spectators: 1, latencyMs: 30, jitterMs: 25, seed });
        const cl = t.clients as Session<unknown, unknown>[];
        const users = ['u1', 'u2', 's1'];
        const actions: string[] = [];
        for (let step = 0; step < 120; step++) {
          const r = rng.int(100), i = rng.int(3);
          const c = cl[i]!;
          if (r < 55) { const v = name === 'ttt' ? rng.int(9) : name === 'rps' ? rng.int(3) : name === 'auth' ? 1 + rng.int(2) : rng.int(2); c.input(v as never); }
          else if (r < 62) { t.hub.disconnect(users[i]!); actions.push(`drop ${i}`); }
          else if (r < 68) { c.away(true); actions.push(`hide ${i}`); }
          else if (r < 76) { c.away(false); actions.push(`show ${i}`); }
          else if (r < 84) { c.rematch(); actions.push(`rematch ${i}`); }
          else if (r < 88 && i < 2) {
            // reload: a fresh session for the same user
            c.close();
            const s = createSession(game as never, { transport: t.hub.transport(users[i]!), room: c.snapshot.room, name: users[i]!, now: () => t.hub.now, secretSeed: () => 12345 + i });
            await s.join(); cl[i] = s; actions.push(`reload ${i}`);
          }
          await t.run(16 * (1 + rng.int(20)), (cc) => { if (name === 'tug') cc.input(rng.int(2) as never); });
        }
        for (const c of cl) c.away(false);
        await t.run(15_000, (cc) => { if (name === 'tug') cc.input(0 as never); });
        const s = cl.map((c) => c.snapshot);
        if (process.env.DBG) console.log(JSON.stringify(cl.map((c) => ({ conn: c.snapshot.connection, issue: c.snapshot.issue, last: (c as any).model.lastSeq, match: c.snapshot.match, phase: c.snapshot.phase, link: !!(c as any).link, retryAt: (c as any).retryAt, now: t.hub.now, outbox: (c as any).outbox.length, sending: (c as any).sending, desync: c.snapshot.desync }))), t.hub.log(cl[0]!.snapshot.room).length);
        const ctx = `${actions.join(', ')}`;
        expect(s.map((x) => x.match), ctx).toEqual([s[0]!.match, s[0]!.match, s[0]!.match]);
        expect(s.map((x) => x.phase), ctx).toEqual([s[0]!.phase, s[0]!.phase, s[0]!.phase]);
        if (name === 'auth') { const tot = s.map((x) => (x.view as { total?: number } | null)?.total ?? null); if (s[0]!.phase === 'playing' || s[0]!.phase === 'over') expect(tot[1], ctx).toEqual(tot[0]); }
        else if (s[0]!.state !== null) { expect(s[1]!.state, ctx).toEqual(s[0]!.state); expect(s[2]!.state, ctx).toEqual(s[0]!.state); }
        expect(s.map((x) => !!x.desync), ctx).toEqual([false, false, false]);
      }, 60_000);
    }
  });
}
