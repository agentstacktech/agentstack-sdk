/**
 * Mint hosted_app cookie after REST login on `/s/{pid}/` surfaces.
 * Gene: sdk.commerce.hosted.gen1 · core.hosting.project_plane.gen1
 */
import type { HTTPClient } from '../../client/http-client';
import {
  isHostedPostLoginGraceActive,
  markHostedPostLoginGrace,
  normalizeBearerToken,
  readHostedSessionToken,
  storeHostedSession,
} from './sessionVault';

export type MintHostedAppSessionOptions = {
  /** Origin prefix when API is not same host (rare); default relative paths. */
  apiBase?: string;
};

/**
 * POST /api/hosted-apps/{projectId}/session — required for MCP cookie plane after Bearer login.
 */
export async function mintHostedAppSession(
  projectId: number,
  bearerToken: string,
  options?: MintHostedAppSessionOptions,
): Promise<void> {
  const pid = Number(projectId);
  if (!Number.isFinite(pid) || pid <= 0) {
    throw new Error('hosted_session_invalid_project');
  }
  const token = normalizeBearerToken(bearerToken) ?? String(bearerToken || '').trim();
  if (!token) {
    throw new Error('hosted_session_missing_bearer');
  }
  const trimmed = String(options?.apiBase ?? '').replace(/\/$/, '');
  const apiRoot = trimmed
    ? trimmed.endsWith('/api')
      ? trimmed
      : trimmed.startsWith('http')
        ? `${trimmed}/api`
        : `${trimmed}/api`
    : '';
  const url = apiRoot
    ? `${apiRoot}/hosted-apps/${pid}/session`
    : `/api/hosted-apps/${pid}/session`;
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(isHostedPostLoginGraceActive() ? { 'X-Auth-Mint-Grace': '1' } : {}),
    },
    body: '{}',
  });
  if (!res.ok) {
    throw new Error(`hosted_session_mint_failed:${res.status}`);
  }
}

/** True when the page is a hosted tenant surface (`/s/{pid}/`). */
/**
 * Anonymous player bootstrap for hosted games (G6b): provision → login → hosted cookie.
 * Caller must pass an SDK/config with auth.loginByKey + anonymousProvision.
 */
export type HostedPlayerBootstrapDeps = {
  anonymousProvision: (args: { project_id: number }) => Promise<{ api_key: string }>;
  loginByKey: (args: { api_key: string; project_id: number }) => Promise<{ access_token: string }>;
};

/**
 * Mint hosted_app cookie when Bearer exists; optional full anon bootstrap.
 * Call before hosted StackScript / match client on `/s/{pid}/`.
 */
export async function ensureHostedPlayerMcpReady(
  projectId: number,
  http: Pick<HTTPClient, 'getAuthToken' | 'setProjectId' | 'updateConfig'>,
  deps?: HostedPlayerBootstrapDeps,
  options?: MintHostedAppSessionOptions,
): Promise<void> {
  const pid = Number(projectId);
  if (!Number.isFinite(pid) || pid <= 0) {
    throw new Error('hosted_session_invalid_project');
  }
  http.setProjectId(pid);
  let bearer = http.getAuthToken()?.trim() || readHostedSessionToken() || '';
  if (!bearer && deps) {
    await bootstrapHostedPlayerSession(pid, deps, options);
    bearer = http.getAuthToken()?.trim() || readHostedSessionToken() || '';
  }
  if (bearer) {
    await mintHostedAppSession(pid, bearer, options);
    markHostedPostLoginGrace();
  }
}

export async function bootstrapHostedPlayerSession(
  projectId: number,
  deps: HostedPlayerBootstrapDeps,
  options?: MintHostedAppSessionOptions,
): Promise<void> {
  const prov = await deps.anonymousProvision({ project_id: projectId });
  const login = await deps.loginByKey({
    api_key: prov.api_key,
    project_id: projectId,
  });
  storeHostedSession(login.access_token, projectId);
  await mintHostedAppSession(projectId, login.access_token, options);
}

export function isHostedTenantPath(locationLike?: { pathname?: string }): boolean {
  const pathname =
    locationLike?.pathname ??
    (typeof globalThis !== 'undefined' && 'location' in globalThis
      ? String((globalThis as { location?: { pathname?: string } }).location?.pathname ?? '')
      : '');
  return /\/s\/\d+\//.test(pathname);
}
