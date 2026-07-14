import type { ListOffersParams } from '@agentstack/sdk/commerce';

/** Optional overlay bridge — host app (AgentStack SPA) injects ModalSDK actions. */
export type CommerceEmbedActions = {
  openProductQuickView?: (listingId: string) => void;
  openCartDrawer?: () => void;
  openCheckout?: (listingId: string) => void;
};

export type CommerceEmbedTelemetry = {
  onLoaded?: (surface: string, projectId?: number) => void;
  onBuyClick?: (listingUuid: string, surface: string) => void;
  onImpression?: (surface: string, projectId?: number) => void;
};

export type BuyButtonProps = {
  listingId: string;
  label?: string;
  className?: string;
  actions?: CommerceEmbedActions;
  shopListingPath?: (listingId: string) => string;
  telemetry?: CommerceEmbedTelemetry;
  telemetrySurface?: string;
};

export type CartButtonProps = {
  label?: string;
  className?: string;
  actions?: CommerceEmbedActions;
  cartPath?: string;
};

export type ProductGridEmbedProps = {
  projectId?: number;
  limit?: number;
  params?: ListOffersParams;
  className?: string;
  actions?: CommerceEmbedActions;
  shopListingPath?: (listingId: string) => string;
  telemetry?: CommerceEmbedTelemetry;
  telemetrySurface?: string;
};

export type MiniShopProps = {
  projectId: number;
  limit?: number;
  title?: string;
  className?: string;
  actions?: CommerceEmbedActions;
  shopHref?: string;
  shopListingPath?: (listingId: string) => string;
  telemetry?: CommerceEmbedTelemetry;
  telemetrySurface?: string;
};

export type ProductQuickViewProps = {
  listingId: string;
  open?: boolean;
  onClose?: () => void;
  actions?: CommerceEmbedActions;
  shopListingPath?: (listingId: string) => string;
};
