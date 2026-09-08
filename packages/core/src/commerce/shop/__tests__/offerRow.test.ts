import { resolveOfferRowFields } from '../offerRow';

describe('resolveOfferRowFields', () => {
  it('resolves uuid, title, thumb, and price from browse row', () => {
    const fields = resolveOfferRowFields({
      uuid: 'lst-1',
      price_usdt: '12.50',
      asset_card: {
        name: 'Pro Pack',
        thumbnail_url: 'https://cdn.example/t.png',
        rarity: 'rare',
      },
    });
    expect(fields).toMatchObject({
      uuid: 'lst-1',
      title: 'Pro Pack',
      imageUrl: 'https://cdn.example/t.png',
      priceUsdt: '12.50',
      rarity: 'rare',
    });
  });

  it('falls back to listing_uuid and listing.asset price', () => {
    const fields = resolveOfferRowFields({
      listing_uuid: 'lst-2',
      listing: { asset: { name: 'Fallback', price_usdt: '3.00' } },
      asset_card: { visual: { image_url: 'https://cdn.example/v.png' } },
    });
    expect(fields.uuid).toBe('lst-2');
    expect(fields.title).toBe('Fallback');
    expect(fields.priceUsdt).toBe('3.00');
    expect(fields.imageUrl).toBe('https://cdn.example/v.png');
  });
});
