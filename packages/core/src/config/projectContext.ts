/**
 * Project scope — default tenant context for REST (`X-Project-ID`) and path helpers.
 * Genetic tag: repo.platform.sdk.project_context.gen1
 *
 * @see docs/PROJECT_CONTEXT.md
 */
import { getStorageItem } from '../utils/storage-utils';

const PROJECT_CONTEXT_DOC = 'docs/PROJECT_CONTEXT.md';

/** Parse SDKConfig.projectId or API payloads. */
export function normalizeProjectId(value: unknown): number | undefined {
  if (value == null || value === '') return undefined;
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.trunc(value);
  }
  if (typeof value === 'string') {
    const t = value.trim();
    if (/^\d+$/.test(t)) {
      const n = Number(t);
      if (Number.isFinite(n) && n > 0) return Math.trunc(n);
    }
  }
  return undefined;
}

/**
 * Browser session keys written by AgentAuth / monorepo SPA after login or workspace switch.
 */
export function readProjectIdFromBrowserStorage(): number | undefined {
  if (typeof window === 'undefined') return undefined;
  const keys = [
    'ap_project_id',
    'as_project_id',
    'project_id',
    'login_project_id',
  ];
  for (const key of keys) {
    const raw =
      window.sessionStorage?.getItem(key) ??
      getStorageItem(key) ??
      window.localStorage?.getItem(key);
    const n = normalizeProjectId(raw ?? undefined);
    if (n) return n;
  }
  return undefined;
}

/**
 * Effective project id: explicit config wins, then browser storage (client only).
 */
export function resolveEffectiveProjectId(
  configProjectId: unknown,
): number | undefined {
  return normalizeProjectId(configProjectId) ?? readProjectIdFromBrowserStorage();
}

export function projectContextDocRef(): string {
  return PROJECT_CONTEXT_DOC;
}
