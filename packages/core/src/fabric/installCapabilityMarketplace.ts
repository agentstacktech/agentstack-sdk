/**
 * Capability Marketplace REST client (`sdk.fabric.gen1`, T10.3, B7).
 */
import type { HTTPClient } from '../client/http-client';
import { unwrapApiData } from '../client/unwrapApiData';
import {
  installedMarketplaceListingSchema,
  marketplaceCatalogResponseSchema,
  marketplaceListingSchema,
  type InstalledMarketplaceListing,
  type MarketplaceCatalogEntry,
  type MyMarketplaceListingsResponse,
  type PublishMarketplaceRequest,
  type PublishMarketplaceResponse,
  type FederationSuggestion,
} from './capabilityMarketplace';

export type { FederationSuggestion };

export type InstallMarketplaceRequest = {
  project_id?: number;
};

export type InstallMarketplaceResponse = {
  success: boolean;
  already_installed: boolean;
  installed: InstalledMarketplaceListing;
  federation_suggestion?: FederationSuggestion;
};

export async function listCapabilityMarketplace(
  http: HTTPClient,
  options?: { consumerProjectId?: number },
): Promise<{
  version: number;
  count: number;
  listings: MarketplaceCatalogEntry[];
}> {
  const params = new URLSearchParams();
  if (options?.consumerProjectId) {
    params.set('consumer_project_id', String(options.consumerProjectId));
  }
  const qs = params.toString();
  const path = qs ? `/capabilities/marketplace?${qs}` : '/capabilities/marketplace';
  const res = await http.get<unknown>(path);
  return marketplaceCatalogResponseSchema.parse(unwrapApiData(res));
}

export async function listInstalledMarketplace(
  http: HTTPClient,
  projectId: number,
): Promise<{ count: number; installed: InstalledMarketplaceListing[] }> {
  const res = await http.get<{ count?: number; installed?: unknown[] }>(
    `/capabilities/marketplace/installed?project_id=${projectId}`,
  );
  const data = unwrapApiData(res);
  const installed = (data.installed ?? []).map((x) => installedMarketplaceListingSchema.parse(x));
  return { count: data.count ?? installed.length, installed };
}

export async function listMyMarketplaceListings(
  http: HTTPClient,
  publisherProjectId: number,
): Promise<MyMarketplaceListingsResponse> {
  const res = await http.get<MyMarketplaceListingsResponse>(
    `/capabilities/marketplace/mine?publisher_project_id=${publisherProjectId}`,
  );
  const data = unwrapApiData(res);
  return {
    ...data,
    listings: (data.listings ?? []).map((x) => marketplaceListingSchema.parse(x)),
  };
}

export async function publishCapabilityMarketplaceListing(
  http: HTTPClient,
  publisherProjectId: number,
  body: PublishMarketplaceRequest,
): Promise<PublishMarketplaceResponse> {
  const res = await http.post<PublishMarketplaceResponse>(
    `/capabilities/marketplace/publish?publisher_project_id=${publisherProjectId}`,
    body,
  );
  const data = unwrapApiData(res);
  return {
    ...data,
    listing: marketplaceListingSchema.parse(data.listing),
  };
}

export async function unpublishCapabilityMarketplaceListing(
  http: HTTPClient,
  publisherProjectId: number,
  listingId: string,
): Promise<PublishMarketplaceResponse> {
  const res = await http.delete<PublishMarketplaceResponse>(
    `/capabilities/marketplace/${encodeURIComponent(listingId)}/publish?publisher_project_id=${publisherProjectId}`,
  );
  const data = unwrapApiData(res);
  return {
    ...data,
    listing: marketplaceListingSchema.parse(data.listing),
  };
}

export async function installCapabilityMarketplaceListing(
  http: HTTPClient,
  listingId: string,
  body: InstallMarketplaceRequest,
): Promise<InstallMarketplaceResponse> {
  const res = await http.post<InstallMarketplaceResponse>(
    `/capabilities/marketplace/${encodeURIComponent(listingId)}/install`,
    body,
  );
  const data = unwrapApiData(res);
  return {
    ...data,
    installed: installedMarketplaceListingSchema.parse(data.installed),
  };
}
