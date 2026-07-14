/**
 * Block explorer URLs for AgentNet / common EVM chains.
 * Gene: `core.economy.agentnet.gen1` · testnet plane: `core.economy.agentnet.testnet_plane.gen1`
 */

const EXPLORERS: Record<number, { base: string }> = {
  1: { base: 'https://etherscan.io' },
  97: { base: 'https://testnet.bscscan.com' },
  8453: { base: 'https://basescan.org' },
  84532: { base: 'https://sepolia.basescan.org' },
  421614: { base: 'https://sepolia.arbiscan.io' },
  11155111: { base: 'https://sepolia.etherscan.io' },
  424432: { base: 'https://explorer.testnet.agentnet.example' },
};

/** CAIP-2 → numeric chain id for explorer helpers. */
const CAIP2_CHAIN_ID: Record<string, number> = {
  'eip155:1': 1,
  'eip155:97': 97,
  'eip155:8453': 8453,
  'eip155:84532': 84532,
  'eip155:421614': 421614,
  'eip155:11155111': 11155111,
  'eip155:424432': 424432,
};

export type ExplorerLinkKind = 'address' | 'tx';

/**
 * Build explorer URL for address or transaction hash.
 * Returns null when chain is unknown or value empty.
 */
export function buildExplorerUrl(
  chainId: number,
  kind: ExplorerLinkKind,
  value: string,
): string | null {
  const meta = EXPLORERS[chainId];
  if (!meta || !value?.trim()) return null;
  const path = kind === 'tx' ? 'tx' : 'address';
  return `${meta.base}/${path}/${value.trim()}`;
}

/** Alias for transaction links (grant reviewer cards). */
export function buildExplorerTxUrl(
  chainId: number,
  txHash: string,
): string | null {
  return buildExplorerUrl(chainId, 'tx', txHash);
}

/** Resolve CAIP-2 (e.g. `eip155:84532`) then build explorer URL. */
export function buildExplorerUrlFromCaip2(
  caip2: string,
  kind: ExplorerLinkKind,
  value: string,
): string | null {
  const chainId = CAIP2_CHAIN_ID[caip2.trim()];
  if (chainId == null) return null;
  return buildExplorerUrl(chainId, kind, value);
}

/** Grant testnet plane primary chains (Base Sepolia, BSC, Arbitrum Sepolia). */
export const AGENTNET_TESTNET_EXPLORER_CHAIN_IDS = [84532, 97, 421614] as const;
