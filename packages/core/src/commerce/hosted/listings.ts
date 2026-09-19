/**
 * Hosted storefront listings loader — uses offer row SoT (SPA + hosted-storefront parity).
 * Gene: sdk.commerce.hosted.gen1 · sdk.commerce.shop.gen1
 */
import { resolveOfferRowFields, type OfferRowInput } from '../shop/offerRow';

export type HostedListingCard = {
  uuid: string;
  title: string;
  priceUsdt: string;
  description?: string;
  imageUrl?: string;
  rarity?: string;
};

export function mapHostedListingRow(row: Record<string, unknown>): HostedListingCard {
  const fields = resolveOfferRowFields(row as OfferRowInput);
  return {
    uuid: fields.uuid,
    title: fields.title,
    priceUsdt: fields.priceUsdt,
    description: fields.description,
    imageUrl: fields.imageUrl,
    rarity: fields.rarity,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export type LoadHostedListingsParams = {
  projectId: number;
  limit?: number;
  sort?: 'recent' | 'price_asc' | 'price_desc' | 'recommended';
  fetchFn?: typeof fetch;
  headers: Record<string, string>;
};

/** Fetch project-scoped listings with warming retries (hosted static + vitrine). */
export async function loadHostedListings(
  params: LoadHostedListingsParams,
): Promise<HostedListingCard[]> {
  const fetchFn = params.fetchFn ?? fetch;
  const limit = params.limit ?? 24;
  const url =
    `/api/commerce/storefront/listings?scope=project&project_id=${encodeURIComponent(String(params.projectId))}` +
    `&limit=${limit}&sort=${params.sort ?? 'recent'}`;
  const attempts = 4;
  let lastErr: Error | null = null;
  for (let i = 0; i < attempts; i++) {
    if (i > 0) await sleep(700 * i);
    try {
      const res = await fetchFn(url, {
        credentials: 'include',
        headers: params.headers,
      });
      if (!res.ok) {
        lastErr = new Error(`listings_http_${res.status}`);
        continue;
      }
      const data = (await res.json()) as Record<string, unknown>;
      if (
        data?.code === 'storefront_warming' ||
        data?.code === 'upstream_unavailable' ||
        data?.status === 'unavailable'
      ) {
        lastErr = new Error('listings_warming');
        continue;
      }
      const rows = Array.isArray(data.listings) ? data.listings : [];
      const mapped = rows
        .map((r) => mapHostedListingRow(r as Record<string, unknown>))
        .filter((row) => Boolean(row.uuid));
      if (!mapped.length && i < attempts - 1) continue;
      return mapped;
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw lastErr || new Error('listings_unavailable');
}
