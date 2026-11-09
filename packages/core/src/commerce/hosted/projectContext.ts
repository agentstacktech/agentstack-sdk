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

/**
 * Flagship tenant PID for cookie mint + login `p` — boot/URL only (never workspace session).
 * Avoids POST /api/hosted-apps/{child_workspace}/session → 403 not_a_member.
 */
export function resolveHostedFlagshipProjectId(
  win?: Pick<Window, 'location'> & { __AGENTSTACK_VERTICAL__?: HostedBootManifest },
): number | null {
  if (win) return resolveHostedProjectIdFromLocation(win);
  if (typeof window !== 'undefined') {
    return resolveHostedProjectIdFromLocation(window);
  }
  return null;
}

/** Effective tenant PID — attr > boot/URL > session workspace key. */
export function resolveHostedProjectId(attrProjectId?: number | string | null): number | null {
  const attr = Number(attrProjectId);
  if (Number.isFinite(attr) && attr > 0) return attr;
  const flagship = resolveHostedFlagshipProjectId();
  if (flagship) return flagship;
  return readHostedWorkspaceProjectId();
}

/** Workspace slice PID after login — vertical child or flagship fallback. */
export function resolveHostedWorkspaceProjectIdFromLogin(
  data: Record<string, unknown>,
  flagshipPid: number,
): number {
  const vertical = data.vertical_workspace as { project_id?: unknown } | undefined;
  const session = data.session as { project_id?: unknown } | undefined;
  const candidates = [
    vertical?.project_id,
    data.project_id,
    session?.project_id,
    (data.user as { project_id?: unknown } | undefined)?.project_id,
    (data.first_project as { project_id?: unknown } | undefined)?.project_id,
    flagshipPid,
  ];
  for (const raw of candidates) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return flagshipPid;
}
