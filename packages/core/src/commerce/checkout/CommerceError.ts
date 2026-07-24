export type CommerceErrorCode =
  | 'INSUFFICIENT_BALANCE'
  | 'LISTING_NOT_ACTIVE'
  | 'RAIL_UNAVAILABLE'
  | 'CHECKOUT_FAILED'
  | 'SESSION_NOT_FOUND'
  | 'CHECKOUT_SESSION_EXPIRED'
  | 'CART_EMPTY'
  | 'PRICE_CHANGED'
  | 'SLICE_MISSING'
  | 'MERCHANT_LISTING_NOT_FOUND'
  | 'MERCHANT_SYNC_FAILED'
  | 'GUIDANCE_UNAVAILABLE';

export class CommerceError extends Error {
  constructor(
    public readonly code: CommerceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'CommerceError';
  }
}
