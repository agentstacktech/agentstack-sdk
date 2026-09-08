import { resolveOfferThumb } from '../resolveOfferThumb';
import {
  listingToProductCardPropsFromParts,
} from '../listingToProductCard';

describe('resolveOfferThumb', () => {
  it('prefers thumbnail_url over image_url', () => {
    expect(
      resolveOfferThumb({ thumbnail_url: 'https://a/thumb.png', image_url: 'https://a/img.png' }),
    ).toBe('https://a/thumb.png');
  });

  it('falls back to image_url', () => {
    expect(resolveOfferThumb({ image_url: 'https://a/img.png' })).toBe('https://a/img.png');
  });

  it('reads nested visual.image_url', () => {
    expect(
      resolveOfferThumb({ visual: { image_url: 'https://a/visual.png' } }),
    ).toBe('https://a/visual.png');
  });

  it('returns undefined for empty input', () => {
    expect(resolveOfferThumb(undefined)).toBeUndefined();
    expect(resolveOfferThumb({})).toBeUndefined();
  });
});

describe('listingToProductCardProps', () => {
  it('maps thumbnail_url and price_usdt', () => {
    const props = listingToProductCardPropsFromParts(
      {
        asset_card: { name: 'Pro Pack', thumbnail_url: 'https://cdn/t.png', rarity: 'rare' },
        price_usdt: '15.00',
      },
      '/shop/listing/u1',
    );
    expect(props.title).toBe('Pro Pack');
    expect(props.imageUrl).toBe('https://cdn/t.png');
    expect(props.price.amount).toBe(1500);
    expect(props.badge).toBe('rare');
    expect(props.href).toBe('/shop/listing/u1');
  });

  it('omits badge for common rarity', () => {
    const props = listingToProductCardPropsFromParts(
      { asset_card: { name: 'Basic', rarity: 'common' }, price_usdt: '1' },
      '/shop/x',
    );
    expect(props.badge).toBeUndefined();
  });

  it('uses zero price for bad price string', () => {
    const props = listingToProductCardPropsFromParts(
      { asset_card: { name: 'X' }, price_usdt: 'not-a-number' },
      '/shop/x',
    );
    expect(props.price.amount).toBe(0);
  });
});
