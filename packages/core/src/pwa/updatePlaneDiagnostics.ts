/**
 * Hosted-app diagnostics for Update Plane (`sdk.pwa.update_plane.gen2`).
 */
import {
  createAppUpdateCoordinator,
  type AppUpdateCoordinator,
  type AppUpdateCoordinatorConfig,
} from './appUpdateCoordinator';

export type UpdatePlaneDiagnostics = {
  getState: AppUpdateCoordinator['getState'];
  ingestSignal: AppUpdateCoordinator['ingestSignal'];
  apply: AppUpdateCoordinator['apply'];
  dismiss: AppUpdateCoordinator['dismiss'];
  subscribeState: AppUpdateCoordinator['subscribeState'];
  shouldShowBanner: AppUpdateCoordinator['shouldShowBanner'];
};

export function createUpdatePlaneDiagnostics(
  config: AppUpdateCoordinatorConfig,
): UpdatePlaneDiagnostics {
  const coord = createAppUpdateCoordinator(config);
  return {
    getState: coord.getState,
    ingestSignal: coord.ingestSignal,
    apply: coord.apply,
    dismiss: coord.dismiss,
    subscribeState: coord.subscribeState,
    shouldShowBanner: coord.shouldShowBanner,
  };
}
