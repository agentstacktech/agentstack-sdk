import {
  useMutation,
  type UseMutationResult,
  type UseMutationOptions,
} from '@tanstack/react-query';
import type { AgentStackSDK } from '@agentstack/sdk';

/**
 * TanStack mutation options minus keys / fn (we own those for SDK telemetry).
 * Enables optimistic updates (`onMutate`), rollbacks (`onError`), etc.
 */
export type SDKMutationOptions<TData, TVariables> = Omit<
  UseMutationOptions<TData, Error, TVariables>,
  'mutationFn' | 'mutationKey'
>;

/**
 * Mutation wrapper with optional `sdk.emit` lifecycle events.
 * Spreads TanStack options so `onMutate` / `onSettled` / `retry` work like `useMutation`.
 */
export function useSDKMutation<TData = unknown, TVariables = unknown>(
  sdk: AgentStackSDK,
  key: string,
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: SDKMutationOptions<TData, TVariables>
): UseMutationResult<TData, Error, TVariables> {
  const { onSuccess, onError, ...rest } = options ?? {};
  return useMutation<TData, Error, TVariables>({
    mutationKey: [key],
    ...rest,
    mutationFn: async (variables: TVariables) => {
      sdk.emit?.('mutation:start', key, variables);
      try {
        const result = await mutationFn(variables);
        sdk.emit?.('mutation:success', key, result);
        return result;
      } catch (error) {
        sdk.emit?.('mutation:error', key, error);
        throw error;
      }
    },
    onSuccess: (data, variables, onMutateResult, context) => {
      onSuccess?.(data, variables, onMutateResult, context);
    },
    onError: (error, variables, onMutateResult, context) => {
      onError?.(error, variables, onMutateResult, context);
    },
  });
}
