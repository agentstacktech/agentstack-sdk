export const economyKeys = {
  balance: (projectId: number, accountKey: string, asset = 'AGNT') =>
    ['economy', 'balance', projectId, accountKey, asset] as const,
  batches: (projectId: number) => ['economy', 'batches', projectId] as const,
  accounts: (projectId: number) => ['economy', 'accounts', projectId] as const,
};

/** Legacy keys still invalidated during migration */
export const agentcoinKeys = {
  balance: (projectId: number, accountKey: string, asset = 'AGNT') =>
    ['agentcoin', 'balance', projectId, accountKey, asset] as const,
};
