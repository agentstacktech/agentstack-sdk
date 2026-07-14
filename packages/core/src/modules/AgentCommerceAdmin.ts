/**
 * Ecosystem admin commerce settlement REST.
 *
 * Genetic tag: core.commerce.settlement.gen1
 */

import { HTTPClient } from '../client/http-client';

export interface SettlementFunnelPayload {
  scan_ok?: boolean;
  scan_error?: string | null;
  stuck_escrow_count: number;
  stuck_samples: Array<{
    listing_uuid?: string;
    deal_status?: string;
    project_id?: number;
  }>;
  checkout_funnel_24h?: Record<string, unknown>;
}

export interface ReconcileEscrowPayload {
  dry_run: boolean;
  scan_ok: boolean;
  scan_error?: string | null;
  stuck_count: number;
  stuck: SettlementFunnelPayload['stuck_samples'];
  actions: Array<{ listing_uuid?: string; cancelled?: boolean; error?: string }>;
}

export class AgentCommerceAdmin {
  constructor(private client: HTTPClient) {}

  /** GET /api/admin/commerce/settlement-funnel */
  async getSettlementFunnel(
    projectId?: number,
    options?: { signal?: AbortSignal },
  ): Promise<SettlementFunnelPayload> {
    const params = projectId != null ? { project_id: projectId } : undefined;
    const res = await this.client.get<SettlementFunnelPayload>(
      '/admin/commerce/settlement-funnel',
      params,
      { signal: options?.signal },
    );
    return res.data;
  }

  /** POST /api/admin/commerce/reconcile-escrow */
  async reconcileEscrow(
    opts: { dryRun?: boolean; projectId?: number },
    options?: { signal?: AbortSignal },
  ): Promise<ReconcileEscrowPayload> {
    const dry = opts.dryRun !== false;
    const qs = new URLSearchParams({ dry_run: dry ? 'true' : 'false' });
    if (opts.projectId != null) qs.set('project_id', String(opts.projectId));
    const res = await this.client.post<ReconcileEscrowPayload>(
      `/admin/commerce/reconcile-escrow?${qs.toString()}`,
      undefined,
      { signal: options?.signal },
    );
    return res.data;
  }
}
