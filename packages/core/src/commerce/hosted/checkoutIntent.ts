/**
 * Hosted checkout via commerce intents plane (all tenants + embeds).
 * Gene: sdk.commerce.hosted.gen1 · sdk.commerce.surfaces.gen1
 */

export const HOSTED_CHECKOUT_INTENT_KEY = 'commerce.checkout.intent';

export type HostedCheckoutIntent = {
  listing_uuid: string;
  return_url?: string;
  source?: string;
  surface_url?: string;
};

export function writeHostedCheckoutIntent(intent: HostedCheckoutIntent): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(HOSTED_CHECKOUT_INTENT_KEY, JSON.stringify(intent));
}

export type CreateHostedCheckoutIntentInput = {
  listingUuid: string;
  projectId: number;
  returnUrl?: string;
  source?: string;
  fetchFn?: typeof fetch;
  /** When false, caller handles navigation (embed / top-frame bridges). Default true. */
  navigate?: boolean;
};

export type CreateHostedCheckoutIntentResult = {
  ok: boolean;
  surface_url?: string;
  order_id?: string | null;
};

/** POST /api/commerce/intents — same plane as platform SPA + hosted-storefront. */
export async function createHostedCheckoutIntent(
  input: CreateHostedCheckoutIntentInput,
  headers: Record<string, string>,
): Promise<CreateHostedCheckoutIntentResult> {
  const fetchFn = input.fetchFn ?? fetch;
  const returnUrl =
    input.returnUrl ??
    (typeof window !== 'undefined'
      ? window.location.pathname + window.location.search + window.location.hash
      : '/');
  const res = await fetchFn('/api/commerce/intents', {
    method: 'POST',
    credentials: 'include',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      kind: 'checkout',
      listing_uuids: [input.listingUuid],
      listing_uuid: input.listingUuid,
      project_id: input.projectId,
      return_url: returnUrl,
      source: input.source ?? 'hosted-commerce',
    }),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err = new Error(String(data.detail ?? data.message ?? 'checkout_failed')) as Error & {
      code?: string;
    };
    if (res.status === 401 || res.status === 403) err.code = 'AUTH_REQUIRED';
    throw err;
  }
  const surfaceUrl = String(data.surface_url ?? '');
  writeHostedCheckoutIntent({
    listing_uuid: input.listingUuid,
    return_url: returnUrl,
    source: input.source ?? 'hosted-commerce',
    surface_url: surfaceUrl,
  });
  const shouldNavigate = input.navigate !== false;
  if (shouldNavigate && surfaceUrl && typeof window !== 'undefined') {
    window.location.assign(surfaceUrl);
  }
  const orderId = data.order_id != null ? String(data.order_id) : null;
  return { ok: true, surface_url: surfaceUrl, order_id: orderId };
}
