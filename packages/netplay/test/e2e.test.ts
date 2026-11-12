import { describe, expect, it } from 'vitest';
import { createSession, defineGame, hashState, memoryHub } from '../src/index.js';
import { createTable, microtasks, sendRaw } from '../src/testing/index.js';
import { ticTacToe } from '../examples/tic-tac-toe.js';
import { tugOfWar } from '../examples/tug-of-war.js';

describe('fold: tic-tac-toe, two clients + spectator', () => {
  it('plays, rejects cheating, ends, rematches', async () => {
    const t = await createTable(ticTacToe, { players: 2, spectators: 1, latencyMs: 40, jitterMs: 30 });
    const [a, b, spec] = t.clients;
    await t.run(200);
    expect(t.snaps().map((s) => s.phase)).toEqual(['playing', 'playing', 'playing']);
    expect([a!.seat, b!.seat, spec!.seat]).toEqual([0, 1, -1]);
    expect(b!.input(4)).toBe(false); // out of turn: refused locally (same check every client runs)
    // a hacked client bypassing its own check: the raw entry reaches the log, every client rejects it
    await sendRaw(t, 1, { k: 'cmd', d: 4 });
    await t.run(200);
    expect(a!.snapshot.state!.cells[4]).toBe(-1);
    expect(b!.snapshot.notice).toMatch(/rejected/);
    for (const [who, cell] of [[a, 0], [b, 4], [a, 1], [b, 5], [a, 2]] as const) { who!.input(cell); await t.run(200); }
    for (const s of t.snaps()) {
      expect(s.phase).toBe('over');
      expect(s.outcome).toEqual({ winner: 0, reason: 'line' });
      expect(s.view!.cells.slice(0, 3)).toEqual([0, 0, 0]);
    }
    expect(spec!.input(7)).toBe(false); // spectators cannot play
    a!.rematch(); await t.run(200);
    expect(a!.snapshot.rematch).toEqual([0]);
    expect(a!.snapshot.phase).toBe('over');
    b!.rematch(); await t.run(200);
    for (const s of t.snaps()) { expect(s.match).toBe(2); expect(s.phase).toBe('playing'); expect(s.view!.cells.every((c) => c === -1)).toBe(true); }
  });

  it('leave forfeits; presence timeout forfeits a silent player', async () => {
    const t = await createTable(ticTacToe, { players: 2 });
    await t.run(100);
    t.clients[1]!.leave(); await t.run(100);
    expect(t.clients[0]!.snapshot.outcome).toEqual({ winner: 0, reason: 'left' });

    const t2 = await createTable(ticTacToe, { players: 2 });
    await t2.run(100);
    t2.hub.block('u2');
    await t2.run(90_000);
    const s = t2.clients[0]!.snapshot;
    expect(s.phase).toBe('over');
    expect(s.outcome).toEqual({ winner: 0, reason: 'timeout' });
  });
});

describe('lockstep: tug-of-war with latency', () => {
  it('both clients compute identical states, no desync, reach an outcome', async () => {
    const t = await createTable(tugOfWar, { players: 2, latencyMs: 60, jitterMs: 40, seed: 9 });
    let frame = 0;
    await t.runToEnd((c, i) => { frame++; c.input(i === 1 ? 1 : (frame % 3 === 0 ? 1 : 0)); });
    const [a, b] = t.snaps();
    expect(a!.desync).toBeNull();
    expect(hashState(a!.state)).toBe(hashState(b!.state));
    expect(a!.tick).toBe(b!.tick);
    expect(a!.outcome).not.toBeNull();
    expect(b!.outcome).toEqual(a!.outcome);
    const hashes = t.hub.log('tug-of-war-test').filter((e) => e.body.k === 'hash');
    expect(hashes.length).toBeGreaterThan(0);
  });

  it('detects a desync (one client runs different rules)', async () => {
    const evil = defineGame({ ...tugOfWar, step: (st: { pos: number }) => { st.pos += 0; } }); // same id/version on the wire
    const h = memoryHub({ manual: true });
    const A = createSession(tugOfWar, { transport: h.transport('a'), room: 'r', now: () => h.now });
    const B = createSession(evil, { transport: h.transport('b'), room: 'r', now: () => h.now });
    await A.join(); h.advance(10); await B.join();
    for (let i = 0; i < 200; i++) { A.input(1); B.input(1); A.update(); B.update(); h.advance(16); await microtasks(); }
    expect(A.snapshot.desync).not.toBeNull();
    expect(B.snapshot.desync).toEqual(A.snapshot.desync);
    expect(Object.keys(A.snapshot.desync!.hashes).sort()).toEqual(['a', 'b']);
  });

  it('reconnect: a dropped client resumes from its last seq and converges', async () => {
    const t = await createTable(tugOfWar, { players: 2, latencyMs: 30 });
    const [a, b] = t.clients;
    await t.run(500, (c) => c.input(0));
    t.hub.disconnect('u2');
    await t.run(1500, (c) => c.input(0));
    expect(b!.snapshot.connection === 'reconnecting' || b!.snapshot.connection === 'online').toBe(true);
    await t.run(2000, (c) => c.input(0));
    expect(b!.snapshot.connection).toBe('online');
    expect(b!.snapshot.tick).toBe(a!.snapshot.tick);
    expect(hashState(b!.snapshot.state)).toBe(hashState(a!.snapshot.state));
    expect(a!.snapshot.desync).toBeNull();
  });

  it('an away seat plays idle so the match continues (presence)', async () => {
    const g = defineGame({ ...tugOfWar, id: 'tug-short', timeouts: { presenceMs: 1000 } });
    const t = await createTable(g, { players: 2 });
    await t.run(300, (c) => c.input(0));
    t.hub.block('u2');
    const before = t.clients[0]!.snapshot.tick;
    await t.run(3000, (c, i) => { if (i === 0) c.input(1); });
    const s = t.clients[0]!.snapshot;
    expect(s.players[1]!.status).toBe('away');
    expect(s.tick).toBeGreaterThan(before + 10);
    expect(s.outcome).toEqual({ winner: 0, reason: 'pulled' }); // the present player could finish the match
  });
});

describe('lockstep secret turns: rock-paper-scissors (commit–reveal)', () => {
  type RPS = { score: [number, number]; last: [number, number] | null; round: number };
  const rps = defineGame<RPS, number>({
    id: 'rps', version: 1, seats: { min: 2, max: 2 }, mode: 'lockstep', secret: true,
    setup: () => ({ score: [0, 0], last: null, round: 0 }),
    input: (raw) => (raw === 0 || raw === 1 || raw === 2 ? raw : undefined),
    idle: -1 as number,
    step: (s, [a, b]) => {
      s.round++;
      s.last = [a!, b!];
      if (a === -1 && b === -1) return;
      if (b === -1 || (a !== -1 && (a! - b! + 3) % 3 === 1)) s.score[0]++;
      else if (a === -1 || a !== b) s.score[1]++;
    },
    outcome: (s) => (s.score[0] >= 2 ? { winner: 0 } : s.score[1] >= 2 ? { winner: 1 } : null),
    timeouts: { turnMs: 5000 },
  });

  it('inputs stay hidden until both committed; game resolves', async () => {
    const t = await createTable(rps, { players: 2, latencyMs: 50 });
    const [a, b] = t.clients;
    await t.run(200);
    a!.input(0); // rock
    await t.run(300);
    const log1 = t.hub.log('rps-test');
    expect(log1.some((e) => e.body.k === 'commit')).toBe(true);
    expect(log1.some((e) => e.body.k === 'in')).toBe(false); // nothing revealed yet
    expect(a!.input(1)).toBe(false); // one commit per turn
    b!.input(2); // scissors
    await t.run(500);
    expect(a!.snapshot.state!.last).toEqual([0, 2]);
    a!.input(1); b!.input(0); await t.run(800); // paper beats rock
    expect(a!.snapshot.outcome).toEqual({ winner: 0 });
    expect(b!.snapshot.state).toEqual(a!.snapshot.state);
  });

  it('turn timer fills a missing seat with idle', async () => {
    const t = await createTable(rps, { players: 2 });
    await t.run(200);
    t.clients[0]!.input(1);
    await t.run(7000);
    expect(t.clients[0]!.snapshot.state!.last).toEqual([1, -1]);
    expect(t.clients[1]!.snapshot.state!.score).toEqual([1, 0]);
  });

  it('a forged reveal is rejected', async () => {
    const t = await createTable(rps, { players: 2 });
    await t.run(200);
    t.clients[0]!.input(0);
    await t.run(200);
    const link = await t.hub.transport('u2').connect('rps-test', { afterSeq: 1e9, onEntries: () => {} });
    await link.send({ k: 'commit', m: 1, t: 0, h: 123 });
    await link.send({ k: 'in', m: 1, t: 0, d: [1], salt: 'nope' });
    await t.run(300);
    expect(t.clients[0]!.snapshot.notice).toMatch(/reveal mismatch/);
    expect(t.clients[0]!.snapshot.tick).toBe(0);
  });
});

describe('authority: hidden hands (high card)', () => {
  type HC = { hands: number[][]; played: (number | null)[]; score: number[] };
  type V = { mine: number[]; others: number[]; played: (number | null)[]; score: number[] };
  const highCard = defineGame<HC, number, V>({
    id: 'high-card', version: 1, seats: { min: 2, max: 3 }, mode: 'authority',
    setup: ({ seats, rng }) => {
      const deck = rng.shuffle(Array.from({ length: 30 }, (_, i) => i));
      return { hands: Array.from({ length: seats }, (_, k) => deck.slice(k * 3, k * 3 + 3)), played: Array(seats).fill(null), score: Array(seats).fill(0) };
    },
    input: (raw, seat, s) => (s.played[seat] === null && s.hands[seat]!.includes(raw as number) ? (raw as number) : undefined),
    apply: (s, seat, card) => {
      s.hands[seat] = s.hands[seat]!.filter((c) => c !== card);
      s.played[seat] = card;
      if (s.played.every((p) => p !== null)) {
        const best = Math.max(...(s.played as number[]));
        s.score[s.played.indexOf(best)]! += 1;
        s.played = s.played.map(() => null);
      }
    },
    view: (s, seat) => ({ mine: seat >= 0 ? s.hands[seat]! : [], others: s.hands.map((h) => h.length), played: s.played.map((p, k) => (k === seat ? p : p === null ? null : -1)), score: s.score }),
    outcome: (s) => (s.hands.every((h) => h.length === 0) ? { winner: s.score.indexOf(Math.max(...s.score)), reason: 'score' } : null),
  });

  it('only the authority sees everything; each seat gets its own view; outcome reaches everyone', async () => {
    const t = await createTable(highCard, { players: 3, spectators: 1, latencyMs: 20 });
    const [host, p2, p3, spec] = t.clients;
    await t.run(300);
    expect(host!.snapshot.state).not.toBeNull();
    expect(p2!.snapshot.state).toBeNull();
    expect(p2!.snapshot.view!.mine).toEqual(host!.snapshot.state!.hands[1]);
    expect(spec!.snapshot.view!.mine).toEqual([]);
    // no client but the authority ever receives another seat's hand
    const seen: unknown[] = [];
    const spy = await t.hub.transport('u2').connect('high-card-test', { afterSeq: 0, onEntries: (es) => seen.push(...es) });
    await t.run(50);
    spy.close();
    const views = (seen as { to?: string; body: { k: string; seat: number } }[]).filter((e) => e.body.k === 'view');
    expect(views.every((e) => e.body.seat === -1 || e.to === 'u2')).toBe(true);
    for (let r = 0; r < 3; r++) {
      for (const c of [host, p2, p3]) c!.input((c!.snapshot.view as V).mine[0]!);
      await t.run(400);
    }
    for (const s of t.snaps()) { expect(s.phase).toBe('over'); expect(s.outcome!.reason).toBe('score'); }
    expect(host!.snapshot.outcome).toEqual(p3!.snapshot.outcome);
  });

  it('refuses to run hidden-information games over a public relay', async () => {
    const hub = memoryHub({ privateEntries: false });
    expect(() => createSession(highCard, { transport: hub.transport('a'), room: 'r' })).toThrow(/private/);
    expect(() => createSession(highCard, { transport: hub.transport('a'), room: 'r', allowPublicViews: true })).not.toThrow();
  });
});

describe('session hooks for games with their own loop', () => {
  it('confirmed(tick) returns idle-filled rows; onStep fires per tick', async () => {
    const t = await createTable(tugOfWar, { players: 2 });
    const ticks: number[] = [];
    t.clients[0]!.onStep((_s, tick) => ticks.push(tick));
    await t.run(200, (c, i) => c.input(i === 0 ? 1 : 0));
    const a = t.clients[0]!, b = t.clients[1]!;
    expect(a.confirmed(0)).toEqual([0, 0]); // delay prefill
    expect(a.confirmed(5)).toEqual([1, 0]);
    expect(b.confirmed(5)).toEqual(a.confirmed(5));
    expect(a.confirmed(10_000)).toBeNull();
    expect(ticks.slice(0, 3)).toEqual([1, 2, 3]);
    expect(ticks.at(-1)).toBe(a.snapshot.tick);
  });
});

describe('memoryHub ordering', () => {
  it('keeps each client\'s own entries in send order under jitter', async () => {
    const hub = memoryHub({ manual: true, latencyMs: 20, jitterMs: 200, seed: 4 });
    const link = await hub.transport('a').connect('r', { afterSeq: 0, onEntries: () => {} });
    for (let i = 0; i < 50; i++) void link.send({ k: 'hash', m: 1, t: i, h: i });
    hub.advance(2000);
    expect(hub.log('r').map((e) => (e.body as { t: number }).t)).toEqual(Array.from({ length: 50 }, (_, i) => i));
  });
});
