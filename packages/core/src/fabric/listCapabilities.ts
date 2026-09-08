/**
 * Capability catalog REST client (`sdk.fabric.gen1`).
 */
import type { HTTPClient } from '../client/http-client';
import { unwrapApiData } from '../client/unwrapApiData';
import {
  parseCapabilityDescriptor,
  type CapabilityDescriptor,
  type McpCapabilityDescriptorSource,
} from './capabilityDescriptor';

export type CapabilityRow = CapabilityDescriptor & {
  allowed?: boolean;
  resolve_source?: McpCapabilityDescriptorSource;
};

export type CapabilityListResponse = {
  version: number;
  domains: string[];
  count: number;
  capabilities: CapabilityRow[];
};

function parseCapabilityRow(raw: Record<string, unknown>): CapabilityRow {
  const resolveSource = raw.resolve_source as McpCapabilityDescriptorSource | undefined;
  return {
    ...parseCapabilityDescriptor(raw),
    allowed: raw.allowed as boolean | undefined,
    ...(resolveSource ? { resolve_source: resolveSource } : {}),
  };
}

export async function listCapabilities(
  http: HTTPClient,
  options?: { domain?: string; surface?: string; effective?: boolean },
): Promise<CapabilityListResponse> {
  const params = new URLSearchParams();
  if (options?.domain) params.set('domain', options.domain);
  if (options?.surface) params.set('surface', options.surface);
  if (options?.effective !== false) params.set('effective', 'true');
  const qs = params.toString();
  const path = qs ? `/capabilities?${qs}` : '/capabilities';
  const res = await http.get<CapabilityListResponse>(path);
  const data = unwrapApiData(res);
  const capabilities = (data.capabilities ?? []).map((raw) =>
    parseCapabilityRow(raw as Record<string, unknown>),
  );
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
): Promise<CapabilityRow> {
  const res = await http.get<Record<string, unknown>>(
    `/capabilities/${encodeURIComponent(capabilityId)}`,
  );
  const raw = unwrapApiData(res);
  return parseCapabilityRow(raw);
}
