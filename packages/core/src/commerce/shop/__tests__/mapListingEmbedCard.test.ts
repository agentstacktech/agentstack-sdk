import { mapListingEmbedCard } from '../mapListingEmbedCard';

describe('mapListingEmbedCard', () => {
  it('maps asset_card thumb and price fields', () => {
    const card = mapListingEmbedCard({
      uuid: 'listing-1',
      price_usdt: '12.50',
      asset_card: {
        name: 'Starter Pack',
        thumbnail_url: 'https://cdn.example.com/thumb.png',
      },
    });
    expect(card).toEqual({
      uuid: 'listing-1',
      title: 'Starter Pack',
      priceUsdt: '12.50',
      imageUrl: 'https://cdn.example.com/thumb.png',
    });
  });

  it('falls back to visual.image_url', () => {
    const card = mapListingEmbedCard({
      uuid: 'listing-2',
      asset_card: {
        name: 'Badge',
        visual: { image_url: 'https://cdn.example.com/visual.png' },
      },
      listing: { asset: { price_usdt: '4.99' } },
    });
    expect(card.imageUrl).toBe('https://cdn.example.com/visual.png');
    expect(card.priceUsdt).toBe('4.99');
  });
});
