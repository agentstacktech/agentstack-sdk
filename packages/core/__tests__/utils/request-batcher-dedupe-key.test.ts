import { batchGetDedupeKey, normalizeBatchSubUrl } from '../../src/utils/request-batcher';

describe('normalizeBatchSubUrl', () => {
  it('prefixes commerce merchant paths with /api', () => {
    expect(normalizeBatchSubUrl('/commerce/merchant/listings')).toBe(
      '/api/commerce/merchant/listings',
    );
  });
});

describe('batchGetDedupeKey', () => {
  it('returns null for non-GET', () => {
    expect(batchGetDedupeKey('POST', '/api/x', { a: 1 })).toBeNull();
  });

  it('is stable across param key order', () => {
    const a = batchGetDedupeKey('GET', '/api/seo/meta', { path: '/a', locale: 'en' });
    const b = batchGetDedupeKey('GET', '/api/seo/meta', { locale: 'en', path: '/a' });
    expect(a).toBe(b);
  });

  it('differs when URL differs', () => {
    const a = batchGetDedupeKey('GET', '/api/seo/meta', {});
    const b = batchGetDedupeKey('GET', '/api/seo/other', {});
    expect(a).not.toBe(b);
  });
});
