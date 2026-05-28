/**
 * @agentstack/hooks - useWalletData
 * AI-First Design: Self-documenting hook for multi-currency wallets
 * 
 * 🤖 AI QUICK START:
 * ```typescript
 * const { data, isLoading } = useWalletData();
 * ```
 */

import { UseQueryResult } from '@tanstack/react-query';
import type { AgentStackSDK } from '@agentstack/sdk';
import { useSDKQuery } from '@agentstack/react';
import type { Wallet, WalletFilters, BaseHookOptions } from './types';

/**
 * Hook options for wallet data
 */
export interface UseWalletDataOptions extends BaseHookOptions {
  filters?: WalletFilters;
  user_id?: number;
}

/**
 * Hook result
 */
export interface UseWalletDataResult extends Omit<UseQueryResult<Wallet[], Error>, 'data'> {
  data: Wallet[];
  filters: WalletFilters;
}

/**
 * useWalletData Hook
 * 
 * Fetches multi-currency wallets.
 * Supports virtual currencies (game tokens) and real money (AgentPay).
 * 
 * @param options - Hook options including filters
 * @returns Wallets array with balances
 * 
 * @example
 * ```typescript
 * // All wallets:
 * const { data } = useWalletData();
 * 
 * // Filter by type:
 * const { data } = useWalletData({
 *   filters: { type: 'game' }
 * });
 * 
 * // Display balances:
 * return (
 *   <div>
 *     {data.map(wallet => (
 *       <WalletCard key={wallet.id}>
 *         <h3>{wallet.name}</h3>
 *         {Object.entries(wallet.balances).map(([currency, balance]) => (
 *           <div key={currency}>
 *             {currency}: {balance.available}
 *           </div>
 *         ))}
 *       </WalletCard>
 *     ))}
 *   </div>
 * );
 * ```
 * 
 * AI: Multi-currency support built-in!
 * USD, EUR, GAME_GOLD - all in one wallet!
 */
export function useWalletData(
  sdk: AgentStackSDK,
  options: UseWalletDataOptions = {}
): UseWalletDataResult {
  const {
    filters = {},
    user_id,
    refreshInterval = 30000,  // 30 seconds for wallets
    enabled = true,
    staleTime = 60000  // 1 minute
  } = options;

  const queryResult = useSDKQuery<Wallet[]>(
    sdk,
    ['wallets', user_id, filters],
    async (signal) => {
      try {
        const params: Record<string, string | number> = {};
        if (user_id != null) params.user_id = user_id;
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== '') params[key] = value as string | number;
        });
        const response = await sdk.httpClient.get('/wallets/', params, { signal });
        const data = response.data as {
          wallets?: Record<string, Wallet> | Wallet[];
          data?: Wallet[];
        };
        if (Array.isArray(data?.wallets)) {
          return data.wallets;
        }
        if (data?.wallets && typeof data.wallets === 'object') {
          return Object.values(data.wallets);
        }
        return data?.data || [];
      } catch {
        return [];
      }
    },
    {
      refetchInterval: refreshInterval,
      enabled,
      staleTime,
    }
  );
  
  return {
    ...queryResult,
    data: queryResult.data || [],
    filters
  };
}

/**
 * AI NOTES:
 * 
 * Wallets support:
 * - Multiple currencies per wallet
 * - Virtual currencies (GAME_GOLD, GAME_GEMS)
 * - Real money (USD, EUR via AgentPay)
 * - Custom project currencies
 * 
 * Each balance has:
 * - amount: Total amount
 * - available: Available for use
 * - locked: Locked (pending transactions)
 * 
 * Perfect for:
 * - Gaming projects (virtual currencies)
 * - E-commerce (real money)
 * - Multi-currency apps
 */

