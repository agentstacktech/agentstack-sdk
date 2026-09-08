import type {
  Listing,
  ListingAsset,
  ListingData,
  ListingStatus,
  ListingType,
  WhitelistConfig,
} from '../../types';
import type { StorefrontAssetCard } from './schemas';

export type NormalizedStorefrontListing = Listing & {
  asset_card?: StorefrontAssetCard;
  price_usdt?: string;
  facet?: Record<string, unknown>;
  fulfillment_mode?: string;
};

const LISTING_TYPES = new Set<ListingType>(['sell', 'buy', 'auction', 'exchange']);
const LISTING_STATUSES = new Set<ListingStatus>([
  'active',
  'pending',
  'sold',
  'cancelled',
  'expired',
]);

const DEFAULT_WHITELIST: WhitelistConfig = { enabled: false };

function asListingType(value: unknown): ListingType {
  return typeof value === 'string' && LISTING_TYPES.has(value as ListingType)
    ? (value as ListingType)
    : 'sell';
}

function asListingStatus(value: unknown): ListingStatus {
  return typeof value === 'string' && LISTING_STATUSES.has(value as ListingStatus)
    ? (value as ListingStatus)
    : 'active';
}

function asListingAsset(raw: Record<string, unknown>, fallbackPrice?: string): ListingAsset {
  const type =
    raw.type === 'currency' || raw.type === 'digital_item' || raw.type === 'physical_item'
      ? raw.type
      : 'digital_item';
  const price =
    raw.price_usdt != null
      ? String(raw.price_usdt)
      : fallbackPrice != null
        ? fallbackPrice
        : '0';
  return {
    type,
    id: raw.id != null ? String(raw.id) : '',
    quantity: typeof raw.quantity === 'number' && Number.isFinite(raw.quantity) ? raw.quantity : 1,
    price_usdt: price,
    ...(typeof raw.fulfillment_mode === 'string'
      ? {
          fulfillment_mode: raw.fulfillment_mode as ListingAsset['fulfillment_mode'],
        }
      : {}),
  };
}

function asListingData(
  listingData: Record<string, unknown>,
  row: Record<string, unknown>,
  asset: ListingAsset,
): ListingData {
  const sellerId = Number(listingData.seller_id ?? row.user_id ?? 0);
  const sellerProjectId = Number(
    listingData.seller_project_id ?? row.seller_project_id ?? row.project_id ?? 0,
  );
  const whitelist =
    listingData.whitelist && typeof listingData.whitelist === 'object'
      ? (listingData.whitelist as WhitelistConfig)
      : DEFAULT_WHITELIST;

  return {
    ...listingData,
    type: asListingType(listingData.type),
    status: asListingStatus(listingData.status),
    seller_id: Number.isFinite(sellerId) ? sellerId : 0,
    seller_project_id: Number.isFinite(sellerProjectId) ? sellerProjectId : 0,
    asset,
    whitelist,
  } as ListingData;
}

export function normalizeMarketplaceListingsResponse(response: {
  listings?: unknown[];
  total?: number;
}): { listings: NormalizedStorefrontListing[]; total: number } {
  const listings: NormalizedStorefrontListing[] = (response.listings || []).map((item: unknown) => {
    const row = item as Record<string, unknown>;
    const listingData =
      (row.listing as Record<string, unknown> | undefined) ||
      ({
        type: row.listing_type || row.type || 'sell',
        status: row.status || 'active',
        asset: row.asset || row.asset_card || {},
      } as Record<string, unknown>);

    const topPrice = row.price_usdt != null ? String(row.price_usdt) : undefined;
    const asset = asListingAsset(
      { ...((listingData.asset as Record<string, unknown>) || {}) },
      topPrice,
    );

    return {
      uuid: String(row.listing_uuid || row.uuid || ''),
      project_id: Number(row.seller_project_id ?? row.project_id ?? 0),
      user_id: Number(row.user_id ?? listingData.seller_id ?? 0),
      listing: asListingData(listingData, row, asset),
      deal: row.deal as Listing['deal'],
      created_at: (row.created_at as string | undefined) ?? '',
      updated_at: row.updated_at as string | undefined,
      asset_card: row.asset_card as StorefrontAssetCard | undefined,
      price_usdt: topPrice,
      facet: row.facet as Record<string, unknown> | undefined,
      fulfillment_mode:
        typeof row.fulfillment_mode === 'string' ? row.fulfillment_mode : undefined,
    };
  });

  return { listings, total: response.total ?? listings.length };
}
