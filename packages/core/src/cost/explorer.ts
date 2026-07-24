/**
 * Cost Explorer API (`repo.platform.unit_economics.gen1`).
 */
import type { HTTPClient } from '../client/http-client';
import { unwrapApiData } from '../client/unwrapApiData';

export type CostExplorerUsageSummary = {
  version: number;
  period_id: string;
  event_count: number;
  by_capability: Record<string, number>;
  by_status: Record<string, number>;
  storage: string;
  durable_sql: string;
};

export type CostExplorerCharges = {
  version: number;
  period_id: string;
  charge_count: number;
  total_amount_minor: number;
  currency: string;
  charges: Array<{
    charge_id: string;
    usage_event_id: string;
    pricing_class: string;
    amount_minor: number;
    currency: string;
    included: boolean;
  }>;
  storage: string;
  durable_sql: string;
};

export type CostExplorerAllocationPreview = {
  version: number;
  period_id: string;
  fully_closed: boolean;
  rated_count: number;
  unrated_usage_ids: string[];
  allocation: Record<string, unknown>;
  closed_at: string;
};

export type CostExplorerFreePathCounters = {
  version: number;
  counters: Record<string, number>;
  updated_at: string | null;
};

export async function getCostExplorerUsageSummary(
  http: HTTPClient,
): Promise<CostExplorerUsageSummary> {
  const res = await http.get<CostExplorerUsageSummary>('/cost/explorer/usage-summary');
  return unwrapApiData(res);
}

export async function getCostExplorerCharges(
  http: HTTPClient,
  params?: { limit?: number },
): Promise<CostExplorerCharges> {
  const res = await http.get<CostExplorerCharges>('/cost/explorer/charges', { params });
  return unwrapApiData(res);
}

export async function getCostExplorerAllocationPreview(
  http: HTTPClient,
  params?: { shared_cost_minor?: number; period_id?: string },
): Promise<CostExplorerAllocationPreview> {
  const res = await http.get<CostExplorerAllocationPreview>(
    '/cost/explorer/allocation-preview',
    { params },
  );
  return unwrapApiData(res);
}

export async function getCostExplorerFreePathCounters(
  http: HTTPClient,
): Promise<CostExplorerFreePathCounters> {
  const res = await http.get<CostExplorerFreePathCounters>('/cost/explorer/free-path-counters');
  return unwrapApiData(res);
}
