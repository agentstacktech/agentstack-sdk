export type StorefrontHrefParams = {
  scope?: 'global' | 'project';
  projectId?: number;
  listing?: string;
  q?: string;
  tab?: 'browse' | 'merchant';
};

/** @deprecated Use `/user/shop` — kept for deep links. */
export function buildStorefrontHref(
  base: '/user/shop' | '/user/storefront' | string = '/user/shop',
  params?: StorefrontHrefParams,
): string {
  const root = base.includes('storefront') ? base.replace('storefront', 'shop') : base;
  const p = new URLSearchParams();
  if (params?.scope) p.set('scope', params.scope);
  if (params?.projectId != null) p.set('project', String(params.projectId));
  if (params?.listing) p.set('listing', params.listing);
  if (params?.q) p.set('q', params.q);
  if (params?.tab) p.set('tab', params.tab);
  const q = p.toString();
  return q ? `${root}?${q}` : root;
}
