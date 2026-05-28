/**
 * Block explorer URLs for AgentNet / common EVM chains.
 * Gene: `core.economy.agentnet.gen1`
 */

const EXPLORERS: Record<number, { base: string }> = {
  1: { base: 'https://etherscan.io' },
  8453: { base: 'https://basescan.org' },
  84532: { base: 'https://sepolia.basescan.org' },
  11155111: { base: 'https://sepolia.etherscan.io' },
  424432: { base: 'https://explorer.testnet.agentnet.example' },
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
