/** Outcome helpers (pure): one way to read single-winner and several-winner outcomes alike. */
import type { MatchResult, Outcome, Seat } from './types.js';

/** Every winning seat: `winners` when set, else `[winner]`, else [] (draw / nobody). */
export function outcomeWinners(o: Pick<Outcome, 'winner' | 'winners'> | null | undefined): Seat[] {
  if (!o) return [];
  if (Array.isArray(o.winners)) return o.winners;
  return o.winner >= 0 ? [o.winner] : [];
}

/** Did `seat` win this outcome (alone or with others)? */
export function isWinner(o: Pick<Outcome, 'winner' | 'winners'> | null | undefined, seat: Seat): boolean {
  return seat >= 0 && outcomeWinners(o).includes(seat);
}

/** Every winner's player id of a finished match ([] = draw / nobody). */
export function resultWinners(r: Pick<MatchResult, 'winner' | 'winners'>): readonly string[] {
  return r.winners ?? (r.winner ? [r.winner] : []);
}

/**
 * Validate an outcome a game returned (or an authority sent): integer seats in 0…seats-1, no duplicates, and
 * `winner` consistent with `winners`. Deterministic, so every client stores the same thing.
 */
export function normalizeOutcome(o: Outcome, seats: number): Outcome {
  const ok = (s: unknown): s is Seat => Number.isInteger(s) && (s as number) >= 0 && (s as number) < seats;
  if (!Array.isArray(o.winners)) return ok(o.winner) || o.winner === -1 ? o : { ...o, winner: -1 };
  const winners = [...new Set(o.winners.filter(ok))];
  return { ...o, winners, winner: winners[0] ?? -1 };
}
