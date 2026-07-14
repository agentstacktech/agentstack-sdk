/**
 * Path-based project assets URLs (`/dev|user/projects/:id/assets?...`).
 * Preferred over legacy `buildAssetsWizardHref` (`?module=assets&project_id=`).
 */
import type { AssetsUrlState, CommerceHubTab, StudioTab } from './assetsUrlState';
import { writeAssetsSearchParams } from './assetsUrlState';

export type AssetsProjectShell = 'dev' | 'user' | 'platform' | 'legacy';

export function buildAssetsProjectPath(
  projectId: number,
  shell: AssetsProjectShell = 'dev',
): string {
  const base = shell === 'user' ? '/user' : '/dev';
  return `${base}/projects/${projectId}/assets`;
}

export function buildProjectAssetsSurfaceHref(
  projectId: number,
  shell: AssetsProjectShell,
  patch: Partial<AssetsUrlState> = {},
): string {
  const q = writeAssetsSearchParams(new URLSearchParams(), patch).toString();
  const path = buildAssetsProjectPath(projectId, shell);
  return q ? `${path}?${q}` : path;
}

export function buildProjectAssetsWizardHref(
  projectId: number,
  shell: AssetsProjectShell,
  params: Partial<AssetsUrlState> & { presetId?: string | null } = {},
): string {
  const presetId = params.presetId ?? null;
  return buildProjectAssetsSurfaceHref(projectId, shell, {
    create: true,
    step: params.step ?? (presetId ? 'basics' : 'intent'),
    presetId,
    assetId: null,
    mode: 'catalog',
    ...params,
  });
}

export function buildProjectAssetsExpertHref(
  projectId: number,
  shell: AssetsProjectShell,
  assetId: string,
  extra?: Partial<AssetsUrlState>,
): string {
  return buildProjectAssetsSurfaceHref(projectId, shell, {
    create: false,
    assetId,
    presetId: null,
    mode: 'catalog',
    ...extra,
  });
}

export function buildProjectAssetsImportHref(
  projectId: number,
  shell: AssetsProjectShell,
): string {
  return buildProjectAssetsSurfaceHref(projectId, shell, {
    create: false,
    assetId: null,
    mode: 'import',
  });
}

export function buildProjectAssetsCommerceHref(
  projectId: number,
  shell: AssetsProjectShell,
  tab: CommerceHubTab = 'listings',
  extra?: { assetId?: string },
): string {
  return buildProjectAssetsSurfaceHref(projectId, shell, {
    mode: 'commerce',
    commerceTab: tab,
    commerceAssetId: extra?.assetId ?? null,
  });
}

export function buildProjectStorefrontStudioHref(
  projectId: number,
  shell: AssetsProjectShell,
  tab: StudioTab = 'quick',
  extra?: Partial<AssetsUrlState> & { action?: string },
): string {
  const { action, ...urlExtra } = extra ?? {};
  const href = buildProjectAssetsSurfaceHref(projectId, shell, {
    mode: 'studio',
    studioTab: tab,
    ...urlExtra,
  });
  if (!action) return href;
  const sep = href.includes('?') ? '&' : '?';
  return `${href}${sep}action=${encodeURIComponent(action)}`;
}
