/**

 * Reload strategy helpers for Update Plane (`sdk.pwa.update_plane.gen2`).

 */



import type { AppUpdateReason } from './appUpdatePlane';



export type ApplyAppUpdateMode =

  | 'user'

  | 'policy_background'

  | 'policy_controller'

  | 'policy_silent'

  | 'policy_deep_recovery';



export type ReloadStrategyContext = {

  reason: AppUpdateReason;

  mode: ApplyAppUpdateMode;

  serverStartedAt?: string;

  runSwUpdate: (reload: boolean) => Promise<void>;

  hardReload: (serverStartedAt?: string) => void;

  clearCaches?: () => Promise<void>;

  unregisterSw?: () => Promise<void>;

  hardReloadCacheBust?: () => void;

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



/** Clears SW/caches then cache-busted navigation (installed PWA stale shell). */

export async function defaultDeepRecoveryStrategy(ctx: ReloadStrategyContext): Promise<void> {

  if (ctx.clearCaches) {

    await ctx.clearCaches();

  }

  if (ctx.unregisterSw) {

    await ctx.unregisterSw();

  }

  if (ctx.hardReloadCacheBust) {

    ctx.hardReloadCacheBust();

    return;

  }

  if (ctx.serverStartedAt) {

    ctx.hardReload(ctx.serverStartedAt);

    return;

  }

  await ctx.runSwUpdate(true);

}



export function resolveReloadStrategy(mode: ApplyAppUpdateMode): ReloadStrategy {

  switch (mode) {

    case 'policy_silent':

      return defaultSilentReloadStrategy;

    case 'policy_controller':

      return defaultControllerReloadStrategy;

    case 'policy_deep_recovery':

      return defaultDeepRecoveryStrategy;

    default:

      return defaultUserReloadStrategy;

  }

}



export function shouldBustPersistOnApply(

  reason: AppUpdateReason,

  mode: ApplyAppUpdateMode,

): boolean {

  if (reason === 'deploy' || reason === 'build_id') return true;

  if (mode === 'user' || mode === 'policy_deep_recovery') return true;

  return false;

}

