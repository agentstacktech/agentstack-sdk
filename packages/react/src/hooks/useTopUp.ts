import {
  commerceTopUpRecipe,
  type TopUpRecipeInput,
  type TopUpRecipeOptions,
  type TopUpRecipeResult,
} from '@agentstack/sdk/commerce/topup';
import { useSDKInstance } from '../context/SDKContext';
import { useSDKMutation } from './useSDKMutation';

export type TopUpVariables = TopUpRecipeInput & {
  recipeOptions?: TopUpRecipeOptions;
};

export function useTopUp() {
  const sdk = useSDKInstance();
  return useSDKMutation<TopUpRecipeResult, TopUpVariables>(
    sdk,
    'commerce.topUp',
    (vars) => {
      const { recipeOptions, ...input } = vars;
      return commerceTopUpRecipe(
        sdk.httpClient as unknown as Parameters<typeof commerceTopUpRecipe>[0],
        input,
        recipeOptions,
      );
    },
  );
}
