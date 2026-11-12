/** Local seats: several players on one device (same screen), mixed with remote players, with no server change. */
import { describe, expect, it } from 'vitest';
import { createSession, defineGame, memoryHub, type Session } from '../src/index.js';
import { createTable, microtasks } from '../src/testing/index.js';

/** Realtime: every seat adds its input to its own counter; the first to 30 wins. */
const race = defineGame<{ c: number[] }, number>({
  id: 'race3', version: 1, seats: { min: 2, max: 3 }, mode: 'lockstep',
  setup: ({ seats }) => ({ c: new Array(seats).fill(0) }),
  input: (raw) => (raw === 0 || raw === 1 || raw === 2 ? raw : undefined),
  idle: 0,
  step: (s, ins) => { ins.forEach((v, i) => (s.c[i]! += v)); },
  outcome: (s) => { const w = s.c.findIndex((v) => v >= 30); return w >= 0 ? { winner: w, reason: 'first' } : null; },
  timeouts: { presenceMs: 5_000 },
  hashEvery: 8,
});

/** Commands: anyone adds to their own counter (fold). */
const tally = defineGame<{ c: number[] }, number>({
  id: 'tally', version: 1, seats: { min: 2, max: 4 }, mode: 'fold',
  setup: ({ seats }) => ({ c: new Array(seats).fill(0) }),
  input: (raw) => (Number.isInteger(raw) && (raw as number) > 0 && (raw as number) < 10 ? (raw as number) : undefined),
  apply: (s, seat, v) => { s.c[seat]! += v; },
  outcome: (s) => (s.c.some((v) => v >= 10) ? { winner: s.c.findIndex((v) => v >= 10), reason: 'ten' } : null),
});

/** Hidden hands (authority): each seat only sees its own card. */
const cards = defineGame<{ hand: number[] }, number, { mine: number; seat: number }>({
  id: 'cards', version: 1, seats: { min: 2, max: 3 }, mode: 'authority',
  setup: ({ seats }) => ({ hand: Array.from({ length: seats }, (_, i) => 100 + i) }),
  input: (raw) => (raw === 1 ? 1 : undefined),
  apply: (s, seat) => { s.hand[seat]! += 1; },
  view: (s, seat) => ({ mine: seat >= 0 ? s.hand[seat]! : -1, seat }),
});

const secretDuel = defineGame<{ n: number }, number>({
  id: 'secret2', version: 1, seats: { min: 2, max: 3 }, mode: 'lockstep', secret: true,
  setup: () => ({ n: 0 }), input: (r) => (r === 1 ? 1 : undefined), idle: 0, step: (s) => { s.n++; }, timeouts: { turnMs: 1000 },
});

async function room<S, I, V>(game: Parameters<typeof createSession<S, I, V>>[0], who: { user: string; locals?: string[]; ready?: boolean }[], o: { latencyMs?: number } = {}) {
  const hub = memoryHub({ manual: true, latencyMs: o.latencyMs ?? 0 });
  const cs: Session<S, I, V>[] = [];
  for (const w of who) {
    const s = createSession(game, { transport: hub.transport(w.user), room: 'r1', name: w.user, now: () => hub.now, secretSeed: () => 7, locals: w.locals });
    await s.join();
    hub.advance(16); await microtasks();
    cs.push(s);
  }
  const run = async (ms: number, frame?: (c: Session<S, I, V>, i: number) => void) => {
    for (let e = 0; e < ms; e += 16) { cs.forEach((c, i) => { frame?.(c, i); c.update(); }); hub.advance(16); await microtasks(); }
  };
  return { hub, cs, run };
}

describe('local seats: lockstep (realtime)', () => {
  it('one device plays two seats next to a remote player; everyone folds the same state', async () => {
    const { cs, run } = await room(race, [{ user: 'ana', locals: ['bia'] }, { user: 'caio' }], { latencyMs: 40 });
    await run(100);
    const [a, c] = cs;
    expect(a!.snapshot.phase).toBe('playing'); // 3 seats = max: starts without Ready
    expect(a!.seats).toEqual([0, 1]);
    expect(c!.seats).toEqual([2]);
    expect(a!.snapshot.players.map((p) => [p.name, p.owner ?? '', p.local ?? 0])).toEqual([['ana', '', 0], ['bia', 'ana', 1], ['caio', '', 0]]);
    // ana pulls 1, bia 2 per tick (same entry); caio 1
    await run(2000, (s, i) => { if (s.snapshot.phase === 'playing') i === 0 ? s.inputs([1, 2]) : s.input(1); });
    const [sa, sc] = [a!.snapshot, c!.snapshot];
    expect(sa.outcome).toEqual({ winner: 1, reason: 'first' }); // bia was fastest
    expect(sc.state).toEqual(sa.state);
    expect(sa.desync).toBeNull();
  });

  it('a device that omits its local batch (hacked or old client) plays idle there instead of stalling the room', async () => {
    const { cs, run } = await room(race, [{ user: 'ana', locals: ['bia'] }, { user: 'caio' }]);
    await run(50);
    await run(600, (s, i) => { if (i === 0) s.input(1); else s.input(1); }); // ana sends only her own seat
    const st = cs[2 - 1]!.snapshot.state!;
    expect(st.c[1]).toBe(0); // bia idle
    expect(st.c[0]).toBeGreaterThan(5); // the room kept going
  });

  it('locals share presence: the whole device goes away together and comes back together', async () => {
    const { hub, cs, run } = await room(race, [{ user: 'ana', locals: ['bia'] }, { user: 'caio' }]);
    await run(50);
    hub.block('ana');
    await run(7000, (s, i) => { if (i === 1) s.input(0); });
    expect(cs[1]!.snapshot.players.map((p) => p.status)).toEqual(['away', 'away', 'on']);
    hub.allow('ana');
    await run(12_000, (s, i) => (i === 0 ? s.inputs([0, 0]) : s.input(0))); // reconnect backoff is capped at 10 s
    expect(cs[1]!.snapshot.players.map((p) => p.status)).toEqual(['on', 'on', 'on']);
  });

  it('leaveLocal drops one local seat; leave() takes the device with all its seats', async () => {
    const { cs, run } = await room(race, [{ user: 'ana', locals: ['bia'] }, { user: 'caio' }]);
    await run(50);
    cs[0]!.leaveLocal(1);
    await run(200, (s, i) => (i === 0 ? s.inputs([0]) : s.input(0)));
    expect(cs[1]!.snapshot.players.map((p) => p.status)).toEqual(['on', 'left', 'on']);
    expect(cs[1]!.snapshot.phase).toBe('playing'); // 3 seats: play on
    cs[0]!.leave();
    await run(200, (s) => s.input(0));
    expect(cs[1]!.snapshot.players.map((p) => p.status)).toEqual(['left', 'left', 'on']);
    expect(cs[1]!.snapshot.outcome).toEqual({ winner: 2, reason: 'left' });
  });

  it('one rematch vote covers the device; the table limit caps local seats; setLocals works in the lobby', async () => {
    const { cs, run } = await room(race, [{ user: 'ana' }, { user: 'caio', locals: ['dani', 'edu', 'fia'] }]);
    await run(50);
    expect(cs[0]!.snapshot.players.map((p) => p.name)).toEqual(['ana', 'caio', 'dani']); // max 3 seats: edu, fia not seated
    expect(cs[0]!.snapshot.phase).toBe('playing');
    await run(3000, (s, i) => (i === 0 ? s.input(2) : s.inputs([0, 0])));
    expect(cs[0]!.snapshot.phase).toBe('over');
    cs[1]!.rematch();
    await run(100);
    expect(cs[0]!.snapshot.rematch).toEqual([1, 2]);
    cs[0]!.rematch();
    await run(100);
    expect(cs[0]!.snapshot.match).toBe(2);
    expect(cs[1]!.seats).toEqual([1, 2]);

    // lobby: add / remove local seats before Ready
    const r2 = await room(race, [{ user: 'ana' }, { user: 'caio' }]);
    await r2.run(50);
    expect(r2.cs[0]!.snapshot.phase).toBe('lobby');
    expect(r2.cs[0]!.setLocals(['bia'])).toBe(true);
    await r2.run(100);
    expect(r2.cs[1]!.snapshot.phase).toBe('playing'); // 3 = max
    expect(r2.cs[1]!.snapshot.players.map((p) => p.name)).toEqual(['ana', 'caio', 'bia']);
    expect(r2.cs[0]!.seats).toEqual([0, 2]);
  });

  it('secret games ignore local seats (one screen would show every hidden move)', async () => {
    const { cs, run } = await room(secretDuel, [{ user: 'ana', locals: ['bia'] }, { user: 'caio' }]);
    await run(50);
    expect(cs[0]!.snapshot.players.map((p) => p.name)).toEqual(['ana', 'caio']);
    expect(cs[0]!.setLocals(['x'])).toBe(false);
  });
});

describe('local seats: fold and authority', () => {
  it('fold: input(cmd, j) acts as local seat j; it is validated like any seat', async () => {
    const { cs, run } = await room(tally, [{ user: 'ana', locals: ['bia'] }, { user: 'caio' }]);
    await run(50);
    cs[0]!.ready(); cs[1]!.ready();
    await run(100);
    expect(cs[1]!.snapshot.phase).toBe('playing');
    expect(cs[0]!.input(3, 1)).toBe(true);
    expect(cs[0]!.input(2)).toBe(true);
    expect(cs[0]!.input(99, 1)).toBe(false);
    expect(cs[0]!.input(1, 2)).toBe(false); // no local seat 2
    await run(100);
    expect(cs[1]!.snapshot.state!.c).toEqual([2, 3, 0]);
  });

  it('authority: the host sends each remote local seat its own view; a host plays its own local seats from the state', async () => {
    const { cs, run } = await room(cards, [{ user: 'host', locals: ['h2'] }, { user: 'ana', locals: ['bia'] }]);
    await run(100);
    expect(cs[0]!.snapshot.phase).toBe('playing');
    expect(cs[1]!.seats).toEqual([2]); // the table is full: bia not seated
    const r = await room(cards, [{ user: 'host' }, { user: 'ana', locals: ['bia'] }]);
    await r.run(100);
    const [h, a] = r.cs;
    expect(a!.seats).toEqual([1, 2]);
    expect(a!.viewFor(1)).toEqual({ mine: 101, seat: 1 });
    expect(a!.viewFor(2)).toEqual({ mine: 102, seat: 2 });
    a!.input(1, 1);
    await r.run(200);
    expect(a!.viewFor(2)).toEqual({ mine: 103, seat: 2 });
    expect(h!.snapshot.state!.hand).toEqual([100, 101, 103]);
    // host with a local seat reads it from its state
    const [h2] = cs;
    expect(h2!.viewFor(1)).toEqual({ mine: 101, seat: 1 });
  });
});

describe('local seats: compatibility', () => {
  it('plain tables are unchanged (no x in entries, seats = [seat])', async () => {
    const t = await createTable(race, { players: 3 });
    await t.run(1500, (c) => c.input(1));
    expect(t.clients.map((c) => c.seats)).toEqual([[0], [1], [2]]);
    expect(t.snaps()[0]!.outcome).toEqual({ winner: 0, reason: 'first' }); // tie broken by seat order in outcome()
  });
});

describe('local seats over the generated room script (hosted fake, unchanged server)', () => {
  it('a signed-in device with a local seat plays next to a remote user; entries per user do not grow', async () => {
    const { vi } = await import('vitest');
    const { generateRoomScript, hostedMcpRunner, stackscriptTransport } = await import('../src/index.js');
    const { fakeHostedMcp, loadRoomScript } = await import('../src/testing/index.js');
    vi.useFakeTimers();
    try {
      const fake = fakeHostedMcp(loadRoomScript(generateRoomScript(race)), { projectId: 1, scriptId: 'race-room', tokens: {} });
      const tr = (u: string) => stackscriptTransport(hostedMcpRunner({ projectId: 1, fetch: fake.browser(u), token: () => null }), { scriptId: 'race-room', exportPrefix: 'race3', intervalMs: 300 });
      const A = createSession(race, { transport: tr('alice'), room: 'h1', autoPumpMs: 50, name: 'alice', locals: ['bia'] });
      const C = createSession(race, { transport: tr('carol'), room: 'h1', autoPumpMs: 50, name: 'carol' });
      await A.join(); await vi.advanceTimersByTimeAsync(800);
      await C.join(); await vi.advanceTimersByTimeAsync(1500);
      expect(C.snapshot.players.map((p) => p.name)).toEqual(['alice', 'bia', 'carol']);
      fake.stats.reset();
      for (let i = 0; i < 400 && A.snapshot.phase === 'playing'; i++) { A.inputs([1, 2]); C.input(1); await vi.advanceTimersByTimeAsync(33); }
      expect(A.snapshot.outcome).toEqual({ winner: 1, reason: 'first' });
      expect(C.snapshot.state).toEqual(A.snapshot.state);
      // bia's inputs ride inside alice's entries: alice's request count is about carol's, not double
      expect(fake.stats.byUser.alice!).toBeLessThan(fake.stats.byUser.carol! * 1.5 + 4);
      A.leave(); C.leave();
    } finally { vi.useRealTimers(); }
  });
});

describe('lobby tags for local seats', () => {
  it('«вы», «этот экран» on my device, «на экране Ana» on the other devices', async () => {
    const { seatTag, LOBBY_LABELS } = await import('../src/ui/index.js');
    const L = LOBBY_LABELS.ru;
    const seated = [{ id: 'a', name: 'Ana' }, { id: 'a~1', name: 'Bia', owner: 'a' }, { id: 'b', name: 'Bruno' }];
    expect(seated.map((p) => seatTag(p, 'a', seated, L))).toEqual([' (вы)', ' · этот экран', '']);
    expect(seated.map((p) => seatTag(p, 'b', seated, L))).toEqual(['', ' · на экране Ana', ' (вы)']);
    expect(seatTag(seated[1]!, undefined, seated, LOBBY_LABELS.en)).toBe(" · on Ana's screen");
    expect(seatTag(seated[1]!, 'b', seated, LOBBY_LABELS.pt)).toBe(' · na tela de Ana');
  });
});
