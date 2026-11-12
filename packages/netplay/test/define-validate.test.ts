import { describe, expect, it } from 'vitest';
import { defineGame } from '../src/index.js';

const base = { id: 'v-test', version: 1, seats: { min: 2, max: 2 }, mode: 'fold' as const, setup: () => ({}), input: () => 1, apply: () => {} };
describe('defineGame validation (plain errors instead of silent misbehaviour)', () => {
  it('rejects bad numbers and unknown onTimeout', () => {
    expect(() => defineGame({ ...base, timeouts: { presenceMs: -1 } })).toThrow(/timeouts.presenceMs must be a finite number ≥ 0/);
    expect(() => defineGame({ ...base, timeouts: { hostGraceMs: Number.NaN } })).toThrow(/hostGraceMs/);
    expect(() => defineGame({ ...base, hashEvery: -5 })).toThrow(/hashEvery/);
    expect(() => defineGame({ ...base, timeouts: { onTimeout: 'kick' as never } })).toThrow(/'idle' or 'forfeit'/);
    expect(defineGame({ ...base, timeouts: { presenceMs: 0, onTimeout: 'forfeit' } }).onTimeout).toBe('forfeit');
  });
});
