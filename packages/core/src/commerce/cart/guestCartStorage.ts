const STORAGE_KEY = 'agentstack.commerce.guest_cart';
const COUPON_KEY = 'agentstack.commerce.guest_coupon';

export type GuestCartLine = {
  listing_uuid: string;
  quantity: number;
  variant?: Record<string, string>;
  unit_price_usdt?: string;
  title?: string;
};

export function readGuestCart(): GuestCartLine[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as GuestCartLine[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeGuestCart(lines: GuestCartLine[]): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
}

/** Promo code entered while browsing as guest (applied on merge after login). */
export function readGuestCoupon(): string | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(COUPON_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { code?: string };
    const code = String(parsed?.code ?? '').trim();
    return code || null;
  } catch {
    return null;
  }
}

export function writeGuestCoupon(code: string): void {
  if (typeof localStorage === 'undefined') return;
  const trimmed = code.trim();
  if (!trimmed) {
    localStorage.removeItem(COUPON_KEY);
    return;
  }
  localStorage.setItem(COUPON_KEY, JSON.stringify({ code: trimmed }));
}

export function clearGuestCoupon(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(COUPON_KEY);
}

export function clearGuestCart(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  clearGuestCoupon();
}
