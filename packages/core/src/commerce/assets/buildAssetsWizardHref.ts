import { buildAssetsModuleSearchParams } from './assetsUrlState';
import type { AssetsUrlState } from './assetsUrlState';

/**
 * Deep link into project Assets wizard (shell `?module=assets&create=1&...`).
 */
export function buildAssetsWizardHref(
  projectId: number,
  params: Partial<AssetsUrlState> & { create?: boolean } = {},
): string {
  const sp = buildAssetsModuleSearchParams(projectId, {
    create: true,
    step: 'intent',
    ...params,
  });
  return `?${sp.toString()}`;
}
