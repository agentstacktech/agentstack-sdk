/**
 * Global Asset Registry Types
 * Types for global assets registry with metrics and tracking
 */

import { BaseAsset } from './Asset';

/**
 * Price Point - точка истории цен
 */
export interface PricePoint {
  /**
   * Price at this point
   */
  price: string; // Decimal string

  /**
   * Timestamp
   */
  timestamp: string; // ISO datetime

  /**
   * Transaction type
   */
  type?: 'sale' | 'exchange';
}

/**
 * Asset Trends - тренды ассета
 */
export interface AssetTrends {
  /**
   * Price change over 24 hours
   */
  price_change_24h: string; // Decimal string

  /**
   * Price change over 7 days
   */
  price_change_7d: string; // Decimal string

  /**
   * Volume change over 24 hours
   */
  volume_change_24h: string; // Decimal string
}

/**
 * Asset Popularity - популярность ассета
 */
export interface AssetPopularity {
  /**
   * Number of views
   */
  views: number;

  /**
   * Number of favorites
   */
  favorites: number;

  /**
   * Search rank
   */
  search_rank: number;
}

/**
 * Asset Availability - доступность ассета
 */
export interface AssetAvailability {
  /**
   * Project IDs where asset is available
   */
  project_ids: number[];

  /**
   * Available for cross-project trading
   */
  cross_project: boolean;
}

/**
 * Asset Metrics - метрики ассета
 */
export interface AssetMetrics {
  /**
   * Current price in USDT
   */
  current_price: string; // Decimal string

  /**
   * Available quantity
   */
  quantity_available: number;

  /**
   * Total number of sales
   */
  total_sales: number;

  /**
   * Total number of exchanges
   */
  total_exchanges: number;

  /**
   * Average transaction price
   */
  average_price: string; // Decimal string

  /**
   * Last transaction price
   */
  last_price: string; // Decimal string

  /**
   * Total trade volume in USDT
   */
  trade_volume: string; // Decimal string

  /**
   * Rating (0-5)
   */
  rating: number;

  /**
   * Price history
   */
  price_history: PricePoint[];

  /**
   * Trends
   */
  trends: AssetTrends;

  /**
   * Popularity metrics
   */
  popularity: AssetPopularity;

  /**
   * Availability information
   */
  availability: AssetAvailability;
}

/**
 * Global Asset Card - карточка ассета в глобальном реестре
 */
export interface GlobalAssetCard {
  /**
   * Asset data
   */
  asset: BaseAsset;

  /**
   * Asset metrics
   */
  metrics: AssetMetrics;

  /**
   * Registration timestamp
   */
  registered_at: string; // ISO datetime

  /**
   * Last update timestamp
   */
  last_updated: string; // ISO datetime

  /**
   * Last sync timestamp
   */
  last_synced: string; // ISO datetime
}

/**
 * Global Assets List Response
 */
export interface GlobalAssetsListResponse {
  /**
   * List of asset cards
   */
  assets: GlobalAssetCard[];

  /**
   * Total count
   */
  total: number;

  /**
   * Current page
   */
  page: number;

  /**
   * Page size
   */
  page_size: number;

  /**
   * Total pages
   */
  pages: number;
}

/**
 * Global Assets Filters
 */
export interface GlobalAssetsFilters {
  /**
   * Asset type filter
   */
  type?: 'currency' | 'digital_item' | 'physical_item' | 'service' | 'nft';

  /**
   * Project ID filter
   */
  project_id?: number;

  /**
   * Minimum price
   */
  min_price?: string; // Decimal string

  /**
   * Maximum price
   */
  max_price?: string; // Decimal string

  /**
   * Cross-project only
   */
  cross_project?: boolean;

  /**
   * Sort by field
   */
  sort_by?: 'price' | 'popularity' | 'volume' | 'rating';
}

