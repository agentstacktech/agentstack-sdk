export type RecommendedAction = {
  id: string;
  severity: 'high' | 'medium' | 'low';
  message_key: string;
  count?: number;
};

export type SellerDashboard = {
  active_listings: number;
  draft_listings: number;
  sold_listings: number;
  orders_7d: number;
  gmv_7d_usdt: string;
  index: {
    version: number;
    global_rows: number;
    project_rows: number;
  };
  policy: {
    rails: string[];
    storefront_public: boolean;
    allowed_rails: string[];
  };
  health_score: number;
  recommended_actions: RecommendedAction[];
  stale_price_count: number;
};

export type MerchantListingRow = {
  listing_uuid: string;
  asset_id: string;
  title: string;
  thumbnail_url?: string;
  status: string;
  price_usdt: string;
  asset_price_usdt: string;
  stale_price: boolean;
  is_indexed: boolean;
  visibility: 'public' | 'limited';
  shop_href: string;
  created_at?: string;
  /** Set when status is cancelled or listing was moderated. */
  status_reason?: string;
};

export type IncomingOrderRow = {
  order_id: string;
  listing_uuid?: string;
  buyer_project_id: number;
  buyer_display_name?: string;
  buyer_user_id?: number;
  total_usdt: string;
  status?: string;
  completed_at?: string;
  created_at?: string;
  lines?: Record<string, unknown>[];
};

export type ListProjectListingsParams = {
  projectId: number;
  status?: string;
  search?: string;
  staleOnly?: boolean;
  assetId?: string;
  assetIds?: string[];
  visibility?: 'public' | 'limited';
  page?: number;
  limit?: number;
};

export type UpdateMerchantListingBody = {
  status?: string;
  price_usdt?: string;
};
