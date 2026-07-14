/**
 * Capability catalog REST client (`sdk.fabric.gen1`).
 */
import type { HTTPClient } from '../client/http-client';
import { unwrapApiData } from '../client/unwrapApiData';
import {
  parseCapabilityDescriptor,
  type CapabilityDescriptor,
} from './capabilityDescriptor';

export type CapabilityListResponse = {
  version: number;
  domains: string[];
  count: number;
  capabilities: Array<CapabilityDescriptor & { allowed?: boolean }>;
};

export async function listCapabilities(
  http: HTTPClient,
  options?: { domain?: string; surface?: string },
): Promise<CapabilityListResponse> {
  const params = new URLSearchParams();
  if (options?.domain) params.set('domain', options.domain);
  if (options?.surface) params.set('surface', options.surface);
  const qs = params.toString();
  const path = qs ? `/capabilities?${qs}` : '/capabilities';
  const res = await http.get<CapabilityListResponse>(path);
  const data = unwrapApiData(res);
  const capabilities = (data.capabilities ?? []).map((raw) => ({
    ...parseCapabilityDescriptor(raw),
    allowed: (raw as { allowed?: boolean }).allowed,
  }));
  return {
    version: data.version ?? 1,
    domains: data.domains ?? [],
    count: data.count ?? capabilities.length,
    capabilities,
  };
}

export async function getCapability(
  http: HTTPClient,
  capabilityId: string,
): Promise<CapabilityDescriptor & { allowed?: boolean }> {
  const res = await http.get<Record<string, unknown>>(
    `/capabilities/${encodeURIComponent(capabilityId)}`,
  );
  const raw = unwrapApiData(res);
  return {
    ...parseCapabilityDescriptor(raw),
    allowed: raw.allowed as boolean | undefined,
  };
}
