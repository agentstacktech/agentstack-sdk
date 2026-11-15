/** LLM prepaid energy (builder_energy) — genetic tag: sdk.energy.gen1 */

/** Partner / Free.ai catalog row (parity with MCP ai.providers.list items). */
export interface PartnerLlmProviderItem {
  id: string;
  display_name?: string;
  debit_energy?: boolean;
  /** Free.ai fulfills COGS — users still spend builder_energy when true. */
  platform_supply?: boolean;
  free_call?: boolean;
  protocol?: string;
  enabled?: boolean;
  key_present?: boolean;
}

export interface LlmFreeCallsPolicy {
  enabled?: boolean;
  prefer?: boolean;
  mode?: string;
  energy_threshold?: number;
  provider_ids?: string[] | null;
}

export interface LlmProvidersCatalog {
  providers: string[];
  items: PartnerLlmProviderItem[];
  free_calls?: LlmFreeCallsPolicy;
}

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
