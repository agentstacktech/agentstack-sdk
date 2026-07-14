import type { HTTPClient } from '../../client/http-client';
import { bulkCreateListings } from '../marketplace/bulkClient';
import {
  getProjectCommercePolicy,
  type ProjectCommercePolicy,
} from '../marketplace/getProjectCommercePolicy';
import { getMerchantHubSnapshot } from './getMerchantHubSnapshot';
import { getSellerDashboard } from './getSellerDashboard';
import { getMerchantShelfStats } from './getShelfStats';
import { listIncomingOrders } from './listIncomingOrders';
import { listProjectListings } from './listProjectListings';
import {
  bulkDeactivateListings,
  bulkSyncStalePrices,
  deactivateListing,
  reindexListing,
  syncListingPrice,
  updateMerchantListing,
} from './merchantListingMutations';
import type {
  ListProjectListingsParams,
  UpdateMerchantListingBody,
} from './types';
import { updateMerchantPolicy } from './updateMerchantPolicy';

/** Consolidated merchant REST client — wraps standalone merchant helpers. */
export class MerchantClient {
  constructor(private readonly http: HTTPClient) {}

  async createListing(data: Record<string, unknown>): Promise<unknown> {
    const response = await this.http.post('/commerce/merchant/listings', data);
    return response.data?.listing ?? response.data;
  }

  bulkCreate(
    projectId: number,
    body: Parameters<typeof bulkCreateListings>[2],
  ) {
    return bulkCreateListings(this.http, projectId, body);
  }

  getShelfStats(projectId: number) {
    return getMerchantShelfStats(this.http, projectId);
  }

  getDashboard(projectId: number) {
    return getSellerDashboard(this.http, projectId);
  }

  getHubSnapshot(
    projectId: number,
    opts?: { listingsLimit?: number; ordersLimit?: number },
  ) {
    return getMerchantHubSnapshot(this.http, projectId, opts);
  }

  listProjectListings(params: ListProjectListingsParams) {
    return listProjectListings(this.http, params);
  }

  listIncomingOrders(
    projectId: number,
    opts?: { page?: number; limit?: number },
  ) {
    return listIncomingOrders(this.http, projectId, opts);
  }

  updateListing(
    projectId: number,
    listingUuid: string,
    body: UpdateMerchantListingBody,
  ) {
    return updateMerchantListing(this.http, projectId, listingUuid, body);
  }

  deactivateListing(projectId: number, listingUuid: string) {
    return deactivateListing(this.http, projectId, listingUuid);
  }

  syncListingPrice(projectId: number, listingUuid: string) {
    return syncListingPrice(this.http, projectId, listingUuid);
  }

  reindexListing(projectId: number, listingUuid: string) {
    return reindexListing(this.http, projectId, listingUuid);
  }

  bulkDeactivate(projectId: number, uuids: string[]) {
    return bulkDeactivateListings(this.http, projectId, uuids);
  }

  bulkSyncStalePrices(projectId: number) {
    return bulkSyncStalePrices(this.http, projectId);
  }

  getPolicy(projectId: number): Promise<ProjectCommercePolicy> {
    return getProjectCommercePolicy(this.http, projectId);
  }

  updatePolicy(projectId: number, policy: ProjectCommercePolicy) {
    return updateMerchantPolicy(this.http, { projectId, ...policy });
  }
}
