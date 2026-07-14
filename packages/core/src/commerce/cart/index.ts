import type { HTTPClient } from '../../client/http-client';
import { CartClient } from './CartClient';
import {
  clearGuestCart,
  clearGuestCoupon,
  readGuestCart,
  readGuestCoupon,
  writeGuestCart,
  writeGuestCoupon,
  type GuestCartLine,
} from './guestCartStorage';

export {
  CartClient,
  readGuestCart,
  writeGuestCart,
  readGuestCoupon,
  writeGuestCoupon,
  clearGuestCoupon,
  clearGuestCart,
  type GuestCartLine,
};
export {
  CartFacade,
  type CartView,
  type CartLineView,
  type CartMode,
  type RawCartLine,
  GuestCartStorageStrategy,
  ServerCartStorageStrategy,
} from './CartFacade';
export {
  createCartStorage,
  type CartStorageStrategy,
} from './cartStorage';

export async function mergeGuestCart(client: HTTPClient, lines?: GuestCartLine[]) {
  const cart = new CartClient(client);
  const merged = lines ?? readGuestCart();
  const res = await cart.mergeGuestLines(merged);
  clearGuestCart();
  return res;
}
