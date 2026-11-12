/**
 * What (if anything) is wrong with the connection right now, as one plain value a UI can show.
 * Headless: `netStatus(session.snapshot)`; DOM pill: `mountNetStatus` from `@agentstack/netplay/ui`.
 */
import type { Snapshot } from './types.js';

export type NetStatus =
  /** Guest / expired session: online play needs a signed-in account. */
  | { kind: 'sign-in' }
  /** The server asked us to slow down (rate limit / quota); polling backs off by itself. */
  | { kind: 'busy' }
  /** The room script is not published on this project (yet). */
  | { kind: 'unavailable' }
  | { kind: 'offline' }
  | { kind: 'reconnecting' }
  /** authority: the host is away; `seconds` left before the match is called off. */
  | { kind: 'host-away'; seconds: number }
  /** Another seated player stopped sending (`names` of the away players). */
  | { kind: 'player-away'; names: string[] }
  /** Hashes disagree; recovery (re-fold from the log) runs automatically. */
  | { kind: 'desync' };

/** null = all good (or not playing). Priority: known server reason > own connection > host > others > desync. */
export function netStatus<S, V>(s: Snapshot<S, V>): NetStatus | null {
  if (s.issue === 'auth') return { kind: 'sign-in' };
  if (s.issue === 'not-published') return { kind: 'unavailable' };
  if (s.phase === 'over') return null;
  if (s.issue === 'rate') return { kind: 'busy' };
  if (s.connection === 'offline') return { kind: 'offline' };
  if (s.connection === 'reconnecting' || s.connection === 'connecting') return s.phase === 'playing' ? { kind: 'reconnecting' } : null;
  if (s.phase !== 'playing') return null;
  if (s.hostWaitMs !== null) return { kind: 'host-away', seconds: Math.ceil(s.hostWaitMs / 1000) };
  const away = s.players.filter((p) => p.id !== s.self && p.status === 'away').map((p) => p.name);
  if (away.length) return { kind: 'player-away', names: away };
  if (s.desync) return { kind: 'desync' };
  return null;
}

/** Series score in this room from player `id`'s side (default: me), counted by player id so re-seating does not matter. */
export function seriesScore<S, V>(s: Pick<Snapshot<S, V>, 'results' | 'self'>, id: string = s.self): { mine: number; theirs: number; draws: number; played: number } {
  let mine = 0, theirs = 0, draws = 0;
  for (const r of s.results) { if (!r.winner) draws++; else if (r.winner === id) mine++; else theirs++; }
  return { mine, theirs, draws, played: s.results.length };
}
