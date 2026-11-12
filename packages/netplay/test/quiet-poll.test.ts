import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSession, defineGame, generateRoomScript, hostedMcpRunner, stackscriptTransport } from '../src/index.js';
import { fakeHostedMcp, loadRoomScript } from '../src/testing/index.js';

// a WT-duel-like turn game: secret lockstep, 90 s turn clock, 45 s presence
const duel = defineGame<{ r: number[] }, number>({
  id: 'quiet-duel', version: 1, seats: { min: 2, max: 2 }, mode: 'lockstep', secret: true,
  setup: () => ({ r: [] }), input: (v) => (v === 1 || v === 2 ? v : undefined), idle: 0, step: (s, [a, b]) => { s.r.push(a! * 10 + b!); },
  timeouts: { turnMs: 90_000, presenceMs: 45_000 },
});

describe('poll efficiency: both players thinking (only heartbeats in the room)', () => {
  afterEach(() => vi.useRealTimers());
  it('heartbeats of the other player do not keep the poll at full speed', async () => {
    vi.useFakeTimers();
    const fake = fakeHostedMcp(loadRoomScript(generateRoomScript(duel)), { projectId: 1, scriptId: 'q', tokens: {} });
    const tr = (u: string) => stackscriptTransport(hostedMcpRunner({ projectId: 1, fetch: fake.browser(u) }), { scriptId: 'q', exportPrefix: 'quiet-duel' });
    const A = createSession(duel, { transport: tr('alice'), room: 'q1', autoPumpMs: 100 });
    const B = createSession(duel, { transport: tr('bob'), room: 'q1', autoPumpMs: 100 });
    await A.join(); await B.join(); A.ready(); B.ready();
    await vi.advanceTimersByTimeAsync(3000);
    expect(A.snapshot.phase).toBe('playing');
    fake.stats.reset();
    await vi.advanceTimersByTimeAsync(60_000); // nobody moves for a minute
    const perSec = fake.stats.byUser.alice! / 60;
    console.log('QUIET_POLL req/s/client', perSec.toFixed(2));
    expect(perSec).toBeLessThan(0.7); // was 1.03 (every heartbeat reset the poll to 400 ms; stretch cap 1.2 s)
    // a move still shows up fast
    A.input(1); B.input(2);
    await vi.advanceTimersByTimeAsync(3000);
    expect(A.snapshot.state!.r).toEqual([12]);
    A.leave(); B.leave();
  });
});
