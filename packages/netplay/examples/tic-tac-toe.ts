/**
 * Example 1 — turn-based, open information: `fold` mode.
 * Every client applies the same commands in the same (server) order → same board everywhere.
 */
import { defineGame } from '../src/index.js';

export interface Board { cells: number[]; turn: number }   // cells: -1 empty, else seat

export const ticTacToe = defineGame<Board, number>({
  id: 'tic-tac-toe',
  version: 1,
  seats: { min: 2, max: 2 },
  mode: 'fold',
  setup: () => ({ cells: Array(9).fill(-1), turn: 0 }),
  // anti-cheat lives here: only the player on turn, only empty cells
  input: (raw, seat, s) => (seat === s.turn && Number.isInteger(raw) && s.cells[raw as number] === -1 ? (raw as number) : undefined),
  apply: (s, seat, cell) => { s.cells[cell] = seat; s.turn = 1 - seat; },
  outcome: (s) => {
    const L = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
    for (const [a, b, c] of L) if (s.cells[a!] !== -1 && s.cells[a!] === s.cells[b!] && s.cells[a!] === s.cells[c!]) return { winner: s.cells[a!]!, reason: 'line' };
    return s.cells.every((c) => c !== -1) ? { winner: -1, reason: 'draw' } : null;
  },
  timeouts: { presenceMs: 60_000, onTimeout: 'forfeit' },
});
