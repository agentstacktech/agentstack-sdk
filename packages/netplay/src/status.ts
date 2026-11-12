/**
 * What (if anything) is wrong with the connection right now, as one plain value a UI can show.
 * Headless: `netStatus(session.snapshot)`; DOM pill: `mountNetStatus` from `@agentstack/netplay/ui`.
 */
import type { Snapshot } from './types.js';

export type NetStatus =
  | { kind: 'offline' }
  | { kind: 'reconnecting' }
  /** authority: the host is away; `seconds` left before the match is called off. */
  | { kind: 'host-away'; seconds: number }
  /** Another seated player stopped sending (`names` of the away players). */
  | { kind: 'player-away'; names: string[] }
  /** Hashes disagree; recovery (re-fold from the log) runs automatically. */
  | { kind: 'desync' };

/** null = all good (or not playing). Priority: own connection > host > others > desync. */
export function netStatus(s: Snapshot<unknown, unknown>): NetStatus | null {
  if (s.phase === 'over') return null;
  if (s.connection === 'offline') return { kind: 'offline' };
  if (s.connection === 'reconnecting' || s.connection === 'connecting') return s.phase === 'playing' ? { kind: 'reconnecting' } : null;
  if (s.phase !== 'playing') return null;
  if (s.hostWaitMs !== null) return { kind: 'host-away', seconds: Math.ceil(s.hostWaitMs / 1000) };
  const away = s.players.filter((p) => p.id !== s.self && p.status === 'away').map((p) => p.name);
  if (away.length) return { kind: 'player-away', names: away };
  if (s.desync) return { kind: 'desync' };
  return null;
}
