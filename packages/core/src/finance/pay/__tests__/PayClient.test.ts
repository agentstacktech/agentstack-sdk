import { PayClient } from '../PayClient';
import type { HTTPClient } from '../../../client/http-client';

describe('PayClient', () => {
  it('quote posts to finance pay quote and unwraps data', async () => {
    const quotePayload = {
      quote_id: 'q1',
      quote_hash: 'h1',
      intent: 'invoice_pay',
      amount: '10.00',
      currency: 'USD',
    };
    const post = jest.fn(async () => ({ data: quotePayload }));
    const http = { post } as unknown as HTTPClient;
    const client = new PayClient(http);

    const body = {
      intent: 'invoice_pay' as const,
      source: { kind: 'personal_wallet' as const, project_id: 1 },
      amount: 10,
      currency: 'USD',
    };
    const result = await client.quote(42, body);

    expect(post).toHaveBeenCalledWith('/finance/42/pay/quote', body, { signal: undefined });
    expect(result).toEqual(quotePayload);
  });

  it('execute posts to finance pay execute and unwraps data', async () => {
    const executePayload = {
      success: true,
      transaction_id: 'tx-1',
      amount: '10.00',
      currency: 'USD',
    };
    const post = jest.fn(async () => ({ data: executePayload }));
    const http = { post } as unknown as HTTPClient;
    const client = new PayClient(http);

    const body = {
      quote_id: 'q1',
      quote_hash: 'h1',
      idempotency_key: 'idem-1',
    };
    const signal = new AbortController().signal;
    const result = await client.execute(99, body, signal);

    expect(post).toHaveBeenCalledWith('/finance/99/pay/execute', body, { signal });
    expect(result).toEqual(executePayload);
  });
});
