/**
 * Economy crypto mode — client hook from platform feature slice.
 * Genetic tag: sdk.economy.gen1
 */

import { useMemo } from 'react';

export type EconomyCryptoMode = 'full' | 'off';

export interface EconomyCryptoFeatureSlice {
  features?: {
    economy_crypto?: {
      mode?: EconomyCryptoMode | string;
    };
  };
}

export function isEconomyCryptoEnabledFromSlice(
  slice: EconomyCryptoFeatureSlice | null | undefined,
): boolean {
  const mode = (slice?.features?.economy_crypto?.mode ?? 'off').toString().trim().toLowerCase();
  return mode === 'full';
}

/** Pass feature slice from app auth or platform feature-availability query. */
export function useEconomyCryptoEnabled(
  slice: EconomyCryptoFeatureSlice | null | undefined,
): boolean {
  return useMemo(() => isEconomyCryptoEnabledFromSlice(slice), [slice]);
}
