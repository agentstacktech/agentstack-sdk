import type { BaseAsset } from '../../types';
import type { AgentAssets } from '../../modules/AgentAssets';

/**
 * Clone a catalog asset definition (new id, "(copy)" suffix on name).
 */
export async function duplicateAsset(
  assets: Pick<AgentAssets, 'getAsset' | 'createAsset'>,
  projectId: number,
  assetId: string,
): Promise<BaseAsset> {
  const source = await assets.getAsset(projectId, assetId);
  return assets.createAsset(projectId, {
    name: `${source.name} (copy)`,
    type: source.type,
    price_usdt: source.price_usdt,
    components: JSON.parse(JSON.stringify(source.components ?? {})),
  });
}
