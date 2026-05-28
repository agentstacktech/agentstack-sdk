import { readFileSync } from 'fs';
import { join } from 'path';
import { ComputeCreditQuoteSchema } from '../../src/economy/schemas/computeCreditQuote';

describe('economy schema parity', () => {
  it('parses shared fixture compute_credit_quote.v1.json', () => {
    const root = join(__dirname, '../../../../../shared/fixtures/economy');
    const raw = JSON.parse(
      readFileSync(join(root, 'compute_credit_quote.v1.json'), 'utf8'),
    );
    const parsed = ComputeCreditQuoteSchema.parse(raw);
    expect(parsed.quote_id).toBe('q-demo-1');
    expect(parsed.credits_atomic).toBe(10);
  });
});
