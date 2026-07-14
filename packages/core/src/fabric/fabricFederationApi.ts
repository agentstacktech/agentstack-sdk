/**
 * Fabric federation REST client (`sdk.fabric.gen1`, T10.4, B6, B12).
 */
import type { HTTPClient } from '../client/http-client';
import { unwrapApiData } from '../client/unwrapApiData';
import {
  federationGrantsResponseSchema,
  fabricFederationGrantSchema,
  type AcceptFederationGrantResponse,
  type CreateFederationGrantRequest,
  type CreateFederationGrantResponse,
  type FabricFederationGrant,
  type RejectFederationGrantResponse,
  type RevokeFederationGrantResponse,
} from './fabricFederation';

export async function listFederationGrants(
  http: HTTPClient,
  sourceProjectId: number,
): Promise<{ source_project_id: number; count: number; grants: FabricFederationGrant[] }> {
  const res = await http.get<unknown>(
    `/fabric/federation/grants?source_project_id=${sourceProjectId}`,
  );
  return federationGrantsResponseSchema.parse(unwrapApiData(res)) as {
    source_project_id: number;
    count: number;
    grants: FabricFederationGrant[];
  };
}

export async function listInboundFederationGrants(
  http: HTTPClient,
  consumerProjectId: number,
): Promise<{ consumer_project_id: number; count: number; grants: FabricFederationGrant[] }> {
  const res = await http.get<unknown>(
    `/fabric/federation/grants/inbound?consumer_project_id=${consumerProjectId}`,
  );
  const parsed = federationGrantsResponseSchema.parse(unwrapApiData(res));
  return {
    consumer_project_id: parsed.consumer_project_id ?? consumerProjectId,
    count: parsed.count,
    grants: parsed.grants,
  };
}

export async function createFederationGrant(
  http: HTTPClient,
  sourceProjectId: number,
  body: CreateFederationGrantRequest,
): Promise<CreateFederationGrantResponse> {
  const res = await http.post<CreateFederationGrantResponse>(
    `/fabric/federation/grants?source_project_id=${sourceProjectId}`,
    body,
  );
  const data = unwrapApiData(res);
  return {
    ...data,
    grant: fabricFederationGrantSchema.parse(data.grant),
  };
}

export async function acceptFederationGrant(
  http: HTTPClient,
  consumerProjectId: number,
  sourceProjectId: number,
  grantId: string,
): Promise<AcceptFederationGrantResponse> {
  const res = await http.post<AcceptFederationGrantResponse>(
    `/fabric/federation/grants/${encodeURIComponent(grantId)}/accept?consumer_project_id=${consumerProjectId}&source_project_id=${sourceProjectId}`,
    {},
  );
  const data = unwrapApiData(res);
  return {
    ...data,
    grant: fabricFederationGrantSchema.parse(data.grant),
  };
}

export async function rejectFederationGrant(
  http: HTTPClient,
  consumerProjectId: number,
  sourceProjectId: number,
  grantId: string,
): Promise<RejectFederationGrantResponse> {
  const res = await http.post<RejectFederationGrantResponse>(
    `/fabric/federation/grants/${encodeURIComponent(grantId)}/reject?consumer_project_id=${consumerProjectId}&source_project_id=${sourceProjectId}`,
    {},
  );
  const data = unwrapApiData(res);
  return {
    ...data,
    grant: fabricFederationGrantSchema.parse(data.grant),
  };
}

export async function revokeFederationGrant(
  http: HTTPClient,
  sourceProjectId: number,
  grantId: string,
): Promise<RevokeFederationGrantResponse> {
  const res = await http.delete<RevokeFederationGrantResponse>(
    `/fabric/federation/grants/${encodeURIComponent(grantId)}?source_project_id=${sourceProjectId}`,
  );
  const data = unwrapApiData(res);
  return {
    ...data,
    grant: fabricFederationGrantSchema.parse(data.grant),
  };
}
