import { coerceProjectIdKeyPart, stableKeyPart } from '../lib/queryKeyUtils';

export type StorefrontKeyParams = {
  scope?: string;
  project_id?: number;
  type?: string;
  search?: string;
  sort?: string;
  category?: string;
  collection?: string;
  page?: number;
  limit?: number;
};

export const commerceKeys = {
  cart: () => ['commerce', 'cart'] as const,
  storefront: (params?: StorefrontKeyParams) =>
    ['commerce', 'storefront', stableKeyPart(params ?? {})] as const,
  product: (listingUuid: string) => ['commerce', 'product', listingUuid] as const,
  orders: (limit = 50) => ['commerce', 'orders', limit] as const,
  order: (orderId: string) => ['commerce', 'order', orderId] as const,
  wallet: (projectId?: number) =>
    ['commerce', 'wallet', coerceProjectIdKeyPart(projectId ?? 0, 'wallet.projectId')] as const,
  sellerActivation: (projectId: number) =>
    ['commerce', 'seller-activation', coerceProjectIdKeyPart(projectId, 'sellerActivation.projectId')] as const,
  merchantDashboard: (projectId: number) =>
    ['commerce', 'merchant-dashboard', coerceProjectIdKeyPart(projectId, 'merchantDashboard.projectId')] as const,
  merchantHub: (
    projectId: number,
    listingsLimit?: number,
    ordersLimit?: number,
  ) =>
    [
      'commerce',
      'merchant-hub',
      coerceProjectIdKeyPart(projectId, 'merchantHub.projectId'),
      listingsLimit ?? 0,
      ordersLimit ?? 0,
    ] as const,
  entitlements: (projectId?: number, status?: string, limit = 50) =>
    [
      'commerce',
      'entitlements',
      coerceProjectIdKeyPart(projectId ?? 0, 'entitlements.projectId'),
      status ?? '',
      limit,
    ] as const,
  entitlement: (entitlementId: string) =>
    ['commerce', 'entitlement', entitlementId] as const,
  myPurchases: (projectId?: number, limit = 50) =>
    [
      'commerce',
      'my-purchases',
      coerceProjectIdKeyPart(projectId ?? 0, 'myPurchases.projectId'),
      limit,
    ] as const,
  subscriptionPlans: (projectId?: number) =>
    [
      'commerce',
      'subscription-plans',
      coerceProjectIdKeyPart(projectId ?? 0, 'subscriptionPlans.projectId'),
    ] as const,
  subscriptions: (projectId?: number) =>
    [
      'commerce',
      'subscriptions',
      coerceProjectIdKeyPart(projectId ?? 0, 'subscriptions.projectId'),
    ] as const,
  checkoutSession: (sessionId: string) =>
    ['commerce', 'checkout-session', sessionId] as const,
  refundStatus: (orderId: string) => ['commerce', 'refund-status', orderId] as const,
};
