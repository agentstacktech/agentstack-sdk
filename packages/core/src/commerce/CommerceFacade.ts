import type { HTTPClient } from '../client/http-client';
import { CommerceAiClient } from './ai/CommerceAiClient';
import { CartClient } from './cart/CartClient';
import { CartFacade } from './cart/CartFacade';
import { HostedStorefrontClient } from './storefront/HostedStorefrontClient';
import { StorefrontSeedClient } from './storefront/StorefrontSeedClient';
import { CheckoutClient } from './checkout/CheckoutClient';
import { OrdersClient } from './orders/OrdersClient';
import { SellerActivationClient } from './sell/SellerActivationClient';
import { EntitlementsClient } from './entitlements/EntitlementsClient';
import { SubscriptionClient } from './subscription/SubscriptionClient';
import { RefundClient } from './refund/RefundClient';
import { MerchantClient } from './merchant/MerchantClient';
import { bulkCreateListings } from './marketplace/bulkClient';
import { listStorefrontListings, type ListStorefrontParams } from './marketplace/storefrontClient';
import { getProductBundle, type ProductBundle } from './shop/getProductBundle';
import { resolveShopSlug } from './shop/resolveShopSlug';
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
  readonly cartFacade: CartFacade;
  readonly checkout: CheckoutClient;
  readonly orders: OrdersClient;
  readonly sell: SellerActivationClient;
  readonly entitlements: EntitlementsClient;
  readonly subscription: SubscriptionClient;
  readonly refund: RefundClient;
  readonly merchantClient: MerchantClient;

  readonly discovery: {
    listOffers: (params?: ListOffersParams) => ReturnType<typeof listStorefrontListings>;
    getProduct: (listingUuid: string) => Promise<ProductBundle>;
    resolveShopSlug: (slug: string) => ReturnType<typeof resolveShopSlug>;
  };

  readonly merchant: {
    createListing: (data: Record<string, unknown>) => Promise<unknown>;
    bulkCreate: (
      projectId: number,
      body: Parameters<typeof bulkCreateListings>[2],
    ) => ReturnType<typeof bulkCreateListings>;
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

  readonly storefront: {
    seed: StorefrontSeedClient;
    hosted: HostedStorefrontClient;
  };

  readonly ai: CommerceAiClient;

  /** @deprecated Use discovery.listOffers */
  listStorefront: (params?: ListOffersParams) => ReturnType<typeof listStorefrontListings>;
  /** @deprecated Use merchant.bulkCreate */
  bulkCreateListings: (
    projectId: number,
    body: Parameters<typeof bulkCreateListings>[2],
  ) => ReturnType<typeof bulkCreateListings>;

  constructor(private readonly http: HTTPClient) {
    this.cart = new CartClient(http);
    this.cartFacade = new CartFacade(http, 'server');
    this.checkout = new CheckoutClient(http);
    this.orders = new OrdersClient(http);
    this.sell = new SellerActivationClient(http);
    this.entitlements = new EntitlementsClient(http);
    this.subscription = new SubscriptionClient(http);
    this.refund = new RefundClient(http);
    this.merchantClient = new MerchantClient(http);
    this.discovery = {
      listOffers: (params) => listStorefrontListings(http, params),
      getProduct: (listingUuid) => getProductBundle(http, listingUuid),
      resolveShopSlug: (slug) => resolveShopSlug(http, slug),
    };
    this.merchant = {
      createListing: async (data) => {
        const response = await http.post('/commerce/merchant/listings', data);
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
    this.storefront = {
      seed: new StorefrontSeedClient(http),
      hosted: new HostedStorefrontClient(http),
    };
    this.ai = new CommerceAiClient(http);
    this.listStorefront = this.discovery.listOffers;
    this.bulkCreateListings = this.merchant.bulkCreate;
  }
}
