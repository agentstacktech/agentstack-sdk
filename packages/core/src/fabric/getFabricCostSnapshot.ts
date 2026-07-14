/**
 * Fabric Cost Plane ops snapshot (`sdk.fabric.gen1`).
 */
import type { HTTPClient } from '../client/http-client';
import { unwrapApiData } from '../client/unwrapApiData';

export type FabricCostCounters = Record<string, number>;

export type FabricCostSnapshot = {
  version: number;
  counters: FabricCostCounters;
};

export async function getFabricCostSnapshot(http: HTTPClient): Promise<FabricCostSnapshot> {
  const res = await http.get<FabricCostSnapshot>('/fabric/ops/cost');
  const data = unwrapApiData(res);
  return {
    version: data.version ?? 1,
    counters: data.counters ?? {},
  };
}
