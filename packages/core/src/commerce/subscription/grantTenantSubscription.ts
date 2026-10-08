import type { HTTPClient } from '../../client/http-client';
import { mcpExecute } from '../../mcp/execute';
import { resolveMcpUrl } from '../../mcp/urls';

export type GrantTenantSubscriptionRequest = {
  user_id: number;
  plan_id: string;
  buff_template_id?: string;
  billing_cycle?: 'monthly' | 'yearly';
  verify?: boolean;
};

export type GrantTenantSubscriptionResult = {
  buff_id: string;
  plan_id: string;
  recipient_project_id: number;
  expires_at: string;
  billing_cycle?: string;
  active_buffs?: unknown;
  verify_warning?: string;
  idempotent_replay?: boolean;
};

export async function grantTenantSubscription(
  client: HTTPClient,
  projectId: number,
  body: GrantTenantSubscriptionRequest,
): Promise<GrantTenantSubscriptionResult> {
  const token = client.getAuthToken?.();
  if (!token) {
    throw new Error('grantTenantSubscription: missing auth token');
  }

  const res = await mcpExecute(
    [
      {
        action: 'buffs.grant_tenant_subscription',
        params: {
          project_id: projectId,
          user_id: body.user_id,
          plan_id: body.plan_id,
          ...(body.buff_template_id
            ? { buff_template_id: body.buff_template_id }
            : {}),
          ...(body.billing_cycle ? { billing_cycle: body.billing_cycle } : {}),
          verify: body.verify ?? true,
        },
      },
    ],
    {
      token,
      projectId,
      mcpUrl: resolveMcpUrl(client.getConfig().apiBase ?? ''),
    },
  );

  if (!res.ok) {
    throw new Error(res.error ?? 'buffs.grant_tenant_subscription');
  }

  const step = res.results?.[0];
  const raw = (step?.result ?? step?.data) as Record<string, unknown> | undefined;
  const data = (raw?.data ?? raw) as GrantTenantSubscriptionResult;
  return data;
}
