import type { Money } from '../money/money';
import { addMoney, clampMoney, money, mulMoney, subMoney, sumMoney } from '../money/money';

export interface CartLineInput {
  listingUuid: string;
  unitPriceMinor: number;
  quantity: number;
  currency?: string;
  decimals?: number;
}

export interface CartTotals {
  subtotal: Money;
  discount: Money;
  total: Money;
  lineCount: number;
}

export interface CouponSpec {
  type?: 'percent' | 'percent_off' | 'fixed' | 'fixed_off';
  percent?: number;
  value?: number;
  amount?: number;
  amountMinor?: number;
  discountType?: string;
}

export function computeCartTotals(
  lines: CartLineInput[],
  discount?: Money,
): CartTotals {
  if (lines.length === 0) {
    const zero = money(0);
    return { subtotal: zero, discount: zero, total: zero, lineCount: 0 };
  }

  const currency = lines[0].currency ?? 'USDT';
  const decimals = lines[0].decimals ?? 2;
  const lineTotals = lines.map((line) =>
    mulMoney(money(line.unitPriceMinor, currency, decimals), line.quantity),
  );
  const subtotal = sumMoney(lineTotals);
  const disc = discount ?? money(0, currency, decimals);
  const total = clampMoney(subMoney(subtotal, disc));
  return {
    subtotal,
    discount: money(disc.amount, currency, decimals),
    total,
    lineCount: lines.reduce((n, l) => n + l.quantity, 0),
  };
}

export function applyCoupon(subtotal: Money, coupon?: CouponSpec | null): Money {
  if (!coupon) return money(0, subtotal.currency, subtotal.decimals);

  const couponType = String(coupon.type ?? coupon.discountType ?? 'fixed').toLowerCase();
  let discountMinor = 0;

  if (couponType === 'percent' || couponType === 'percent_off') {
    const pct = Number(coupon.percent ?? coupon.value ?? 0);
    discountMinor = Math.round(subtotal.amount * (pct / 100));
  } else if (couponType === 'fixed' || couponType === 'fixed_off') {
    discountMinor = Number(coupon.amountMinor ?? coupon.amount ?? coupon.value ?? 0);
  }

  discountMinor = Math.max(0, Math.min(Math.round(discountMinor), subtotal.amount));
  return money(discountMinor, subtotal.currency, subtotal.decimals);
}

/** Convenience: compute totals with coupon applied in one pass. */
export function computeCartTotalsWithCoupon(
  lines: CartLineInput[],
  coupon?: CouponSpec | null,
): CartTotals {
  const currency = lines[0]?.currency ?? 'USDT';
  const decimals = lines[0]?.decimals ?? 2;
  const lineTotals = lines.map((line) =>
    mulMoney(money(line.unitPriceMinor, currency, decimals), line.quantity),
  );
  const subtotal = lineTotals.length ? sumMoney(lineTotals) : money(0, currency, decimals);
  const discount = applyCoupon(subtotal, coupon);
  return computeCartTotals(lines, discount);
}
