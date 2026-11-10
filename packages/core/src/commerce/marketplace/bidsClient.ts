import type { HTTPClient } from '../../client/http-client';

export interface PlaceAuctionBidParams {
  listingId: string;
  amount: number;
  currency?: string;
  expectedRevision?: number;
  idempotencyKey?: string;
}

export async function listAuctionBids(
  http: HTTPClient,
  listingId: string,
  query?: { limit?: number; offset?: number },
): Promise<{ bids: unknown[]; total: number }> {
  const params = new URLSearchParams();
  if (query?.limit != null) params.set('limit', String(query.limit));
  if (query?.offset != null) params.set('offset', String(query.offset));
  const qs = params.toString() ? `?${params}` : '';
  const response = await http.get<{ bids?: unknown[]; total?: number }>(
    `/api/marketplace/listings/${encodeURIComponent(listingId)}/bids${qs}`,
    { skipAuthStateCheck: true },
  );
  const data = response.data ?? response;
  return {
    bids: data.bids ?? [],
    total: data.total ?? (data.bids?.length ?? 0),
  };
}

export async function placeAuctionBid(
  http: HTTPClient,
  params: PlaceAuctionBidParams,
): Promise<unknown> {
  const headers: Record<string, string> = {};
  if (params.idempotencyKey) headers['Idempotency-Key'] = params.idempotencyKey;
  const response = await http.post<unknown>(
    `/api/marketplace/listings/${encodeURIComponent(params.listingId)}/bids`,
    {
      amount: params.amount,
      currency: params.currency ?? 'USD',
      expected_revision: params.expectedRevision,
    },
    { headers },
  );
  return response.data ?? response;
}
