/**
 * Tenant integrator vs AgentStack ecosystem operator surfaces.
 * Genetic tag: repo.platform.sdk.integrator_scope.gen1
 *
 * @see docs/INTEGRATOR_SCOPE.md
 */
import type { SDKConfig } from '../types/shared/SDKConfig';
import { AgentStackError } from '../types/shared/HTTPTypes';

export type SDKAudience = 'integrator' | 'platform_operator';

/** Module / platform ids reserved for AgentStack ops (not npm tenant apps). */
export const PLATFORM_OPERATOR_MODULE_IDS = new Set<string>(['admin', 'adminData']);

const INTEGRATOR_SCOPE_DOC = 'docs/INTEGRATOR_SCOPE.md';

export function isIntegratorAudience(config?: Pick<SDKConfig, 'sdkAudience'>): boolean {
  return (config?.sdkAudience ?? 'integrator') !== 'platform_operator';
}

/**
 * Block tenant integrators from calling ecosystem admin SDK surfaces.
 */
export function assertPlatformOperatorSurface(
  config: Pick<SDKConfig, 'sdkAudience'>,
  surfaceLabel: string,
): void {
  if (!isIntegratorAudience(config)) return;
  throw new AgentStackError(
    `${surfaceLabel} is reserved for AgentStack ecosystem operators (platform admin UI, project_id=1 ops). ` +
      `Tenant apps and published SDK consumers must use project-scoped APIs: sdk.platform.api, sdk.platform.dna, ` +
      `sdk.platform.rbac, sdk.commerce, sdk.support, etc. See ${INTEGRATOR_SCOPE_DOC}.`,
  );
}

/**
 * Block integrator HTTP calls to `/api/admin/*` (defense in depth for AI-generated fetch paths).
 */
function normalizeRequestPath(requestPath: string): string {
  const raw = (requestPath.split('?')[0] ?? '').trim();
  try {
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      return new URL(raw).pathname.toLowerCase();
    }
  } catch {
    /* relative path */
  }
  return raw.toLowerCase();
}

export function assertIntegratorMayCallAdminApi(
  config: Pick<SDKConfig, 'sdkAudience'>,
  requestPath: string,
): void {
  if (!isIntegratorAudience(config)) return;
  const path = normalizeRequestPath(requestPath);
  const isAdminApi =
    path === '/admin' ||
    path.startsWith('/admin/') ||
    path.includes('/api/admin/') ||
    path.endsWith('/admin');
  if (!isAdminApi) return;
  throw new AgentStackError(
    `HTTP path "${requestPath}" targets platform admin API (/api/admin/*). ` +
      `It is not available to tenant integrators. See ${INTEGRATOR_SCOPE_DOC}.`,
  );
}

export function filterCapabilityEntriesForAudience<
  T extends { id: string },
>(entries: T[], audience?: SDKAudience): T[] {
  if (audience === 'platform_operator') return entries;
  return entries.filter((e) => !PLATFORM_OPERATOR_MODULE_IDS.has(e.id));
}
