/**
 * Circuit breaker / deep-recovery persistence for Update Plane (`sdk.pwa.update_plane.gen2`).
 * Recovery schema v2 with v1 read migration.
 */

import type { AppUpdateReason } from './appUpdatePlane';
import type { SessionStorageLike } from './appUpdateCoordinator';
import type { UpdateTier } from './appUpdateStrategyLadder';

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

/** Storage key (v1 name kept; payload may be v1 or v2). */
export const RECOVERY_STORAGE_KEY = 'agentstack:pwa_update_recovery_v1';

/** @deprecated Use RecoveryStateV2 — kept for type exports / mirror. */
export type RecoveryStateV1 = {
  v: 1;
  lastApplyIdentity?: string;
  applyCount?: number;
  deepRecoveryDoneFor?: string;
  ineffectiveFor?: string;
};

export type RecoveryAttemptV2 = {
  tier: UpdateTier;
  at: number;
};

export type RecoveryStateV2 = {
  v: 2;
  identity?: string;
  attempts?: RecoveryAttemptV2[];
  deepDone?: boolean;
  ineffective?: boolean;
  promptShownGeneration?: string;
  /** Compat mirrors for gradual rollout readers. */
  lastApplyIdentity?: string;
  deepRecoveryDoneFor?: string;
  ineffectiveFor?: string;
  applyCount?: number;
};

export function buildUpdateIdentity(input: {
  reason: AppUpdateReason;
  localBuildId: string;
  remoteBuildId?: string;
  serverStartedAt?: string;
}): string {
  if (input.reason === 'deploy') {
    return `deploy:${input.serverStartedAt ?? ''}`;
  }
  if (input.reason === 'sw_waiting') {
    return `sw_waiting:${input.localBuildId}`;
  }
  if (input.reason === 'stale_assets') {
    return `stale_assets:${input.localBuildId}`;
  }
  if (input.reason === 'build_id' || String(input.reason).startsWith('tenant:')) {
    return `build_id:${input.localBuildId}:${input.remoteBuildId ?? ''}`;
  }
  return `${input.reason}:${input.localBuildId}:${input.remoteBuildId ?? ''}`;
}

function migrateV1ToV2(v1: RecoveryStateV1): RecoveryStateV2 {
  const identity = v1.lastApplyIdentity ?? v1.deepRecoveryDoneFor ?? v1.ineffectiveFor;
  const attempts: RecoveryAttemptV2[] = [];
  if (v1.lastApplyIdentity) {
    const count = v1.applyCount && v1.applyCount > 0 ? v1.applyCount : 1;
    for (let i = 0; i < count; i += 1) {
      attempts.push({ tier: 1, at: 0 });
    }
  }
  if (v1.deepRecoveryDoneFor) {
    attempts.push({ tier: 2, at: 0 });
  }
  return {
    v: 2,
    identity,
    attempts: attempts.length ? attempts : undefined,
    deepDone: Boolean(v1.deepRecoveryDoneFor),
    ineffective: Boolean(v1.ineffectiveFor),
    lastApplyIdentity: v1.lastApplyIdentity,
    deepRecoveryDoneFor: v1.deepRecoveryDoneFor,
    ineffectiveFor: v1.ineffectiveFor,
    applyCount: v1.applyCount,
  };
}

export function readRecoveryState(storage: SessionStorageLike | null): RecoveryStateV2 {
  if (!storage) return { v: 2 };
  try {
    const raw = storage.getItem(RECOVERY_STORAGE_KEY);
    if (!raw) return { v: 2 };
    const parsed = JSON.parse(raw) as {
      v?: number;
      identity?: unknown;
      attempts?: unknown;
      deepDone?: unknown;
      ineffective?: unknown;
      promptShownGeneration?: unknown;
      lastApplyIdentity?: unknown;
      deepRecoveryDoneFor?: unknown;
      ineffectiveFor?: unknown;
      applyCount?: unknown;
    };
    if (parsed.v === 2) {
      return {
        v: 2,
        identity: typeof parsed.identity === 'string' ? parsed.identity : (
          typeof parsed.lastApplyIdentity === 'string' ? parsed.lastApplyIdentity : undefined
        ),
        attempts: Array.isArray(parsed.attempts)
          ? (parsed.attempts as RecoveryAttemptV2[]).filter(
              (a): a is RecoveryAttemptV2 =>
                a != null &&
                (a.tier === 0 || a.tier === 1 || a.tier === 2) &&
                typeof a.at === 'number',
            )
          : undefined,
        deepDone: Boolean(parsed.deepDone ?? parsed.deepRecoveryDoneFor),
        ineffective: Boolean(parsed.ineffective ?? parsed.ineffectiveFor),
        promptShownGeneration:
          typeof parsed.promptShownGeneration === 'string'
            ? parsed.promptShownGeneration
            : undefined,
        lastApplyIdentity:
          typeof parsed.lastApplyIdentity === 'string' ? parsed.lastApplyIdentity : undefined,
        deepRecoveryDoneFor:
          typeof parsed.deepRecoveryDoneFor === 'string' ? parsed.deepRecoveryDoneFor : undefined,
        ineffectiveFor:
          typeof parsed.ineffectiveFor === 'string' ? parsed.ineffectiveFor : undefined,
        applyCount:
          typeof parsed.applyCount === 'number' && parsed.applyCount > 0
            ? parsed.applyCount
            : undefined,
      };
    }
    if (parsed.v === 1) {
      return migrateV1ToV2({
        v: 1,
        lastApplyIdentity:
          typeof parsed.lastApplyIdentity === 'string' ? parsed.lastApplyIdentity : undefined,
        applyCount:
          typeof parsed.applyCount === 'number' && parsed.applyCount > 0
            ? parsed.applyCount
            : undefined,
        deepRecoveryDoneFor:
          typeof parsed.deepRecoveryDoneFor === 'string' ? parsed.deepRecoveryDoneFor : undefined,
        ineffectiveFor:
          typeof parsed.ineffectiveFor === 'string' ? parsed.ineffectiveFor : undefined,
      });
    }
    return { v: 2 };
  } catch {
    return { v: 2 };
  }
}

export function writeRecoveryState(
  storage: SessionStorageLike | null,
  state: RecoveryStateV2,
): void {
  if (!storage) return;
  try {
    const payload: RecoveryStateV2 = {
      v: 2,
      identity: state.identity,
      attempts: state.attempts,
      deepDone: state.deepDone,
      ineffective: state.ineffective,
      promptShownGeneration: state.promptShownGeneration,
      lastApplyIdentity: state.identity ?? state.lastApplyIdentity,
      deepRecoveryDoneFor: state.deepDone
        ? (state.identity ?? state.deepRecoveryDoneFor)
        : undefined,
      ineffectiveFor: state.ineffective
        ? (state.identity ?? state.ineffectiveFor)
        : undefined,
      applyCount: state.attempts?.length ?? state.applyCount,
    };
    storage.setItem(RECOVERY_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* private mode / quota */
  }
}

export function noteTierAttempt(
  storage: SessionStorageLike | null,
  identity: string,
  tier: UpdateTier,
): void {
  const prev = readRecoveryState(storage);
  const attempts = [...(prev.attempts ?? []), { tier, at: Date.now() }];
  writeRecoveryState(storage, {
    ...prev,
    v: 2,
    identity,
    attempts,
    deepDone: tier === 2 ? true : prev.deepDone,
    lastApplyIdentity: identity,
    deepRecoveryDoneFor: tier === 2 ? identity : prev.deepRecoveryDoneFor,
    applyCount: attempts.length,
  });
}

/** @deprecated Prefer noteTierAttempt — records soft/L1 apply. */
export function noteApplyStarted(storage: SessionStorageLike | null, identity: string): void {
  noteTierAttempt(storage, identity, 1);
}

export function noteDeepRecoveryDone(storage: SessionStorageLike | null, identity: string): void {
  noteTierAttempt(storage, identity, 2);
}

export function markIneffective(storage: SessionStorageLike | null, identity: string): void {
  const prev = readRecoveryState(storage);
  writeRecoveryState(storage, {
    ...prev,
    v: 2,
    identity,
    ineffective: true,
    lastApplyIdentity: identity,
    ineffectiveFor: identity,
  });
}

export function clearRecoveryForIdentity(
  storage: SessionStorageLike | null,
  identity: string,
): void {
  const prev = readRecoveryState(storage);
  if (
    prev.identity !== identity &&
    prev.lastApplyIdentity !== identity &&
    prev.deepRecoveryDoneFor !== identity &&
    prev.ineffectiveFor !== identity
  ) {
    return;
  }
  writeRecoveryState(storage, { v: 2 });
}

export function isIneffectiveFor(storage: SessionStorageLike | null, identity: string): boolean {
  const s = readRecoveryState(storage);
  return s.ineffective === true && (s.identity === identity || s.ineffectiveFor === identity);
}

/** True when a non-L2 attempt exists and deep is not done — escalate to L2. */
export function shouldEscalateToDeepRecovery(
  storage: SessionStorageLike | null,
  identity: string,
): boolean {
  const s = readRecoveryState(storage);
  if (s.identity !== identity && s.lastApplyIdentity !== identity) return false;
  if (s.deepDone || s.deepRecoveryDoneFor === identity) return false;
  const attempts = s.attempts ?? [];
  if (attempts.some((a) => a.tier < 2)) return true;
  return s.lastApplyIdentity === identity && s.deepRecoveryDoneFor !== identity;
}

export function shouldMarkIneffectiveAfterDeepRecovery(
  storage: SessionStorageLike | null,
  identity: string,
): boolean {
  const s = readRecoveryState(storage);
  const deep =
    s.deepDone === true || s.deepRecoveryDoneFor === identity;
  const same =
    s.identity === identity || s.lastApplyIdentity === identity;
  return deep && same;
}

export function hasPromptBeenShownForGeneration(
  storage: SessionStorageLike | null,
  identity: string,
  generation: string,
): boolean {
  const s = readRecoveryState(storage);
  return (
    s.promptShownGeneration === generation &&
    (s.identity === identity || s.lastApplyIdentity === identity)
  );
}

export function markPromptShown(
  storage: SessionStorageLike | null,
  identity: string,
  generation: string,
): void {
  const prev = readRecoveryState(storage);
  writeRecoveryState(storage, {
    ...prev,
    v: 2,
    identity,
    promptShownGeneration: generation,
    lastApplyIdentity: prev.lastApplyIdentity ?? identity,
  });
}

export function lastAttemptedTier(storage: SessionStorageLike | null, identity: string): UpdateTier | undefined {
  const s = readRecoveryState(storage);
  if (s.identity !== identity && s.lastApplyIdentity !== identity) return undefined;
  const attempts = s.attempts;
  if (!attempts?.length) return undefined;
  return attempts[attempts.length - 1]?.tier;
}
