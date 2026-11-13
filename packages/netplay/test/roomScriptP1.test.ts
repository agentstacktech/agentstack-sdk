import { describe, expect, it } from 'vitest';
import { generateRoomScriptP1 } from '../src/index.js';

const g = { id: 'demo-duel', seats: { min: 2, max: 4 }, version: 3 } as const;

describe('generateRoomScriptP1 (P1 compiler template)', () => {
  const src = generateRoomScriptP1(g as never, { prefix: 'demo' });
  it('keys room state by one $room_id segment with declared paths', () => {
    expect(src).toContain('ctx.dna.write(["np_demo", input.room_id, "state"]');
    expect(src).toContain('"np_demo.$room_id.state"');
    expect(src).not.toMatch(/\{room_id\}|`/);
  });
  it('has no throw and reports errors as { ok: false }', () => {
    expect(src).not.toContain('throw');
    expect(src).toContain('return { ok: false, error: "ROOM_FULL" }');
  });
  it('emits join/append/poll/leave/lobby exports and rejects bad prefixes', () => {
    for (const n of ['room.join', 'room.append', 'room.poll', 'room.leave', 'lobby.find']) expect(src).toContain(`name: "demo.${n}"`);
    expect(() => generateRoomScriptP1(g as never, { prefix: 'Bad Prefix' })).toThrow();
  });
});
