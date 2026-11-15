/** Peek-only builder_energy gate (parity with SPA `useRunEnergyGate`). */

import type { EnergyBalance } from './types';

/**
 * Spendable balance for enqueue peek is `current` (−1 = unlimited).
 * `daily_pool` is tier metadata — not subtracted here (server SoT on debit).
 */
export function builderEnergyMeetsMinimum(
  balance: Pick<EnergyBalance, 'current'>,
  required: number,
): boolean {
  const need = Math.max(0, Number(required) || 0);
  if (need <= 0) return true;
  const current = Number(balance.current ?? 0);
  if (current === -1) return true;
  return current >= need;
}
