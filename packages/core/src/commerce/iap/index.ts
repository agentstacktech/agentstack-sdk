/**
 * Hosted in-app purchase helpers (shop IAP plane).
 * Gene: sdk.commerce.iap.gen1
 */

export type IapEnablement = {
  sell_enabled: boolean;
  catalog_configured: boolean;
  active_sku_count?: number;
  sandbox_ok?: boolean;
  blockers?: string[];
  cache_ttl_sec?: number;
};

export type IapProduct = {
  sku_id: string;
  title: string;
  status?: string;
  eligible?: boolean;
  price?: { currency: string; amount_minor: number; tax_inclusive?: boolean };
};

export type IapAuthOptions = {
  /** Return player Bearer (e.g. after anonymous/provision). */
  getBearerToken?: () => string | null | undefined;
};

export type IapErrorCode =
  | 'payment_id_in_use'
  | 'sku_changed'
  | 'return_url_invalid'
  | 'rate_limit_exceeded'
  | 'sell_disabled'
  | 'auth_required'
  | 'payment_create_failed'
  | 'psp_session_missing'
  | 'currency_not_supported'
  | 'idempotency_mismatch'
  | string;

export type IapCheckoutErrorBody = {
  error?: IapErrorCode;
  order_id?: string;
  bound_order_id?: string | null;
  payment_id?: string;
  retry_after?: number;
};

export class IapHttpError extends Error {
  readonly status: number;
  readonly code: IapErrorCode;
  readonly body: IapCheckoutErrorBody;

  constructor(status: number, body: IapCheckoutErrorBody) {
    const code = String(body.error ?? body);
    super(code);
    this.name = 'IapHttpError';
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

export function isPaymentIdInUse(err: unknown): boolean {
  if (err instanceof IapHttpError) return err.code === 'payment_id_in_use';
  return String(err).includes('payment_id_in_use');
}

/** Align with server checkout replay policy after terminal checkout failures. */
export function requiresNewIdempotencyKey(code: string): boolean {
  const c = String(code || '').toLowerCase();
  return (
    c === 'payment_create_failed' ||
    c === 'psp_session_missing' ||
    c === 'idempotency_mismatch' ||
    c === 'sku_changed' ||
    c === 'currency_not_supported'
  );
}

function iapAuthHeaders(opts?: IapAuthOptions): HeadersInit {
  const token = opts?.getBearerToken?.();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

/** Hosted /s/{pid}/ visitor sell gate (cookie session; no owner RBAC).
 *  Prefer {@link bootstrapHostedIapStorefront} on cold boot — call after {@link listIapProducts}
 *  so the server can reuse the 12s enablement cache primed by GET /products. */
export async function getIapEnablement(
  projectId: number,
  opts?: { fetchFn?: typeof fetch; auth?: IapAuthOptions },
): Promise<IapEnablement> {
  const fetchFn = opts?.fetchFn ?? fetch;
  const q = new URLSearchParams({ project_id: String(projectId) });
  const res = await fetchFn(`/api/commerce/iap/enablement?${q}`, {
    credentials: 'include',
    headers: iapAuthHeaders(opts?.auth),
  });
  const data = (await res.json()) as IapEnablement & { detail?: string };
  if (!res.ok) {
    throw new Error(String(data.detail ?? res.status));
  }
  return data;
}

/** Studio / merchant panel — project read permission required. */
export async function getIapOwnerEnablement(
  projectId: number,
  opts?: { fetchFn?: typeof fetch; auth?: IapAuthOptions },
): Promise<IapEnablement> {
  const fetchFn = opts?.fetchFn ?? fetch;
  const q = new URLSearchParams({ project_id: String(projectId) });
  const res = await fetchFn(`/api/commerce/iap/owner/enablement?${q}`, {
    credentials: 'include',
    headers: iapAuthHeaders(opts?.auth),
  });
  const data = (await res.json()) as IapEnablement & { detail?: string };
  if (!res.ok) {
    throw new Error(String(data.detail ?? res.status));
  }
  return data;
}

export async function listIapProducts(
  projectId: number,
  opts?: {
    locale?: string;
    currency?: string;
    fetchFn?: typeof fetch;
    auth?: IapAuthOptions;
  },
): Promise<IapProduct[]> {
  const fetchFn = opts?.fetchFn ?? fetch;
  const q = new URLSearchParams({
    project_id: String(projectId),
    locale: opts?.locale ?? 'en',
  });
  if (opts?.currency) q.set('currency', opts.currency);
  const res = await fetchFn(`/api/commerce/iap/products?${q}`, {
    credentials: 'include',
    headers: iapAuthHeaders(opts?.auth),
  });
  const data = (await res.json()) as { products?: IapProduct[] };
  return data.products ?? [];
}

/**
 * Hosted storefront cold boot: list SKUs first (primes server enablement cache), then read sell gate.
 * Gene: sdk.commerce.iap.gen1 — mirrors REST BFF ordering in IAP_ORDER_STATE_MACHINE.md.
 */
export async function bootstrapHostedIapStorefront(
  projectId: number,
  opts?: {
    locale?: string;
    currency?: string;
    fetchFn?: typeof fetch;
    auth?: IapAuthOptions;
  },
): Promise<{ products: IapProduct[]; enablement: IapEnablement }> {
  const products = await listIapProducts(projectId, opts);
  const enablement = await getIapEnablement(projectId, opts);
  return { products, enablement };
}

export async function createIapCheckout(
  input: {
    projectId: number;
    skuId: string;
    idempotencyKey: string;
    returnUrl: string;
    currency?: string;
    paymentMethod?: string;
  },
  fetchFn: typeof fetch = fetch,
  auth?: IapAuthOptions,
): Promise<Record<string, unknown>> {
  const res = await fetchFn('/api/commerce/iap/checkout', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...iapAuthHeaders(auth),
    },
    body: JSON.stringify({
      project_id: input.projectId,
      sku_id: input.skuId,
      idempotency_key: input.idempotencyKey,
      return_url: input.returnUrl,
      currency: input.currency,
      payment_method: input.paymentMethod,
    }),
  });
  const data = (await res.json()) as Record<string, unknown> & {
    detail?: string | IapCheckoutErrorBody;
    error?: string;
  };
  if (!res.ok) {
    const detail = data.detail;
    const body: IapCheckoutErrorBody =
      detail && typeof detail === 'object'
        ? (detail as IapCheckoutErrorBody)
        : { error: String(detail ?? data.error ?? res.status) };
    throw new IapHttpError(res.status, body);
  }
  return data;
}

/** Player-visible copy when order is paid but grants are still retrying. */
export const IAP_GRANT_PENDING_COPY =
  'Payment received — currency grant is still processing. Retry fulfill or poll order status.';

export function isIapGrantPending(order: Record<string, unknown>): boolean {
  return String(order.status ?? order.order_status ?? '').toLowerCase() === 'grant_pending';
}

export async function pollIapOrder(
  orderId: string,
  fetchFn: typeof fetch = fetch,
  auth?: IapAuthOptions,
  projectId?: number,
): Promise<Record<string, unknown>> {
  const q =
    projectId != null && Number.isFinite(projectId)
      ? `?project_id=${projectId}`
      : '';
  const res = await fetchFn(`/api/commerce/iap/orders/${orderId}${q}`, {
    credentials: 'include',
    headers: iapAuthHeaders(auth),
  });
  const data = (await res.json()) as Record<string, unknown> & { detail?: string; error?: string };
  if (!res.ok) {
    const code = String(data.detail ?? data.error ?? res.status);
    throw new Error(code);
  }
  return data;
}

export async function cancelIapOrder(
  orderId: string,
  projectId: number,
  fetchFn: typeof fetch = fetch,
  auth?: IapAuthOptions,
): Promise<Record<string, unknown>> {
  const q = new URLSearchParams({ project_id: String(projectId) });
  const res = await fetchFn(`/api/commerce/iap/orders/${orderId}/cancel?${q}`, {
    method: 'POST',
    credentials: 'include',
    headers: iapAuthHeaders(auth),
  });
  const data = (await res.json()) as Record<string, unknown> & { detail?: string };
  if (!res.ok) {
    throw new Error(String(data.detail ?? res.status));
  }
  return data;
}

export type IapBalanceRow = { asset_id: string; amount: number };

export async function listIapPaymentMethods(
  projectId: number,
  opts?: { country?: string; currency?: string; fetchFn?: typeof fetch; auth?: IapAuthOptions },
): Promise<unknown[]> {
  const fetchFn = opts?.fetchFn ?? fetch;
  const q = new URLSearchParams({ project_id: String(projectId) });
  if (opts?.country) q.set('country', opts.country);
  if (opts?.currency) q.set('currency', opts.currency);
  const res = await fetchFn(`/api/commerce/iap/payment-methods?${q}`, {
    credentials: 'include',
    headers: iapAuthHeaders(opts?.auth),
  });
  const data = (await res.json()) as { methods?: unknown[] };
  return data.methods ?? [];
}

/** Player soft-currency balances (REST BFF — prefer over raw MCP). */
export async function getBalances(
  projectId: number,
  assetId?: string,
  fetchFn: typeof fetch = fetch,
  auth?: IapAuthOptions,
): Promise<IapBalanceRow[]> {
  const q = new URLSearchParams({ project_id: String(projectId) });
  if (assetId) q.set('asset_id', assetId);
  const res = await fetchFn(`/api/commerce/iap/balances?${q}`, {
    credentials: 'include',
    headers: iapAuthHeaders(auth),
  });
  const data = (await res.json()) as { balances?: IapBalanceRow[]; detail?: string };
  if (!res.ok) {
    throw new Error(String(data.detail ?? res.status));
  }
  return data.balances ?? [];
}

export async function spendAtIapSink(
  input: {
    projectId: number;
    sinkId: string;
    idempotencyKey: string;
  },
  fetchFn: typeof fetch = fetch,
  auth?: IapAuthOptions,
): Promise<Record<string, unknown>> {
  const res = await fetchFn('/api/commerce/iap/spend', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...iapAuthHeaders(auth),
    },
    body: JSON.stringify({
      project_id: input.projectId,
      sink_id: input.sinkId,
      idempotency_key: input.idempotencyKey,
    }),
  });
  const data = (await res.json()) as Record<string, unknown> & { detail?: string };
  if (!res.ok) {
    throw new Error(String(data.detail ?? res.status));
  }
  return data;
}

export async function listIapLedger(
  projectId: number,
  opts?: {
    assetId?: string;
    cursor?: string;
    limit?: number;
    fetchFn?: typeof fetch;
    auth?: IapAuthOptions;
  },
): Promise<Record<string, unknown>> {
  const fetchFn = opts?.fetchFn ?? fetch;
  const q = new URLSearchParams({ project_id: String(projectId) });
  if (opts?.assetId) q.set('asset_id', opts.assetId);
  if (opts?.cursor) q.set('cursor', opts.cursor);
  if (opts?.limit != null) q.set('limit', String(opts.limit));
  const res = await fetchFn(`/api/commerce/iap/ledger?${q}`, {
    credentials: 'include',
    headers: iapAuthHeaders(opts?.auth),
  });
  const data = (await res.json()) as Record<string, unknown> & { detail?: string };
  if (!res.ok) {
    throw new Error(String(data.detail ?? res.status));
  }
  return data;
}

const sleepMs = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Checkout with one retry on rate_limit or payment_id conflict (new idempotency key). */
export async function createIapCheckoutWithRetry(
  input: {
    projectId: number;
    skuId: string;
    idempotencyKey: string;
    returnUrl: string;
    currency?: string;
    paymentMethod?: string;
  },
  fetchFn: typeof fetch = fetch,
  auth?: IapAuthOptions,
): Promise<Record<string, unknown>> {
  try {
    return await createIapCheckout(input, fetchFn, auth);
  } catch (err) {
    if (err instanceof IapHttpError) {
      if (err.code === 'rate_limit_exceeded') {
        const waitSec = Number(err.body.retry_after ?? 1);
        await sleepMs(Math.max(1, waitSec) * 1000);
        return createIapCheckout(input, fetchFn, auth);
      }
      if (isPaymentIdInUse(err) && err.body.bound_order_id) {
        return pollIapOrder(String(err.body.bound_order_id), fetchFn, auth, input.projectId);
      }
      if (isPaymentIdInUse(err)) {
        const key = `${input.idempotencyKey}:retry:${Date.now()}`;
        return createIapCheckout({ ...input, idempotencyKey: key }, fetchFn, auth);
      }
    }
    throw err;
  }
}

export type IapCheckoutResume = {
  payment_id?: string;
  order_id?: string;
  client_secret?: string;
  payment_url?: string;
  checkout_url?: string;
  stripe_publishable_key?: string;
  terminal?: boolean;
  status?: string;
};

export async function fetchIapCheckoutResume(
  projectId: number,
  paymentId: string,
  fetchFn: typeof fetch = fetch,
  auth?: IapAuthOptions,
): Promise<IapCheckoutResume> {
  const q = new URLSearchParams({
    project_id: String(projectId),
    payment_id: paymentId,
  });
  const res = await fetchFn(`/api/commerce/iap/checkout/resume?${q}`, {
    credentials: 'include',
    headers: iapAuthHeaders(auth),
  });
  const data = (await res.json()) as IapCheckoutResume & { detail?: string };
  if (!res.ok) {
    throw new Error(String(data.detail ?? res.status));
  }
  return data;
}

export async function listIapEntitlements(
  projectId: number,
  fetchFn: typeof fetch = fetch,
  auth?: IapAuthOptions,
  opts?: { includeSandbox?: boolean },
): Promise<Record<string, unknown>[]> {
  const q = new URLSearchParams({ project_id: String(projectId) });
  if (opts?.includeSandbox === true) {
    q.set('include_sandbox', 'true');
  }
  const res = await fetchFn(`/api/commerce/iap/entitlements?${q}`, {
    credentials: 'include',
    headers: iapAuthHeaders(auth),
  });
  const data = (await res.json()) as { entitlements?: Record<string, unknown>[]; detail?: string };
  if (!res.ok) {
    throw new Error(String(data.detail ?? res.status));
  }
  return data.entitlements ?? [];
}

export async function pollIapOrderUntilTerminal(
  orderId: string,
  opts?: {
    projectId?: number;
    fetchFn?: typeof fetch;
    auth?: IapAuthOptions;
    timeoutMs?: number;
    intervalMs?: number;
  },
): Promise<Record<string, unknown>> {
  const fetchFn = opts?.fetchFn ?? fetch;
  const deadline = Date.now() + (opts?.timeoutMs ?? 120_000);
  const interval = opts?.intervalMs ?? 2000;
  let last: Record<string, unknown> = {};
  while (Date.now() < deadline) {
    last = await pollIapOrder(orderId, fetchFn, opts?.auth, opts?.projectId);
    const status = String(last.status ?? '').toLowerCase();
    if (status === 'fulfilled' || status === 'failed' || status === 'refunded') {
      return last;
    }
    if (!isIapGrantPending(last) && status === 'paid') {
      return last;
    }
    await sleepMs(interval);
  }
  return last;
}
