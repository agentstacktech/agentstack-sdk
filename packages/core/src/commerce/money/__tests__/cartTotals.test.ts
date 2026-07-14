import {
  applyCoupon,
  computeCartTotals,
  computeCartTotalsWithCoupon,
} from '../cartTotals';
import { money } from '../money';

describe('cartTotals', () => {
  const lines = [
    { listingUuid: 'a', unitPriceMinor: 1000, quantity: 2 },
    { listingUuid: 'b', unitPriceMinor: 500, quantity: 1 },
  ];

  it('computes subtotal and line count', () => {
    const totals = computeCartTotals(lines);
    expect(totals.subtotal.amount).toBe(2500);
    expect(totals.lineCount).toBe(3);
    expect(totals.total.amount).toBe(2500);
  });

  it('applies fixed discount', () => {
    const discount = money(300);
    const totals = computeCartTotals(lines, discount);
    expect(totals.discount.amount).toBe(300);
    expect(totals.total.amount).toBe(2200);
  });

  it('clamps total at zero', () => {
    const discount = money(9999);
    const totals = computeCartTotals(lines, discount);
    expect(totals.total.amount).toBe(0);
  });

  it('returns zeros for empty cart', () => {
    const totals = computeCartTotals([]);
    expect(totals.subtotal.amount).toBe(0);
    expect(totals.lineCount).toBe(0);
  });

  it('applyCoupon percent_off', () => {
    const subtotal = money(1000);
    const disc = applyCoupon(subtotal, { type: 'percent_off', percent: 10 });
    expect(disc.amount).toBe(100);
  });

  it('applyCoupon fixed_off caps at subtotal', () => {
    const subtotal = money(500);
    const disc = applyCoupon(subtotal, { type: 'fixed_off', amountMinor: 999 });
    expect(disc.amount).toBe(500);
  });

  it('computeCartTotalsWithCoupon integrates coupon', () => {
    const totals = computeCartTotalsWithCoupon(lines, { type: 'percent', percent: 20 });
    expect(totals.discount.amount).toBe(500);
    expect(totals.total.amount).toBe(2000);
  });
});
