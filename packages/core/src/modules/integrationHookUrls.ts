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
  | 'apps'
  | 'gallery'
  | 'connections'
  | 'scenarios'
  | 'inbox'
  | 'deliveries'
  | 'issues'
  | 'runs'
  | 'modules'
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
    scenarioId?: string;
    focus?: string;
  },
): string {
  const base = shell === 'user' ? '/user' : '/dev';
  const sp = new URLSearchParams();
  const section = opts?.section ?? 'apps';
  if (section !== 'apps' && section !== 'gallery') sp.set('section', section);
  else if (section === 'gallery') sp.set('section', 'apps');
  if (opts?.scope === 'personal') sp.set('scope', 'personal');
  if (opts?.recipe) sp.set('recipe', opts.recipe);
  if (opts?.connectionId) sp.set('connectionId', opts.connectionId);
  if (opts?.scenarioId) sp.set('scenarioId', opts.scenarioId);
  if (opts?.focus) sp.set('focus', opts.focus);
  const q = sp.toString();
  return `${base}/projects/${projectId}/integrate${q ? `?${q}` : ''}`;
}

/** Deep link to Fleet Automation tab on project agents module. */
export function buildAgentAutomateHref(
  shell: 'dev' | 'user',
  projectId: number,
  opts?: { agentId?: string },
): string {
  const base = shell === 'user' ? '/user' : '/dev';
  const sp = new URLSearchParams();
  sp.set('module', 'agents');
  sp.set('tab', 'automate');
  if (opts?.agentId) sp.set('agent', opts.agentId);
  return `${base}/projects/${projectId}?${sp.toString()}`;
}

/** Deep link to connection events focus in Integrate hub. */
export function buildIntegrateEventsHref(
  shell: 'dev' | 'user',
  projectId: number,
  connectionId: string,
): string {
  return buildIntegrateHref(shell, projectId, {
    section: 'connections',
    connectionId,
    focus: 'events',
  });
}
