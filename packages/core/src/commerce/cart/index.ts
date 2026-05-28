import type { HTTPClient } from '../../client/http-client';
import { CartClient } from './CartClient';
import {
  clearGuestCart,
  readGuestCart,
  writeGuestCart,
  type GuestCartLine,
} from './guestCartStorage';

export { CartClient, readGuestCart, writeGuestCart, clearGuestCart, type GuestCartLine };

export async function mergeGuestCart(client: HTTPClient, lines?: GuestCartLine[]) {
  const cart = new CartClient(client);
  const merged = lines ?? readGuestCart();
  const res = await cart.mergeGuestLines(merged);
  clearGuestCart();
  return res;
}
