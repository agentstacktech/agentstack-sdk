/** Shared HTTP options for AgentNet economy reads/writes (no GET batching). */
export const ECONOMY_READ = { skipBatching: true } as const;

export const ECONOMY_WRITE = { skipBatching: true } as const;
