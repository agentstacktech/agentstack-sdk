import type { HTTPClient } from '../client/http-client';
import { CartClient } from './cart/CartClient';
import { CheckoutClient } from './checkout/CheckoutClient';
import { OrdersClient } from './orders/OrdersClient';
import { bulkCreateListings } from './marketplace/bulkClient';
import { listStorefrontListings, type ListStorefrontParams } from './marketplace/storefrontClient';
import { getProductBundle, type ProductBundle } from './shop/getProductBundle';
import { getMerchantShelfStats } from './merchant/getShelfStats';
import { getSellerDashboard } from './merchant/getSellerDashboard';
import { getMerchantHubSnapshot } from './merchant/getMerchantHubSnapshot';
import { listProjectListings } from './merchant/listProjectListings';
import { listIncomingOrders } from './merchant/listIncomingOrders';
import {
  bulkDeactivateListings,
  bulkSyncStalePrices,
  deactivateListing,
  reindexListing,
  syncListingPrice,
  updateMerchantListing,
} from './merchant/merchantListingMutations';
import type { UpdateMerchantListingBody } from './merchant/types';
import { updateMerchantPolicy } from './merchant/updateMerchantPolicy';
import type { ListProjectListingsParams } from './merchant/types';
import {
  getProjectCommercePolicy,
  type ProjectCommercePolicy,
} from './marketplace/getProjectCommercePolicy';
import { getCommerceChecklist, getCatalogHints, getListingDraftDefaults } from './guidance';
import {
  getParticipantWalletSummary,
  grantParticipantHolding,
  listParticipantHoldings,
} from './participant';

export type ListOffersParams = ListStorefrontParams;

export class CommerceFacade {
  readonly cart: CartClient;
  readonly checkout: CheckoutClient;
  readonly orders: OrdersClient;

  readonly discovery: {
    listOffers: (params?: ListOffersParams) => ReturnType<typeof listStorefrontListings>;
    getProduct: (listingUuid: string) => Promise<ProductBundle>;
  };

  readonly merchant: {
    createListing: (data: Record<string, unknown>) => Promise<unknown>;
    bulkCreate: typeof bulkCreateListings;
    /** @deprecated Use getDashboard */
    getShelfStats: (projectId: number) => ReturnType<typeof getMerchantShelfStats>;
    getDashboard: (projectId: number) => ReturnType<typeof getSellerDashboard>;
    getHubSnapshot: (
      projectId: number,
      opts?: { listingsLimit?: number; ordersLimit?: number },
    ) => ReturnType<typeof getMerchantHubSnapshot>;
    listProjectListings: (params: ListProjectListingsParams) => ReturnType<typeof listProjectListings>;
    listIncomingOrders: (
      projectId: number,
      opts?: { page?: number; limit?: number },
    ) => ReturnType<typeof listIncomingOrders>;
    updateListing: (
      projectId: number,
      listingUuid: string,
      body: UpdateMerchantListingBody,
    ) => ReturnType<typeof updateMerchantListing>;
    deactivateListing: (
      projectId: number,
      listingUuid: string,
    ) => ReturnType<typeof deactivateListing>;
    syncListingPrice: (
      projectId: number,
      listingUuid: string,
    ) => ReturnType<typeof syncListingPrice>;
    reindexListing: (projectId: number, listingUuid: string) => ReturnType<typeof reindexListing>;
    bulkDeactivate: (
      projectId: number,
      uuids: string[],
    ) => ReturnType<typeof bulkDeactivateListings>;
    bulkSyncStalePrices: (projectId: number) => ReturnType<typeof bulkSyncStalePrices>;
    getPolicy: (projectId: number) => Promise<ProjectCommercePolicy>;
    updatePolicy: (
      projectId: number,
      policy: ProjectCommercePolicy,
    ) => ReturnType<typeof updateMerchantPolicy>;
  };

  readonly guidance: {
    getChecklist: (projectId: number) => ReturnType<typeof getCommerceChecklist>;
    getCatalogHints: (
      projectId: number,
      assetIds?: string[],
    ) => ReturnType<typeof getCatalogHints>;
    getListingDraft: (
      projectId: number,
      assetId: string,
    ) => ReturnType<typeof getListingDraftDefaults>;
  };

  readonly participant: {
    listHoldings: (
      projectId: number,
      opts?: { limit?: number },
    ) => ReturnType<typeof listParticipantHoldings>;
    getWalletSummary: (
      projectId?: number,
    ) => ReturnType<typeof getParticipantWalletSummary>;
    grantHolding: (
      projectId: number,
      body: Parameters<typeof grantParticipantHolding>[2],
    ) => ReturnType<typeof grantParticipantHolding>;
  };

  /** @deprecated Use discovery.listOffers */
  listStorefront: (params?: ListOffersParams) => ReturnType<typeof listStorefrontListings>;
  /** @deprecated Use merchant.bulkCreate */
  bulkCreateListings: typeof bulkCreateListings;

  constructor(private readonly http: HTTPClient) {
    this.cart = new CartClient(http);
    this.checkout = new CheckoutClient(http);
    this.orders = new OrdersClient(http);
    this.discovery = {
      listOffers: (params) => listStorefrontListings(http, params),
      getProduct: (listingUuid) => getProductBundle(http, listingUuid),
    };
    this.merchant = {
      createListing: async (data) => {
        const response = await http.post('/marketplace/listings', data);
        return response.data?.listing ?? response.data;
      },
      bulkCreate: (projectId, body) => bulkCreateListings(http, projectId, body),
      getShelfStats: (projectId) => getMerchantShelfStats(http, projectId),
      getDashboard: (projectId) => getSellerDashboard(http, projectId),
      getHubSnapshot: (projectId, opts) => getMerchantHubSnapshot(http, projectId, opts),
      listProjectListings: (params) => listProjectListings(http, params),
      listIncomingOrders: (projectId, opts) => listIncomingOrders(http, projectId, opts),
      updateListing: (projectId, uuid, body) =>
        updateMerchantListing(http, projectId, uuid, body),
      deactivateListing: (projectId, uuid) => deactivateListing(http, projectId, uuid),
      syncListingPrice: (projectId, uuid) => syncListingPrice(http, projectId, uuid),
      reindexListing: (projectId, uuid) => reindexListing(http, projectId, uuid),
      bulkDeactivate: (projectId, uuids) => bulkDeactivateListings(http, projectId, uuids),
      bulkSyncStalePrices: (projectId) => bulkSyncStalePrices(http, projectId),
      getPolicy: (projectId) => getProjectCommercePolicy(http, projectId),
      updatePolicy: (projectId, policy) =>
        updateMerchantPolicy(http, { projectId, ...policy }),
    };
    this.guidance = {
      getChecklist: (projectId) => getCommerceChecklist(http, projectId),
      getCatalogHints: (projectId, assetIds) => getCatalogHints(http, projectId, assetIds),
      getListingDraft: (projectId, assetId) =>
        getListingDraftDefaults(http, projectId, assetId),
    };
    this.participant = {
      listHoldings: (projectId, opts) => listParticipantHoldings(http, projectId, opts),
      getWalletSummary: (projectId) => getParticipantWalletSummary(http, projectId),
      grantHolding: (projectId, body) => grantParticipantHolding(http, projectId, body),
    };
    this.listStorefront = this.discovery.listOffers;
    this.bulkCreateListings = this.merchant.bulkCreate;
  }
}
