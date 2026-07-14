import { CommerceError, type CommerceErrorCode } from '../checkout/CommerceError';

const STATUS_TO_CODE: Record<number, CommerceErrorCode> = {
  400: 'CHECKOUT_FAILED',
  402: 'INSUFFICIENT_BALANCE',
  404: 'SESSION_NOT_FOUND',
  409: 'CHECKOUT_FAILED',
};

const KNOWN_CODES = new Set<CommerceErrorCode>([
  'INSUFFICIENT_BALANCE',
  'LISTING_NOT_ACTIVE',
  'RAIL_UNAVAILABLE',
  'CHECKOUT_FAILED',
  'SESSION_NOT_FOUND',
  'CART_EMPTY',
  'PRICE_CHANGED',
  'SLICE_MISSING',
  'MERCHANT_LISTING_NOT_FOUND',
  'MERCHANT_SYNC_FAILED',
  'GUIDANCE_UNAVAILABLE',
]);

type CommerceErrorBody = {
  error?: string;
  detail?: string | { error_code?: string; message?: string };
  error_code?: string;
  message?: string;
  retryable?: boolean;
};

function bodyText(body?: CommerceErrorBody): string {
  if (!body) return '';
  if (typeof body.detail === 'object' && body.detail?.message) {
    return String(body.detail.message);
  }
  if (typeof body.detail === 'object' && body.detail?.error_code) {
    return String(body.detail.error_code);
  }
  return String(body.error ?? body.message ?? body.detail ?? '');
}

export function mapCommerceHttpError(
  status: number,
  body?: CommerceErrorBody,
): CommerceError {
  const structuredCode = String(
    body?.error_code ??
      (typeof body?.detail === 'object' ? body.detail?.error_code : '') ??
      '',
  ).toUpperCase() as CommerceErrorCode;
  const detail = bodyText(body).toLowerCase();
  let code: CommerceErrorCode = STATUS_TO_CODE[status] ?? 'CHECKOUT_FAILED';
  if (structuredCode && KNOWN_CODES.has(structuredCode)) {
    code = structuredCode;
  }
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
  const message = bodyText(body) || `HTTP ${status}`;
  return new CommerceError(code, message);
}
