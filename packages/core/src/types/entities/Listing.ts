import { AssetInExchange } from './Asset';

/**
 * Listing - объявление на маркетплейсе
 * 
 * AI AGENT QUICK START:
 * 
 * Create:
 *   const listing = await sdk.marketplace.createListing({
 *     type: "sell",
 *     asset: { type: "digital_item", id: "asset_diamond_001", quantity: 10 },
 *     price_usdt: "100.00",
 *     whitelist: { enabled: true, currencies: [...] }
 *   })
 * 
 * STORAGE: data_marketplace_listings (8DNA)
 */

/**
 * Listing Type
 */
export type ListingType = 'sell' | 'buy' | 'auction' | 'exchange';

/**
 * Listing Status
 */
export type ListingStatus = 'active' | 'pending' | 'sold' | 'cancelled' | 'expired';

/**
 * Deal Status (for active deals)
 */
export type DealStatus = 'pending' | 'locked' | 'confirmed' | 'completed';

/**
 * Listing Asset
 */
export interface ListingAsset {
  /**
   * Asset type
   */
  type: 'currency' | 'digital_item' | 'physical_item';

  /**
   * Asset ID
   */
  id: string;

  /**
   * Quantity
   */
  quantity: number;

  /**
   * Base price in USDT
   */
  price_usdt: string;
}

/**
 * Whitelist Currency Entry
 */
export interface WhitelistCurrencyEntry {
  /**
   * Currency code
   */
  currency: string;

  /**
   * Price in this currency
   */
  price: string;

  /**
   * Minimum amount
   */
  min_amount?: string;
}

/**
 * Whitelist Asset Entry
 */
export interface WhitelistAssetEntry {
  /**
   * Asset ID
   */
  asset_id: string;

  /**
   * Price (1 unit = price USDT)
   */
  price: string;

  /**
   * Minimum quantity
   */
  min_quantity?: number;
}

/**
 * Whitelist Configuration
 */
export interface WhitelistConfig {
  /**
   * Whitelist enabled
   */
  enabled: boolean;

  /**
   * Allowed currencies
   */
  currencies?: WhitelistCurrencyEntry[];

  /**
   * Allowed assets
   */
  assets?: WhitelistAssetEntry[];

  /**
   * Template name (from project config)
   */
  template?: string;
}

/**
 * Auto Accept Conditions
 */
export interface AutoAcceptConditions {
  /**
   * Minimum price in USDT
   */
  min_price?: string;

  /**
   * Allowed currencies only
   */
  currencies_only?: string[];

  /**
   * Maximum quantity
   */
  max_quantity?: number;
}

/**
 * Auto Accept Configuration
 */
export interface AutoAcceptConfig {
  /**
   * Auto accept enabled
   */
  enabled: boolean;

  /**
   * Conditions
   */
  conditions?: AutoAcceptConditions;
}

/**
 * Auction Configuration
 */
export interface AuctionConfig {
  /**
   * Start price
   */
  start_price: string;

  /**
   * Current bid
   */
  current_bid?: string;

  /**
   * Bid increment
   */
  bid_increment: string;

  /**
   * End time
   */
  end_time: string;

  /**
   * Highest bidder ID
   */
  highest_bidder_id?: number;
}

/**
 * Commission Breakdown
 */
export interface CommissionBreakdown {
  /**
   * Commission rate
   */
  rate: number;

  /**
   * Commission amount
   */
  amount: string;

  /**
   * Currency
   */
  currency: string;

  /**
   * Wallet ID (where commission goes)
   */
  wallet_id?: string;
}

/**
 * Deal Commissions
 */
export interface DealCommissions {
  /**
   * Ecosystem commission (project_id=1)
   */
  ecosystem?: CommissionBreakdown;

  /**
   * Seller project commission
   */
  seller_project?: CommissionBreakdown;

  /**
   * Buyer project commission
   */
  buyer_project?: CommissionBreakdown;
}

/**
 * Deal Escrow
 */
export interface DealEscrow {
  /**
   * Seller assets (locked)
   */
  seller_assets: AssetInExchange[];

  /**
   * Buyer assets (locked)
   */
  buyer_assets: AssetInExchange[];
}

/**
 * Deal Timestamps
 */
export interface DealTimestamps {
  /**
   * When deal was accepted
   */
  accepted_at?: string;

  /**
   * When assets were locked
   */
  locked_at?: string;

  /**
   * When deal was confirmed
   */
  confirmed_at?: string;
}

/**
 * Deal Timeout
 */
export interface DealTimeout {
  /**
   * Lock timeout
   */
  lock_timeout?: string;

  /**
   * Confirm timeout
   */
  confirm_timeout?: string;
}

/**
 * Deal Confirmations
 */
export interface DealConfirmations {
  /**
   * Seller confirmation
   */
  seller?: boolean;

  /**
   * Buyer confirmation
   */
  buyer?: boolean;
}

/**
 * Active Deal
 * Only exists when deal is in progress
 */
export interface ActiveDeal {
  /**
   * Deal status
   */
  status: DealStatus;

  /**
   * Buyer ID
   */
  buyer_id: number;

  /**
   * Buyer project ID
   */
  buyer_project_id: number;

  /**
   * Buyer offer
   */
  buyer_offer: AssetInExchange[];

  /**
   * Escrow (locked assets)
   */
  escrow: DealEscrow;

  /**
   * Timestamps
   */
  timestamps: DealTimestamps;

  /**
   * Timeout
   */
  timeout?: DealTimeout;

  /**
   * Commissions
   */
  commissions?: DealCommissions;

  /**
   * Confirmations (seller and buyer)
   */
  confirmations?: DealConfirmations;
}

/**
 * Listing Data
 */
export interface ListingData {
  /**
   * Listing type
   */
  type: ListingType;

  /**
   * Listing status
   */
  status: ListingStatus;

  /**
   * Seller ID
   */
  seller_id: number;

  /**
   * Seller project ID
   */
  seller_project_id: number;

  /**
   * Asset being sold/bought
   */
  asset: ListingAsset;

  /**
   * Whitelist configuration
   */
  whitelist: WhitelistConfig;

  /**
   * Auto accept configuration
   */
  auto_accept?: AutoAcceptConfig;

  /**
   * Auction configuration (only for auction type)
   */
  auction?: AuctionConfig;
}

/**
 * Listing (Full Entity)
 */
export interface Listing {
  /**
   * Listing UUID
   */
  uuid: string;

  /**
   * Project ID
   */
  project_id: number;

  /**
   * User ID (seller/creator)
   */
  user_id: number;

  /**
   * Listing data
   */
  listing: ListingData;

  /**
   * Active deal (if deal is in progress)
   */
  deal?: ActiveDeal;

  /**
   * Escrow (for seller assets locked at listing creation)
   */
  escrow?: DealEscrow;

  /**
   * Created at
   */
  created_at: string;

  /**
   * Updated at
   */
  updated_at?: string;
}

/**
 * Create Listing Request
 */
export interface CreateListingRequest {
  type: ListingType;
  asset: ListingAsset;
  whitelist: WhitelistConfig;
  auto_accept?: AutoAcceptConfig;
  auction?: AuctionConfig;
}

/**
 * Update Listing Request
 */
export interface UpdateListingRequest {
  listing?: Partial<ListingData>;
  deal?: Partial<ActiveDeal>;
}

/**
 * Accept Listing Request
 */
export interface AcceptListingRequest {
  buyer_offer: AssetInExchange[];
}

