import { describe, expect, it } from 'vitest';
import { createSession, createRng, deriveSeed } from '../src/index.js';
import { createTable, microtasks } from '../src/testing/index.js';
import { tugOfWar, type Rope } from '../examples/tug-of-war.js';

describe('lockstep keepHistory: a fresh world catches up from tick 0', () => {
  it('a reloaded tab with keepHistory gets every row of the match; without it only the last 1024', async () => {
    const t = await createTable(tugOfWar, { players: 2, latencyMs: 20 });
    // both pull now and then (stamina keeps the rope near the middle, so the match runs long)
    await t.run(30_000, (c, i) => c.input(((c.snapshot.tick >> 3) + i) % 7 === 0 ? 1 : 0));
    const live = t.clients[0]!.snapshot;
    expect(live.phase).toBe('playing');
    expect(live.tick).toBeGreaterThan(1500);
    const reload = async (keepHistory: boolean) => {
      const s = createSession(tugOfWar, { transport: t.hub.transport('u2'), room: live.room, name: 'u2', now: () => t.hub.now, keepHistory });
      await s.join();
      for (let i = 0; i < 20; i++) { s.update(); t.hub.advance(16); await microtasks(); }
      return s;
    };
    const plain = await reload(false);
    expect(plain.confirmed(0)).toBeNull(); // trimmed: a fresh local world could never catch up
    const kept = await reload(true);
    const m = kept.model;
    expect(kept.confirmed(0)).not.toBeNull();
    // replay the whole match into a fresh world, exactly like a game with its own loop does
    const w: Rope = tugOfWar.setup({ seed: m.seed, seats: 2, rng: createRng(deriveSeed(m.seed, -1)), params: m.params });
    let tick = 0;
    for (let row = kept.confirmed(tick); row; row = kept.confirmed(++tick)) {
      tugOfWar.step!(w, row, { tick, now: 0, seed: m.seed, rng: createRng(deriveSeed(m.seed, tick)), absent: [false, false] });
    }
    expect(tick).toBe(m.tick);
    expect(w).toEqual(m.state);
  });
});
