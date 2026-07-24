/**
 * i18n key contract for Update Plane UI (`sdk.pwa.update_plane.gen1`).
 */

import type { AppUpdateReason } from './appUpdatePlane';
import { isCoreAppUpdateReason } from './appUpdatePlane';

export const APP_UPDATE_MESSAGE_KEYS = {
  title: {
    deploy: 'pwa.app_update.title_deploy',
    build_id: 'pwa.app_update.title_version',
    sw_waiting: 'pwa.app_update.title_version',
    stale_assets: 'pwa.app_update.title_assets',
  },
  subtitle: 'pwa.app_update.subtitle',
  subtitle_deep: 'pwa.app_update.subtitle_deep',
  /** L2 predicted on first show — honest cache-clear copy (not a second UX act). */
  subtitle_effective: 'pwa.app_update.subtitle_effective',
  subtitle_chunk_stale: 'pwa.app_update.subtitle_chunk_stale',
  cta: 'pwa.app_update.cta',
  /** Diagnostics / legacy only — product CTA uses `cta`. */
  cta_deep: 'pwa.app_update.cta_deep',
  dismiss: 'pwa.app_update.dismiss',
  defer: 'pwa.app_update.defer',
} as const;

export function titleKeyForAppUpdateReason(reason: AppUpdateReason): string {
  if (isCoreAppUpdateReason(reason)) return APP_UPDATE_MESSAGE_KEYS.title[reason];
  return APP_UPDATE_MESSAGE_KEYS.title.stale_assets;
}

export function resolveTenantTitleKey(
  reason: AppUpdateReason,
  tenantResolver?: (tenantId: string) => string | undefined,
): string {
  if (reason.startsWith('tenant:') && tenantResolver) {
    const custom = tenantResolver(reason.slice('tenant:'.length));
    if (custom) return custom;
  }
  if (reason in APP_UPDATE_MESSAGE_KEYS.title) {
    return APP_UPDATE_MESSAGE_KEYS.title[reason as keyof typeof APP_UPDATE_MESSAGE_KEYS.title];
  }
  return APP_UPDATE_MESSAGE_KEYS.title.stale_assets;
}
