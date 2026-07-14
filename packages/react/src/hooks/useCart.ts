import { useSDKInstance } from '../context/SDKContext';
import { commerceKeys } from '../commerce/commerceQueryKeys';
import { useSDKMutation } from './useSDKMutation';
import { useSDKQuery, type SDKQueryOptions } from './useSDKQuery';

export type AddCartLineVariables = { listingUuid: string; quantity?: number };
export type RemoveCartLineVariables = { lineId: string };
export type MergeGuestLinesVariables = {
  lines: Array<{ listing_uuid: string; quantity: number }>;
};

export function useCart(options?: SDKQueryOptions<unknown>) {
  const sdk = useSDKInstance();

  const query = useSDKQuery(
    sdk,
    commerceKeys.cart(),
    () => sdk.commerce.cart.getCart(),
    { staleTime: 15_000, ...options },
  );

  const addLine = useSDKMutation<unknown, AddCartLineVariables>(
    sdk,
    'commerce.cart.addLine',
    (vars) => sdk.commerce.cart.addLine(vars.listingUuid, vars.quantity ?? 1),
  );

  const removeLine = useSDKMutation<unknown, RemoveCartLineVariables>(
    sdk,
    'commerce.cart.removeLine',
    (vars) => sdk.commerce.cart.removeLine(vars.lineId),
  );

  const mergeGuestLines = useSDKMutation<unknown, MergeGuestLinesVariables>(
    sdk,
    'commerce.cart.mergeGuestLines',
    (vars) => sdk.commerce.cart.mergeGuestLines(vars.lines),
  );

  return { ...query, addLine, removeLine, mergeGuestLines };
}
