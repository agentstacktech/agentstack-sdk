import type { HTTPClient } from '../../client/http-client';
import {
  computeCartTotalsWithCoupon,
  type CartTotals,
  type CouponSpec,
} from '../money/cartTotals';
import { moneyFromMajor, mulMoney, type Money } from '../money/money';
import { CartClient } from './CartClient';
import {
  createCartStorage,
  type CartStorageStrategy,
  GuestCartStorageStrategy,
  ServerCartStorageStrategy,
} from './cartStorage';
import type { GuestCartLine } from './guestCartStorage';
import { readGuestCart, writeGuestCart } from './guestCartStorage';

export type CartMode = 'guest' | 'server';

export type RawCartLine = {
  id?: string;
  listing_uuid: string;
  quantity: number;
  unit_price_usdt?: string | number | null;
  stale?: boolean;
  added_at?: string;
};

export type CartLineView = {
  id?: string;
  listingUuid: string;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
  stale?: boolean;
};

export type CartView = {
  lines: CartLineView[];
  totals: CartTotals;
  hasStale: boolean;
  mode: CartMode;
  updatedAt?: string;
};

function parseUnitPrice(raw: string | number | null | undefined): Money {
  const major = Number(String(raw ?? '0'));
  return moneyFromMajor(Number.isFinite(major) ? major : 0, 'USDT', 2);
}

function mapRawLines(lines: RawCartLine[]): CartLineView[] {
  return lines.map((line) => {
    const unitPrice = parseUnitPrice(line.unit_price_usdt);
    return {
      id: line.id,
      listingUuid: line.listing_uuid,
      quantity: Math.max(1, Number(line.quantity) || 1),
      unitPrice,
      lineTotal: mulMoney(unitPrice, Math.max(1, Number(line.quantity) || 1)),
      stale: Boolean(line.stale),
    };
  });
}

function buildTotals(lines: CartLineView[], coupon?: CouponSpec | null): CartTotals {
  const inputs = lines.map((l) => ({
    listingUuid: l.listingUuid,
    unitPriceMinor: l.unitPrice.amount,
    quantity: l.quantity,
    currency: l.unitPrice.currency,
    decimals: l.unitPrice.decimals,
  }));
  return computeCartTotalsWithCoupon(inputs, coupon);
}

/** Unified cart facade — guest/server storage via DIP + Money totals view model. */
export class CartFacade {
  private readonly client: CartClient;
  private readonly storage: CartStorageStrategy;

  constructor(
    private readonly http: HTTPClient,
    readonly mode: CartMode = 'server',
    storage?: CartStorageStrategy,
  ) {
    this.client = new CartClient(http);
    this.storage =
      storage ?? createCartStorage(mode, this.client);
  }

  get cartClient(): CartClient {
    return this.client;
  }

  /** View model with Fowler Money totals; optional coupon applied in one pass. */
  async getCartView(coupon?: CouponSpec | null): Promise<CartView> {
    if (this.mode === 'guest') {
      const guestLines = readGuestCart();
      const raw: RawCartLine[] = guestLines.map((l) => ({
        listing_uuid: l.listing_uuid,
        quantity: l.quantity,
      }));
      const lines = mapRawLines(raw);
      return {
        lines,
        totals: buildTotals(lines, coupon),
        hasStale: false,
        mode: 'guest',
      };
    }

    const res = await this.client.getCart();
    const cart = (res.cart ?? res) as {
      lines?: RawCartLine[];
      has_stale?: boolean;
      updated_at?: string;
    };
    const rawLines = Array.isArray(cart.lines) ? cart.lines : [];
    const lines = mapRawLines(rawLines);
    return {
      lines,
      totals: buildTotals(lines, coupon),
      hasStale: Boolean(cart.has_stale) || lines.some((l) => l.stale),
      mode: 'server',
      updatedAt: cart.updated_at,
    };
  }

  async addLine(listingUuid: string, quantity = 1): Promise<CartView | unknown> {
    if (this.mode === 'guest') {
      const lines = readGuestCart();
      const existing = lines.find((l) => l.listing_uuid === listingUuid);
      if (existing) {
        existing.quantity = Math.max(1, existing.quantity + quantity);
      } else {
        lines.push({ listing_uuid: listingUuid, quantity: Math.max(1, quantity) });
      }
      writeGuestCart(lines);
      return this.getCartView();
    }
    await this.client.addLine(listingUuid, quantity);
    return this.getCartView();
  }

  async removeLine(lineId: string): Promise<CartView | unknown> {
    if (this.mode === 'guest') {
      const lines = readGuestCart().filter((l) => l.listing_uuid !== lineId);
      writeGuestCart(lines);
      return this.getCartView();
    }
    await this.client.removeLine(lineId);
    return this.getCartView();
  }

  async setLineQuantity(lineId: string, quantity: number): Promise<CartView | unknown> {
    const qty = Math.max(1, Math.min(999, quantity));
    if (this.mode === 'guest') {
      const lines = readGuestCart();
      const idx = lines.findIndex((l) => l.listing_uuid === lineId);
      if (idx >= 0) {
        lines[idx] = { ...lines[idx], quantity: qty };
        writeGuestCart(lines);
      }
      return this.getCartView();
    }
    await this.client.setLineQuantity(lineId, qty);
    return this.getCartView();
  }

  async mergeGuestLines(
    lines?: GuestCartLine[],
    idempotencyKey?: string,
  ): Promise<CartView | unknown> {
    const merged = lines ?? this.storage.readGuestLines();
    if (this.mode === 'guest') {
      writeGuestCart(merged);
      return this.getCartView();
    }
    await this.client.mergeGuestLines(merged, undefined, idempotencyKey);
    this.storage.clearGuest();
    return this.getCartView();
  }

  async checkout(rail = 'wallet_internal', idempotencyKey?: string) {
    if (this.mode === 'guest') {
      throw new Error('guest_checkout_requires_merge');
    }
    return this.client.checkout(rail, idempotencyKey);
  }

  async applyCoupon(coupon: CouponSpec | null): Promise<CartView> {
    if (this.mode === 'guest') {
      return this.getCartView(coupon);
    }
    await this.client.applyCoupon(
      coupon as Record<string, unknown> | null,
      typeof coupon === 'object' && coupon && 'code' in coupon
        ? String((coupon as { code?: string }).code ?? '')
        : undefined,
    );
    return this.getCartView(coupon);
  }
}

export { GuestCartStorageStrategy, ServerCartStorageStrategy };
