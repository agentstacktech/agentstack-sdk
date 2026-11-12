import { hashState } from './hash.js';
import type { GameDef, Seat } from './types.js';

/** A validated game definition with defaults filled in. */
export interface Game<S, I, V = S> extends GameDef<S, I, V> {
  readonly view: (state: S, seat: Seat) => V;
  readonly hash: (state: S) => number;
  readonly idle: I;
  readonly hashEvery: number;
  readonly turnMs: number;
  readonly presenceMs: number;
  readonly onTimeout: 'idle' | 'forfeit';
}

const ID = /^[a-z0-9][a-z0-9-]{0,47}$/;

/**
 * Declare a multiplayer game. Throws early (at import time) on an inconsistent definition so
 * mistakes surface in tests, not in a live match.
 *
 * ```ts
 * export const pong = defineGame({ id: 'pong', version: 1, seats: { min: 2, max: 2 }, mode: 'lockstep',
 *   setup: () => ({ y: [0, 0] }), input: (raw) => (raw === -1 || raw === 0 || raw === 1 ? raw : undefined),
 *   idle: 0, step: (s, inputs) => { inputs.forEach((d, i) => (s.y[i] += d)); } });
 * ```
 */
export function defineGame<S, I, V = S>(def: GameDef<S, I, V>): Game<S, I, V> {
  if (!ID.test(def.id)) throw new Error(`defineGame: id "${def.id}" must match ${ID}`);
  if (!Number.isInteger(def.version) || def.version < 1) throw new Error('defineGame: version must be an integer ≥ 1');
  const { min, max } = def.seats;
  if (!(Number.isInteger(min) && Number.isInteger(max) && min >= 1 && max >= min && max <= 64)) throw new Error('defineGame: seats must satisfy 1 ≤ min ≤ max ≤ 64');
  if (def.mode === 'lockstep' && !def.step) throw new Error('defineGame: lockstep games need step()');
  if (def.mode !== 'lockstep' && !def.apply) throw new Error(`defineGame: ${def.mode} games need apply()`);
  if (def.mode === 'authority' && !def.view) throw new Error('defineGame: authority games need view() (what each seat may see)');
  if (def.secret && def.mode !== 'lockstep') throw new Error('defineGame: secret (commit–reveal) is a lockstep option');
  const turnBased = def.mode === 'lockstep' && (def.timeouts?.turnMs ?? 0) >= 1000;
  return {
    ...def,
    view: def.view ?? ((s: S) => s as unknown as V),
    hash: def.hash ?? hashState,
    idle: (def.idle ?? null) as I,
    hashEvery: def.hashEvery ?? (turnBased || def.secret ? 1 : 30),
    turnMs: def.timeouts?.turnMs ?? 0,
    presenceMs: def.timeouts?.presenceMs ?? 20_000,
    onTimeout: def.timeouts?.onTimeout ?? 'idle',
  };
}
