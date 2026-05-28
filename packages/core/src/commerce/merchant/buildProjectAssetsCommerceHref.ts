import { buildAssetsModuleSearchParams } from '../assets/assetsUrlState';

export type CommerceHubTab = 'listings' | 'orders' | 'tools';

export function buildProjectAssetsCommerceHref(
  projectId: number,
  tab: CommerceHubTab = 'listings',
  extra?: { assetId?: string },
): string {
  const sp = buildAssetsModuleSearchParams(projectId, { mode: 'commerce' });
  sp.set('tab', tab);
  if (extra?.assetId) sp.set('assetId', extra.assetId);
  return `?${sp.toString()}`;
}
