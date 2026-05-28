import type { HTTPClient } from '../../client/http-client';
import { SwapPairsResponseSchema, type SwapPair } from '../schemas/swapPairs';
import { unwrapApiData } from '../unwrapApiData';

export type SwapQuotePayload = {
  quote_id: string;
  quote_hash: string;
  exchange: Record<string, unknown>;
  expires_at?: string;
};

export class SwapSession {
  constructor(
    private readonly http: HTTPClient,
    private readonly projectId: number,
  ) {}

  async getPairs(): Promise<SwapPair[]> {
    const res = await this.http.get<{ pairs: SwapPair[] }>(
      `/api/finance/${this.projectId}/swap/pairs`,
    );
    const data = SwapPairsResponseSchema.parse(unwrapApiData(res));
    return data.pairs;
  }

  async quote(
    fromCurrency: string,
    toCurrency: string,
    amount: number,
  ): Promise<SwapQuotePayload> {
    const res = await this.http.post<SwapQuotePayload>(
      `/api/finance/${this.projectId}/swap/quote`,
      {
        from_currency: fromCurrency,
        to_currency: toCurrency,
        amount,
      },
    );
    const payload = unwrapApiData(res);
    return {
      ...payload,
      expires_at:
        typeof payload.exchange === 'object' &&
        payload.exchange &&
        'valid_until' in payload.exchange
          ? String((payload.exchange as { valid_until?: string }).valid_until ?? '')
          : undefined,
    };
  }

  async execute(quoteId: string, quoteHash: string): Promise<Record<string, unknown>> {
    const res = await this.http.post<Record<string, unknown>>(
      `/api/finance/${this.projectId}/swap/execute`,
      {
        quote_id: quoteId,
        quote_hash: quoteHash,
      },
    );
    return unwrapApiData(res);
  }
}
