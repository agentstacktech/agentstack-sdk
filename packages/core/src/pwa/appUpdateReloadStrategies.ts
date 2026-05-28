/**
 * Reload strategy helpers for Update Plane (`sdk.pwa.update_plane.gen1`).
 */

import type { AppUpdateReason } from './appUpdatePlane';

export type ApplyAppUpdateMode =
  | 'user'
  | 'policy_background'
  | 'policy_controller'
  | 'policy_silent';

export type ReloadStrategyContext = {
  reason: AppUpdateReason;
  mode: ApplyAppUpdateMode;
  serverStartedAt?: string;
  runSwUpdate: (reload: boolean) => Promise<void>;
  hardReload: (serverStartedAt?: string) => void;
};

export type ReloadStrategy = (ctx: ReloadStrategyContext) => Promise<void>;

export async function defaultUserReloadStrategy(ctx: ReloadStrategyContext): Promise<void> {
  if (ctx.serverStartedAt) {
    ctx.hardReload(ctx.serverStartedAt);
    return;
  }
  await ctx.runSwUpdate(true);
}

export async function defaultControllerReloadStrategy(ctx: ReloadStrategyContext): Promise<void> {
  await ctx.runSwUpdate(true);
}

export async function defaultSilentReloadStrategy(_ctx: ReloadStrategyContext): Promise<void> {
  /* reserved */
}

export function resolveReloadStrategy(mode: ApplyAppUpdateMode): ReloadStrategy {
  switch (mode) {
    case 'policy_silent':
      return defaultSilentReloadStrategy;
    case 'policy_controller':
      return defaultControllerReloadStrategy;
    default:
      return defaultUserReloadStrategy;
  }
}

export function shouldBustPersistOnApply(
  reason: AppUpdateReason,
  mode: ApplyAppUpdateMode,
): boolean {
  if (reason === 'deploy' || reason === 'build_id') return true;
  if (mode === 'user') return true;
  if (mode === 'policy_background' && reason === 'deploy') return true;
  return false;
}
