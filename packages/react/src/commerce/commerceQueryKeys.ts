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
    ['commerce', 'storefront', params ?? {}] as const,
  product: (listingUuid: string) => ['commerce', 'product', listingUuid] as const,
  orders: (limit = 50) => ['commerce', 'orders', limit] as const,
  order: (orderId: string) => ['commerce', 'order', orderId] as const,
  wallet: (projectId?: number) => ['commerce', 'wallet', projectId ?? 0] as const,
  sellerActivation: (projectId: number) =>
    ['commerce', 'seller-activation', projectId] as const,
  merchantDashboard: (projectId: number) =>
    ['commerce', 'merchant-dashboard', projectId] as const,
  merchantHub: (
    projectId: number,
    listingsLimit?: number,
    ordersLimit?: number,
  ) => ['commerce', 'merchant-hub', projectId, listingsLimit ?? 0, ordersLimit ?? 0] as const,
  entitlements: (projectId?: number, status?: string, limit = 50) =>
    ['commerce', 'entitlements', projectId ?? 0, status ?? '', limit] as const,
  entitlement: (entitlementId: string) =>
    ['commerce', 'entitlement', entitlementId] as const,
  myPurchases: (projectId?: number, limit = 50) =>
    ['commerce', 'my-purchases', projectId ?? 0, limit] as const,
  subscriptionPlans: (projectId?: number) =>
    ['commerce', 'subscription-plans', projectId ?? 0] as const,
  subscriptions: (projectId?: number) =>
    ['commerce', 'subscriptions', projectId ?? 0] as const,
  checkoutSession: (sessionId: string) =>
    ['commerce', 'checkout-session', sessionId] as const,
  refundStatus: (orderId: string) => ['commerce', 'refund-status', orderId] as const,
};
