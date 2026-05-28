export type GuidanceChecklistStep = {
  id: string;
  done: boolean;
  severity: 'high' | 'medium' | 'low';
  message_key: string;
};

export type CatalogHint = {
  asset_id: string;
  listing_uuid?: string | null;
  listing_status?: string | null;
  stale_price: boolean;
  eligible: boolean;
  ineligible_reason?: string | null;
  suggested_price_usdt: string;
  visibility?: string | null;
};

export type ListingDraftDefaults = {
  asset_id: string;
  price_usdt: string;
  suggested_price_usdt: string;
  quantity: number;
  visibility: string;
  storefront_public: boolean;
  rails: string[];
};
