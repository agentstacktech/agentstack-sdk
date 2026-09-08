import { normalizeMarketplaceListingsResponse } from '../normalizeListingsResponse';

describe('normalizeMarketplaceListingsResponse', () => {
  it('copies top-level price_usdt onto row and listing.asset', () => {
    const { listings } = normalizeMarketplaceListingsResponse({
      total: 1,
      listings: [
        {
          listing_uuid: 'lst-1',
          seller_project_id: 42,
          listing_type: 'sell',
          status: 'active',
          price_usdt: '9.99',
          asset_id: 'asset-1',
          asset_card: { name: 'Widget', thumbnail_url: 'https://cdn/w.png' },
          facet: { category: 'tools' },
          fulfillment_mode: 'catalog_definition',
        },
      ],
    });

    expect(listings).toHaveLength(1);
    const row = listings[0];
    expect(row.price_usdt).toBe('9.99');
    expect(row.listing.asset.price_usdt).toBe('9.99');
    expect(row.asset_card?.name).toBe('Widget');
    expect(row.facet).toEqual({ category: 'tools' });
    expect(row.fulfillment_mode).toBe('catalog_definition');
    expect(row.project_id).toBe(42);
  });

  it('preserves existing listing.asset.price_usdt when present', () => {
    const { listings } = normalizeMarketplaceListingsResponse({
      listings: [
        {
          listing_uuid: 'lst-2',
          price_usdt: '20.00',
          listing: {
            type: 'sell',
            status: 'active',
            asset: { type: 'digital_item', id: 'a', quantity: 1, price_usdt: '10.00' },
          },
        },
      ],
    });
    expect(listings[0].listing.asset.price_usdt).toBe('10.00');
    expect(listings[0].price_usdt).toBe('20.00');
  });
});
