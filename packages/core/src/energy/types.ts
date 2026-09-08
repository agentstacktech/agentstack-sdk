/** LLM prepaid energy (builder_energy) — genetic tag: sdk.energy.gen1 */

export type EnergyPackTier = 'small' | 'medium' | 'large';

export interface EnergyPackInfo {
  energy: number;
  price_usd: number;
}

export type EnergyPacksMap = Partial<Record<EnergyPackTier, EnergyPackInfo>>;

export interface EnergyBalanceDisplay {
  approx_tokens: number;
  approx_usd: number;
  approx_calls_remaining: number;
}

export interface EnergyBalance {
  current: number;
  daily_pool: number;
  purchased: number;
  total_used_today: number;
  reset_date?: string | null;
  owner?: { kind: 'user' | 'project'; id: number };
  display?: EnergyBalanceDisplay;
  conversion?: Record<string, unknown>;
}
