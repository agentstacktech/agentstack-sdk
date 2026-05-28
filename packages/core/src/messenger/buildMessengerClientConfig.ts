/**
 * Builds {@link MessengerClientConfig} from the same resolved values HTTPClient uses,
 * so embeds/widgets never duplicate `apiBase` / `projectId` parsing.
 *
 * Genetic tag: `sdk.messenger.facade.gen1`
 */

import type { MessengerClientConfig } from '../modules/Messenger';

/** Minimal slice from `HTTPClient.getConfig()` / `SDKConfig`. */
export type MessengerClientConfigSource = {
  apiBase: string;
  baseUrl: string;
  projectId: number | string;
};

function ecosystemIdFromProjectId(projectId: number | string): number | undefined {
  if (typeof projectId === 'number' && Number.isFinite(projectId) && projectId > 0) {
    return Math.trunc(projectId);
  }
  if (typeof projectId === 'string') {
    const t = projectId.trim();
    if (/^\d+$/.test(t)) {
      const n = Number(t);
      if (Number.isFinite(n) && n > 0) return Math.trunc(n);
    }
  }
  return undefined;
}

/**
 * @param cfg — typically `sdk.httpClient.getConfig()` after HTTPClient normalized `apiBase` / `baseUrl`.
 */
export function buildMessengerClientConfigFromHttpClientConfig(
  cfg: MessengerClientConfigSource
): MessengerClientConfig {
  const raw = String(cfg.apiBase || cfg.baseUrl || '').trim();
  const apiBaseUrl = raw.replace(/\/$/, '');
  return {
    apiBaseUrl,
    ecosystemProjectId: ecosystemIdFromProjectId(cfg.projectId),
  };
}
