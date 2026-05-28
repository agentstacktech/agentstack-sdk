import { CommerceError, type CommerceErrorCode } from '../checkout/CommerceError';

const STATUS_TO_CODE: Record<number, CommerceErrorCode> = {
  400: 'CHECKOUT_FAILED',
  402: 'INSUFFICIENT_BALANCE',
  404: 'SESSION_NOT_FOUND',
  409: 'CHECKOUT_FAILED',
};

export function mapCommerceHttpError(
  status: number,
  body?: { error?: string; detail?: string },
): CommerceError {
  const detail = String(body?.error ?? body?.detail ?? '').toLowerCase();
  let code: CommerceErrorCode = STATUS_TO_CODE[status] ?? 'CHECKOUT_FAILED';
  if (detail.includes('cart_empty')) code = 'CART_EMPTY';
  if (detail.includes('insufficient') || detail.includes('balance')) {
    code = 'INSUFFICIENT_BALANCE';
  }
  if (detail.includes('listing_not_active') || detail.includes('stale')) {
    code = 'PRICE_CHANGED';
  }
  if (detail.includes('slice')) code = 'SLICE_MISSING';
  if (status === 404 && detail.includes('listing')) code = 'MERCHANT_LISTING_NOT_FOUND';
  if (detail.includes('sync') && status >= 400) code = 'MERCHANT_SYNC_FAILED';
  if (detail.includes('guidance') || detail.includes('grant_failed')) {
    code = 'GUIDANCE_UNAVAILABLE';
  }
  return new CommerceError(code, body?.error ?? body?.detail ?? `HTTP ${status}`);
}
