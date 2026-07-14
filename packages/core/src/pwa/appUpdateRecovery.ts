/**
 * Circuit breaker / deep-recovery persistence for Update Plane (`sdk.pwa.update_plane.gen2`).
 */

import type { AppUpdateReason } from './appUpdatePlane';
import type { SessionStorageLike } from './appUpdateCoordinator';

export const CHUNK_INEFFECTIVE_SESSIONS_KEY = 'agentstack:chunk_ineffective_sessions_v1';

const CHUNK_FORCE_FLOOR_THRESHOLD = 2;

export function noteChunkRecoveryIneffectiveSession(storage: Storage | null): number {
  if (!storage) return 0;
  try {
    const raw = storage.getItem(CHUNK_INEFFECTIVE_SESSIONS_KEY);
    const prev = raw ? (JSON.parse(raw) as { count?: number }).count ?? 0 : 0;
    const next = prev + 1;
    storage.setItem(CHUNK_INEFFECTIVE_SESSIONS_KEY, JSON.stringify({ count: next }));
    return next;
  } catch {
    return 0;
  }
}

export function getChunkIneffectiveSessionCount(storage: Storage | null): number {
  if (!storage) return 0;
  try {
    const raw = storage.getItem(CHUNK_INEFFECTIVE_SESSIONS_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { count?: number };
    return typeof parsed.count === 'number' && parsed.count > 0 ? parsed.count : 0;
  } catch {
    return 0;
  }
}

export function shouldForceUpdateFromChunkIneffectiveSessions(storage: Storage | null): boolean {
  return getChunkIneffectiveSessionCount(storage) >= CHUNK_FORCE_FLOOR_THRESHOLD;
}

export const RECOVERY_STORAGE_KEY = 'agentstack:pwa_update_recovery_v1';

export type RecoveryStateV1 = {
  v: 1;
  /** Identity user attempted to apply before last navigation. */
  lastApplyIdentity?: string;
  /** Times apply was started for lastApplyIdentity (circuit breaker hint). */
  applyCount?: number;
  /** Identity that already ran deep recovery. */
  deepRecoveryDoneFor?: string;
  /** Identity where reload + deep recovery did not resolve mismatch — suppress banner. */
  ineffectiveFor?: string;
};

export function buildUpdateIdentity(input: {
  reason: AppUpdateReason;
  localBuildId: string;
  remoteBuildId?: string;
}): string {
  return `${input.reason}:${input.localBuildId}:${input.remoteBuildId ?? ''}`;
}

export function readRecoveryState(storage: SessionStorageLike | null): RecoveryStateV1 {
  if (!storage) return { v: 1 };
  try {
    const raw = storage.getItem(RECOVERY_STORAGE_KEY);
    if (!raw) return { v: 1 };
    const parsed = JSON.parse(raw) as Partial<RecoveryStateV1>;
    if (parsed.v !== 1) return { v: 1 };
    return {
      v: 1,
      lastApplyIdentity:
        typeof parsed.lastApplyIdentity === 'string' ? parsed.lastApplyIdentity : undefined,
      applyCount:
        typeof parsed.applyCount === 'number' && parsed.applyCount > 0
          ? parsed.applyCount
          : undefined,
      deepRecoveryDoneFor:
        typeof parsed.deepRecoveryDoneFor === 'string' ? parsed.deepRecoveryDoneFor : undefined,
      ineffectiveFor: typeof parsed.ineffectiveFor === 'string' ? parsed.ineffectiveFor : undefined,
    };
  } catch {
    return { v: 1 };
  }
}

export function writeRecoveryState(
  storage: SessionStorageLike | null,
  state: RecoveryStateV1,
): void {
  if (!storage) return;
  try {
    storage.setItem(RECOVERY_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* private mode / quota */
  }
}

export function noteApplyStarted(storage: SessionStorageLike | null, identity: string): void {
  const prev = readRecoveryState(storage);
  const sameIdentity = prev.lastApplyIdentity === identity;
  writeRecoveryState(storage, {
    ...prev,
    v: 1,
    lastApplyIdentity: identity,
    applyCount: sameIdentity ? (prev.applyCount ?? 1) + 1 : 1,
  });
}

export function noteDeepRecoveryDone(storage: SessionStorageLike | null, identity: string): void {
  const prev = readRecoveryState(storage);
  writeRecoveryState(storage, {
    ...prev,
    v: 1,
    deepRecoveryDoneFor: identity,
    lastApplyIdentity: identity,
  });
}

export function markIneffective(storage: SessionStorageLike | null, identity: string): void {
  const prev = readRecoveryState(storage);
  writeRecoveryState(storage, {
    ...prev,
    v: 1,
    ineffectiveFor: identity,
    lastApplyIdentity: identity,
  });
}

export function clearRecoveryForIdentity(
  storage: SessionStorageLike | null,
  identity: string,
): void {
  const prev = readRecoveryState(storage);
  if (
    prev.lastApplyIdentity !== identity &&
    prev.deepRecoveryDoneFor !== identity &&
    prev.ineffectiveFor !== identity
  ) {
    return;
  }
  writeRecoveryState(storage, { v: 1 });
}

export function isIneffectiveFor(storage: SessionStorageLike | null, identity: string): boolean {
  return readRecoveryState(storage).ineffectiveFor === identity;
}

export function shouldEscalateToDeepRecovery(
  storage: SessionStorageLike | null,
  identity: string,
): boolean {
  const s = readRecoveryState(storage);
  return s.lastApplyIdentity === identity && s.deepRecoveryDoneFor !== identity;
}

export function shouldMarkIneffectiveAfterDeepRecovery(
  storage: SessionStorageLike | null,
  identity: string,
): boolean {
  const s = readRecoveryState(storage);
  return s.deepRecoveryDoneFor === identity && s.lastApplyIdentity === identity;
}
