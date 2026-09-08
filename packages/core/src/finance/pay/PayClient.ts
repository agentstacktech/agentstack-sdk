import type { HTTPClient } from '../../client/http-client';
import { unwrapApiData } from '../../client/unwrapApiData';
import type { PayExecuteRequest, PayExecuteResponse, PayQuoteRequest, PayQuoteResponse } from './types';

export class PayClient {
  constructor(private readonly http: HTTPClient) {}

  async quote(
    projectId: number,
    body: PayQuoteRequest,
    signal?: AbortSignal,
  ): Promise<PayQuoteResponse> {
    const res = await this.http.post<PayQuoteResponse>(
      `/finance/${projectId}/pay/quote`,
      body,
      { signal },
    );
    return unwrapApiData<PayQuoteResponse>(res);
  }

  async execute(
    projectId: number,
    body: PayExecuteRequest,
    signal?: AbortSignal,
  ): Promise<PayExecuteResponse> {
    const res = await this.http.post<PayExecuteResponse>(
      `/finance/${projectId}/pay/execute`,
      body,
      { signal },
    );
    return unwrapApiData<PayExecuteResponse>(res);
  }
}

export type { PayExecuteRequest, PayExecuteResponse, PayQuoteRequest, PayQuoteResponse, PaymentSourceRef, PayIntentKind, PaymentSourceKind } from './types';
