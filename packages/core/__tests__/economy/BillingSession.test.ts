import { BillingSession } from '../../src/economy/sessions/BillingSession';
import { EconomyError } from '../../src/economy/errors/EconomyError';
import type { ComputeCreditsClient } from '../../src/economy/clients/ComputeCreditsClient';

describe('BillingSession', () => {
  it('throws QUOTE_REQUIRED without quote', async () => {
    const credits = {
      purchase: jest.fn(),
    } as unknown as ComputeCreditsClient;
    const session = new BillingSession(1, credits, 42);
    await expect(session.purchase('key-1')).rejects.toMatchObject({
      code: 'QUOTE_REQUIRED',
    });
  });

  it('throws QUOTE_EXPIRED when past expires_at', async () => {
    const credits = {
      quote: jest.fn().mockResolvedValue({
        quote: {
          quote_id: '1',
          quote_hash: 'h',
          credits_atomic: 5,
          expires_at: '2000-01-01T00:00:00Z',
        },
      }),
      purchase: jest.fn(),
    } as unknown as ComputeCreditsClient;
    const session = new BillingSession(1, credits, 42);
    await session.quoteCredits(5);
    await expect(session.purchase('key-1')).rejects.toBeInstanceOf(EconomyError);
    await expect(session.purchase('key-1')).rejects.toMatchObject({ code: 'QUOTE_EXPIRED' });
  });
});
