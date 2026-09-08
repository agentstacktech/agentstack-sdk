/**
 * Device Code (RFC 8628) via application/x-www-form-urlencoded.
 * Core OAuth endpoints do not accept JSON bodies — do not use httpClient.post JSON.
 * Genetic tag: repo.plugins.oauth_device_code.gen1 · repo.tooling.user_cli.gen1
 */

import { resolvePublicOrigin } from './urls';

export const DEFAULT_DEVICE_SCOPES =
  'mcp:execute mcp:read projects:read projects:write projects:admin 8dna:read 8dna:write logic:write logic:dry_run rag:read rag:write storage:read storage:write agents:run bots:run bots:admin support:read buffs:read buffs:write apikeys:write';

export interface DeviceAuthorizeResult {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string;
  interval: number;
  expires_in: number;
}

export interface DeviceCodeLoginOptions {
  apiBase: string;
  clientId: string;
  scope?: string;
  /** Called when user must open Activate URL */
  onUserCode?: (info: {
    userCode: string;
    verificationUri: string;
    verificationUriComplete: string;
  }) => void;
  signal?: AbortSignal;
}

async function postForm(
  url: string,
  params: Record<string, string>,
): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    if (typeof json.error === 'string') return json;
    const detail = json.detail ?? json.error_description ?? json.error;
    throw new Error(
      detail
        ? `${typeof detail === 'string' ? detail : JSON.stringify(detail)} (HTTP ${res.status})`
        : `HTTP ${res.status}`,
    );
  }
  return json;
}

export function deviceCodeActivateUrl(apiBase: string, userCode: string): string {
  const origin = resolvePublicOrigin(apiBase);
  return `${origin}/activate?user_code=${encodeURIComponent(String(userCode || '').trim())}`;
}

/** Authorize + poll until access_token or failure. */
export async function loginWithDeviceCodeForm(
  opts: DeviceCodeLoginOptions,
): Promise<Record<string, unknown>> {
  const apiBase = opts.apiBase.replace(/\/$/, '');
  const oauthBase = apiBase.endsWith('/api') ? apiBase : `${apiBase}/api`;
  const scope = opts.scope || DEFAULT_DEVICE_SCOPES;

  const auth = await postForm(`${oauthBase}/oauth2/device/authorize`, {
    client_id: opts.clientId,
    scope,
  });

  if (auth.error) {
    throw new Error(String(auth.error_description || auth.error));
  }

  const deviceCode = String(auth.device_code || '');
  const userCode = String(auth.user_code || '');
  const interval = Math.max(2, Number(auth.interval) || 5);
  const expiresIn = Math.max(30, Number(auth.expires_in) || 600);
  const verificationUri =
    String(auth.verification_uri || '') || `${resolvePublicOrigin(opts.apiBase)}/activate`;
  const verificationUriComplete =
    String(auth.verification_uri_complete || '') || deviceCodeActivateUrl(opts.apiBase, userCode);

  opts.onUserCode?.({
    userCode,
    verificationUri,
    verificationUriComplete,
  });

  const deadline = Date.now() + expiresIn * 1000;
  // Prod token RL ~5/min — stay ≥12s even when server interval=5
  let waitMs = Math.max(12_000, interval * 1000);

  while (Date.now() < deadline) {
    if (opts.signal?.aborted) throw new Error('Device Code aborted');
    await new Promise((r) => setTimeout(r, waitMs));
    const token = await postForm(`${oauthBase}/oauth2/token`, {
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      device_code: deviceCode,
      client_id: opts.clientId,
    });
    if (token.access_token) return token;
    const err = String(token.error || '');
    if (err === 'authorization_pending') continue;
    if (err === 'slow_down') {
      waitMs = Math.min(waitMs + 5000, 60_000);
      continue;
    }
    if (err === 'access_denied' || err === 'expired_token' || err === 'invalid_grant') {
      throw new Error(String(token.error_description || err));
    }
    if (err) throw new Error(String(token.error_description || err));
  }
  throw new Error('Device Code authorization timed out');
}
