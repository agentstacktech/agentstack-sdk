/**
 * Example 2 — realtime: `lockstep` mode at a fixed tick rate.
 * Each frame every client sends its input (pull or not); the step runs when all inputs for the
 * tick are known. Input delay (2 ticks) hides latency; hashes catch any desync.
 */
import { defineGame } from '../src/index.js';

export interface Rope { pos: number; stamina: [number, number] }

export const tugOfWar = defineGame<Rope, 0 | 1>({
  id: 'tug-of-war',
  version: 1,
  seats: { min: 2, max: 2 },
  mode: 'lockstep',
  setup: () => ({ pos: 0, stamina: [100, 100] }),
  input: (raw) => (raw === 0 || raw === 1 ? raw : undefined),
  idle: 0,
  step: (s, [a, b], ctx) => {
    const pull = (seat: 0 | 1, on: 0 | 1) => {
      if (on && s.stamina[seat] > 0) { s.stamina[seat] -= 1; return 1 + (ctx.rng.int(4) === 0 ? 1 : 0); }
      s.stamina[seat] = Math.min(100, s.stamina[seat] + 1);
      return 0;
    };
    s.pos += pull(1, b!) - pull(0, a!);
  },
  outcome: (s) => (s.pos <= -20 ? { winner: 0, reason: 'pulled' } : s.pos >= 20 ? { winner: 1, reason: 'pulled' } : null),
  timeouts: { presenceMs: 10_000 },
  hashEvery: 10,
});
