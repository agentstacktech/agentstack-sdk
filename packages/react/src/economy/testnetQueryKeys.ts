export const testnetKeys = {
  profiles: () => ['admin', 'agentnet', 'testnet', 'profiles'] as const,
  scenarioRun: (runId: string) => ['admin', 'agentnet', 'testnet', 'run', runId] as const,
  chainSurfaceAdmin: () => ['admin', 'agentnet', 'chain-surface'] as const,
  chainSurfaceProject: () => ['economy', 'chain-surface'] as const,
  publicGrantsSnapshot: () => ['public', 'grants', 'evidence-snapshot'] as const,
  chainSurfacePublic: () => ['public', 'grants', 'chain-surface'] as const,
};
