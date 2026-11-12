import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSession, defineGame, memoryHub } from '../src/index.js';
import { microtasks } from '../src/testing/index.js';

const g = defineGame<{ r: number[] }, number>({
  id: 'p5-leave', version: 1, seats: { min: 2, max: 2 }, mode: 'lockstep', secret: true,
  setup: () => ({ r: [] }), input: (v) => (v === 1 || v === 2 ? v : undefined), idle: 0, step: (s, [a, b]) => { s.r.push(a! * 10 + b!); },
  timeouts: { turnMs: 90_000, presenceMs: 45_000 },
});

function table() {
  const hub = memoryHub({ manual: true, latencyMs: 20 });
  let down = false;
  const base = hub.transport('a');
  const flaky = { ...base, connect: async (room: string, o: Parameters<typeof base.connect>[1]) => {
    if (down) throw new Error('offline');
    const l = await base.connect(room, o);
    return { ...l, send: (b: never, to?: string) => (down ? Promise.reject(new Error('down')) : l.send(b, to)) };
  } };
  const A = createSession(g, { transport: flaky, room: 'r', name: 'a', now: () => hub.now });
  const B = createSession(g, { transport: hub.transport('b'), room: 'r', name: 'b', now: () => hub.now });
  const run = async (ms: number) => { for (let e = 0; e < ms; e += 16) { A.update(); B.update(); hub.advance(16); await vi.advanceTimersByTimeAsync(16); await microtasks(); } };
  const left = () => B.snapshot.players.find((p) => p.name === 'a')?.status;
  return { hub, A, B, run, left, setDown: (v: boolean) => { down = v; } };
}

describe('pass 5: a leave during a connection drop still reaches the room', () => {
  afterEach(() => vi.useRealTimers());
  it('leave() while the link is down → delivered when the network is back (was: never sent, the opponent waited presenceMs = 45 s)', async () => {
    vi.useFakeTimers();
    const t = table();
    await t.A.join(); await t.run(32); await t.B.join(); await t.run(32); t.A.ready(); t.B.ready(); await t.run(300);
    expect(t.A.snapshot.phase).toBe('playing');
    t.setDown(true);
    t.A.leave();
    await t.run(1000);
    expect(t.left()).not.toBe('left');
    t.setDown(false);
    await t.run(4000);
    expect(t.left()).toBe('left'); // ≤ ~5 s after the network came back instead of 45 s
  });
  it('a session that joins again after leave() does not send the stale leave', async () => {
    vi.useFakeTimers();
    const t = table();
    await t.A.join(); await t.run(32); await t.B.join(); await t.run(32);
    t.setDown(true); t.A.leave(); await t.run(200);
    t.setDown(false); await t.A.join(); await t.run(3000);
    expect(t.left()).not.toBe('left');
  });
});
