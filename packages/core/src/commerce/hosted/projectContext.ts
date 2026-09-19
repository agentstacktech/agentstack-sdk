/**
 * Resolve tenant project id for any hosted surface (`/s/{pid}/`, boot manifest).
 * Gene: sdk.commerce.hosted.gen1
 */
import { readHostedWorkspaceProjectId } from './sessionVault';

export type HostedBootManifest = {
  product_project_id?: unknown;
};

/** Tenant PID from boot manifest or hosted URL ``/s/{pid}/``. */
export function resolveHostedProjectIdFromLocation(
  win?: Pick<Window, 'location'> & { __AGENTSTACK_VERTICAL__?: HostedBootManifest },
): number | null {
  if (!win) return null;
  const injected = win.__AGENTSTACK_VERTICAL__;
  const fromBoot = Number(injected?.product_project_id);
  if (Number.isFinite(fromBoot) && fromBoot > 0) return fromBoot;
  const match = win.location.pathname.match(/\/s\/(\d+)\//);
  if (match) {
    const fromUrl = Number(match[1]);
    if (Number.isFinite(fromUrl) && fromUrl > 0) return fromUrl;
  }
  return null;
}

/** Effective tenant PID — attr > boot/URL > session workspace key. */
export function resolveHostedProjectId(attrProjectId?: number | string | null): number | null {
  const attr = Number(attrProjectId);
  if (Number.isFinite(attr) && attr > 0) return attr;
  const flagship =
    typeof window !== 'undefined' ? resolveHostedProjectIdFromLocation(window) : null;
  if (flagship) return flagship;
  return readHostedWorkspaceProjectId();
}
