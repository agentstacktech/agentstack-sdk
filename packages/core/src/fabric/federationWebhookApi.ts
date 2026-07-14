/**
 * Fabric federation webhook subscription REST client (`sdk.fabric.gen1`, B18).
 */
import type { HTTPClient } from '../client/http-client';
import { unwrapApiData } from '../client/unwrapApiData';

export const FEDERATION_WEBHOOK_EVENTS = [
  'fabric.federation.grant.pending',
  'fabric.federation.grant.accepted',
  'fabric.federation.grant.rejected',
  'fabric.federation.grant.revoked',
] as const;

export type FederationWebhookEvent = (typeof FEDERATION_WEBHOOK_EVENTS)[number];

export type FederationWebhookSubscription = {
  id: string;
  url: string;
  secret: string;
  events: string[];
  enabled: boolean;
};

export type FederationWebhooksResponse = {
  project_id: number;
  count: number;
  webhooks: FederationWebhookSubscription[];
};

export type RegisterFederationWebhookRequest = {
  url: string;
  secret?: string;
  events?: string[];
  subscription_id?: string;
};

export type RegisterFederationWebhookResponse = {
  success: boolean;
  webhook: FederationWebhookSubscription;
};

export type DeleteFederationWebhookResponse = {
  success: boolean;
  subscription_id: string;
};

export async function listFederationWebhooks(
  http: HTTPClient,
  projectId: number,
): Promise<FederationWebhooksResponse> {
  const res = await http.get<FederationWebhooksResponse>(
    `/fabric/federation/webhooks?project_id=${projectId}`,
  );
  return unwrapApiData(res);
}

export async function registerFederationWebhook(
  http: HTTPClient,
  projectId: number,
  body: RegisterFederationWebhookRequest,
): Promise<RegisterFederationWebhookResponse> {
  const res = await http.post<RegisterFederationWebhookResponse>(
    `/fabric/federation/webhooks?project_id=${projectId}`,
    body,
  );
  return unwrapApiData(res);
}

export async function deleteFederationWebhook(
  http: HTTPClient,
  projectId: number,
  subscriptionId: string,
): Promise<DeleteFederationWebhookResponse> {
  const res = await http.delete<DeleteFederationWebhookResponse>(
    `/fabric/federation/webhooks/${encodeURIComponent(subscriptionId)}?project_id=${projectId}`,
  );
  return unwrapApiData(res);
}
