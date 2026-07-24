/**
 * Predictive Strategy Ladder L0–L2 (`sdk.pwa.update_plane.gen2`).
 * One CTA; tier chosen on ingest — never soft→deep as two UX acts.
 */

import type { AppUpdateCoreReason } from './appUpdatePlane';
import type { ApplyAppUpdateMode } from './appUpdateReloadStrategies';

/** L0 Activate · L1 Soft reload · L2 Safe shell purge */
export type UpdateTier = 0 | 1 | 2;

export type ApplyEnvironmentHints = {
  hasWaitingWorker: boolean;
  hasServiceWorkerController: boolean;
  isStandaloneDisplay: boolean;
  chunkRecoveryAttempted: boolean;
};

export type ResolveSelectedTierInput = ApplyEnvironmentHints & {
  reason: AppUpdateCoreReason;
  /** Prior L0/L1 (or any) attempt for this identity without successful deep. */
  priorTierFailed: boolean;
};

/**
 * Decision matrix (ADR PWA_UPDATE_ORCHESTRATION_V2.3):
 * - waiting SW / sw_waiting → L0 (skipWaiting) — wins over priorTierFailed
 * - build_id + controller/standalone without waiting → L2
 * - build_id without controller → L1
 * - deploy + controller/standalone without waiting → L2 (mirror build_id; ban soft→deep)
 * - deploy without controller → L1
 * - stale_assets / chunk recovery / prior fail (no waiting) → L2
 */
export function resolveSelectedTier(input: ResolveSelectedTierInput): UpdateTier {
  const waiting = input.hasWaitingWorker || input.reason === 'sw_waiting';
  // Workbox: keep L0 while a worker is waiting — never escalate to L2 first
  if (waiting) return 0;

  if (input.priorTierFailed) return 2;
  if (input.chunkRecoveryAttempted) return 2;
  if (input.reason === 'stale_assets') return 2;

  if (input.reason === 'build_id' || input.reason === 'deploy') {
    if (input.hasServiceWorkerController || input.isStandaloneDisplay) return 2;
    return 1;
  }

  return 1;
}

export function tierToApplyMode(tier: UpdateTier): ApplyAppUpdateMode {
  if (tier === 2) return 'policy_deep_recovery';
  return 'user';
}

/** Mode → tier for recovery attempt recording. */
export function applyModeToTier(mode: ApplyAppUpdateMode): UpdateTier {
  if (mode === 'policy_deep_recovery') return 2;
  if (mode === 'policy_controller' || mode === 'policy_background') return 0;
  return 1;
}

export const DEFAULT_APPLY_ENVIRONMENT: ApplyEnvironmentHints = {
  hasWaitingWorker: false,
  hasServiceWorkerController: false,
  isStandaloneDisplay: false,
  chunkRecoveryAttempted: false,
};
