/**
 * AgentNet network + asset identifiers (TS mirror of Python shared.economy).
 *
 * Gene: `core.economy.agentnet.gen1`
 */

export const AGENTNET_NETWORK = {
  id: 'agentnet',
  displayName: 'AgentNet',
} as const;

export const AGENTNET_NATIVE = {
  code: 'AGNT',
  prefix: 'agnt',
  label: 'AGNT',
  decimals: 18,
} as const;

export const AGENTNET_STABLE = {
  code: 'AGUSD',
  prefix: 'agusd',
  label: 'agUSD',
  decimals: 18,
  vaultStandard: 'erc4626' as const,
  underlyingSymbol: 'USDT',
  underlyingDecimals: 6,
} as const;
