import type { GuestCartLine } from './guestCartStorage';
import {
  clearGuestCart,
  readGuestCart,
  writeGuestCart,
} from './guestCartStorage';
import type { CartClient } from './CartClient';

/** DIP — cart persistence strategy (guest localStorage vs authenticated server slice). */
export interface CartStorageStrategy {
  readGuestLines(): GuestCartLine[];
  writeGuestLines(lines: GuestCartLine[]): void;
  clearGuest(): void;
}

export class GuestCartStorageStrategy implements CartStorageStrategy {
  readGuestLines(): GuestCartLine[] {
    return readGuestCart();
  }

  writeGuestLines(lines: GuestCartLine[]): void {
    writeGuestCart(lines);
  }

  clearGuest(): void {
    clearGuestCart();
  }
}

export class ServerCartStorageStrategy implements CartStorageStrategy {
  constructor(private readonly cart: CartClient) {}

  readGuestLines(): GuestCartLine[] {
    return [];
  }

  writeGuestLines(_lines: GuestCartLine[]): void {
    /* server cart is mutated via CartClient API */
  }

  clearGuest(): void {
    /* no-op — server cart cleared via API when needed */
  }

  get cartClient(): CartClient {
    return this.cart;
  }
}

export function createCartStorage(
  mode: 'guest' | 'server',
  cart: CartClient,
): CartStorageStrategy {
  return mode === 'guest' ? new GuestCartStorageStrategy() : new ServerCartStorageStrategy(cart);
}
