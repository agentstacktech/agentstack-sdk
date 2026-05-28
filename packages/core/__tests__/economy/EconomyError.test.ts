import { mapEconomyErrorFromHttp } from '../../src/economy/errors/EconomyError';

describe('mapEconomyErrorFromHttp', () => {
  it('maps structured FastAPI detail.code quote_expired', () => {
    const err = mapEconomyErrorFromHttp(400, {
      detail: { code: 'quote_expired', message: 'quote_expired' },
    });
    expect(err.code).toBe('QUOTE_EXPIRED');
  });

  it('maps quote_hash structured code', () => {
    const err = mapEconomyErrorFromHttp(400, {
      detail: { code: 'quote_hash', message: 'quote_hash mismatch' },
    });
    expect(err.code).toBe('QUOTE_HASH_MISMATCH');
  });
});
