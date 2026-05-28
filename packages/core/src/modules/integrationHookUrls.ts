/**
 * Canonical inbound hook URL builder — genetic: ``sdk.integrations.gen1``.
 */

import type { IntegrationOwnerKind } from '../types/integrations';

export function buildHookPath(params: {
  ownerKind: IntegrationOwnerKind;
  projectId: number;
  userId?: number;
  provider: string;
  slug: string;
}): string {
  const { ownerKind, projectId, userId, provider, slug } = params;
  const base = '/api/hooks';
  if (ownerKind === 'personal' && userId && userId > 0) {
    return `${base}/ecosystem/users/${userId}/${provider}/${slug}`;
  }
  return `${base}/${projectId}/${provider}/${slug}`;
}

export function buildHookUrl(
  apiBaseUrl: string,
  params: {
    ownerKind: IntegrationOwnerKind;
    projectId: number;
    userId?: number;
    provider: string;
    slug: string;
  },
): string {
  const root = (apiBaseUrl || '').replace(/\/$/, '');
  return `${root}${buildHookPath(params)}`;
}

export type IntegrateHrefSection =
  | 'gallery'
  | 'connections'
  | 'inbox'
  | 'deliveries'
  | 'issues'
  | 'diagnostics'
  | 'outbound'
  | 'api_keys'
  | 'legacy_webhooks';

/** SPA deep link for integrate.workspace (`/dev|user/projects/:id/integrate`). */
export function buildIntegrateHref(
  shell: 'dev' | 'user',
  projectId: number,
  opts?: {
    section?: IntegrateHrefSection;
    scope?: 'project' | 'personal';
    recipe?: string;
    connectionId?: string;
  },
): string {
  const base = shell === 'user' ? '/user' : '/dev';
  const sp = new URLSearchParams();
  const section = opts?.section ?? 'gallery';
  if (section !== 'gallery') sp.set('section', section);
  if (opts?.scope === 'personal') sp.set('scope', 'personal');
  if (opts?.recipe) sp.set('recipe', opts.recipe);
  if (opts?.connectionId) sp.set('connectionId', opts.connectionId);
  const q = sp.toString();
  return `${base}/projects/${projectId}/integrate${q ? `?${q}` : ''}`;
}
