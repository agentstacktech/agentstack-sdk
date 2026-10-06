import { ComputeCreditQuoteSchema } from '../../src/economy/schemas/computeCreditQuote';
import { readMonorepoFixture } from '../helpers/monorepoFixture';

describe('economy schema parity', () => {
  const raw = readMonorepoFixture(__dirname, 'economy', 'compute_credit_quote.v1.json');

  (raw ? it : it.skip)('parses shared fixture compute_credit_quote.v1.json', () => {
    const parsed = ComputeCreditQuoteSchema.parse(raw);
    expect(parsed.quote_id).toBe('q-demo-1');
    expect(parsed.credits_atomic).toBe(10);
  });
});
