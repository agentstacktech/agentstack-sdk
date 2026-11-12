/**
 * Simultaneous phase with a deadline (gene `sdk.netplay.phase.gen1`) for `fold` / `authority` games:
 * every seat that must act picks in secret at the same time; the phase resolves when all of them are
 * ready, or when the clock runs out — then the game applies its default (a legal auto-pick) for the rest.
 *
 * `lockstep` games get the same behaviour from `secret: true` + `timeouts.turnMs` (War Tactics formations,
 * THERMOMORPHS beats). This is the pure, plain-data version for state you own (bids, drafts, hands):
 * keep the value in the game state and call these from `apply` / `clock` with `ctx.now` (or your own
 * model clock). No Date.now, no mutation: every function returns a new value. Real secrecy needs `authority`
 * (its guests' inputs go to the host only); in `fold` every client sees the log, so only the reveal timing is shared.
 *
 *   s.phase = openPhase(ctx.now, needs, turnSeconds(params.turnS, 60) * 1000);   // phase starts
 *   s.phase = touchPhase(s.phase, ctx.now, 5000);                               // any input: a last-second pick still lands
 *   s.phase = readyPhase(s.phase, seat);                                          // «Ready»
 *   const r = resolvePhase(s.phase, ctx.now, ctx.absent);                        // 'all-ready' | 'timeout' | null
 *   bar: mountMatchBar(session, { done: (k) => phaseDone(view.phase, k), clock: () => phaseLeft(view.phase, now) })
 */

export interface SimPhase {
  /** Time the phase opened (server / model ms). */
  readonly opened: number;
  /** Time limit, ms. 0 = no clock: wait for everyone. */
  readonly ms: number;
  /** Seats that must act in this phase. */
  readonly needs: readonly number[];
  /** Seats (from `needs`) that are done. */
  readonly ready: readonly number[];
  /** The one-time last-second extension was used. */
  readonly graced: boolean;
}

/** Turn-timer choices for a lobby / settings screen, seconds (0 = off). */
export const TURN_CHOICES: readonly number[] = [0, 30, 60, 90];

/** Sanitize a turn-timer room param: an integer 0…`max` seconds (0 = off), else `fallback`. */
export function turnSeconds(raw: unknown, fallback: number, max = 300): number {
  return typeof raw === 'number' && Number.isInteger(raw) && raw >= 0 && raw <= max ? raw : fallback;
}

export function openPhase(now: number, needs: readonly number[], ms: number): SimPhase {
  return { opened: now, ms: Math.max(0, ms | 0), needs: [...new Set(needs)].sort((a, b) => a - b), ready: [], graced: false };
}

/** Mark a seat ready (seats that do not act in this phase are ignored). */
export function readyPhase(p: SimPhase, seat: number): SimPhase {
  if (!p.needs.includes(seat) || p.ready.includes(seat)) return p;
  return { ...p, ready: [...p.ready, seat].sort((a, b) => a - b) };
}

/** A seat changed its mind before the reveal (picked again after Ready). */
export function unreadyPhase(p: SimPhase, seat: number): SimPhase {
  return p.ready.includes(seat) ? { ...p, ready: p.ready.filter((k) => k !== seat) } : p;
}

/**
 * Any input with less than `graceMs` left stretches the clock once, to `graceMs`: a pick made at the buzzer
 * is not lost to network latency. No-op without a clock or once used.
 */
export function touchPhase(p: SimPhase, now: number, graceMs: number): SimPhase {
  if (!p.ms || p.graced || graceMs <= 0) return p;
  const left = p.ms - (now - p.opened);
  return left < graceMs ? { ...p, opened: now - (p.ms - graceMs), graced: true } : p;
}

/** ms left (≥ 0), or null when the phase has no clock. */
export function phaseLeft(p: SimPhase, now: number): number | null {
  return p.ms ? Math.max(0, p.ms - (now - p.opened)) : null;
}

/** The clock ran out (`slackMs` = extra time to keep, e.g. a minimum on-screen time for animations). */
export function phaseTimedOut(p: SimPhase, now: number, slackMs = 0): boolean {
  return p.ms > 0 && now - p.opened >= p.ms + slackMs;
}

/** Seats still thinking. Absent seats (left / timed out, `ctx.absent`) never hold the phase up. */
export function phaseWaiting(p: SimPhase, absent: readonly boolean[] = []): number[] {
  return p.needs.filter((k) => !p.ready.includes(k) && !absent[k]);
}

/** 'all-ready' (reveal now), 'timeout' (apply defaults for `phaseWaiting`, then reveal) or null (keep waiting). */
export function resolvePhase(p: SimPhase, now: number, absent: readonly boolean[] = []): 'all-ready' | 'timeout' | null {
  if (!phaseWaiting(p, absent).length) return 'all-ready';
  return phaseTimedOut(p, now) ? 'timeout' : null;
}

/** For `mountMatchBar({ done })`: true = ready, false = thinking…, undefined = this seat does not act now. */
export function phaseDone(p: SimPhase | null | undefined, seat: number): boolean | undefined {
  if (!p || !p.needs.includes(seat)) return undefined;
  return p.ready.includes(seat);
}
