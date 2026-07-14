/**
 * OpenAPI-derived admin AgentNet paths (regenerate via `python scripts/export-openapi-admin-agentnet.py`).
 *
 * Gene: `core.economy.agentnet.gen1`
 */
export const ADMIN_AGENTNET_OPENAPI_PATHS = {
  chainSurface: '/admin/agentnet/chain-surface',
  demoEvidence: '/admin/agentnet/demo-evidence',
  demoEvidenceBundle: '/admin/agentnet/demo-evidence-bundle',
  faucetMint: '/admin/agentnet/faucet-mint',
  genomeEntityId: '/admin/agentnet/genome/{entity_id}',
  grantMetrics: '/admin/agentnet/grant-metrics',
  hubSnapshot: '/admin/agentnet/hub-snapshot',
  launchReadiness: '/admin/agentnet/launch-readiness',
  networkDashboard: '/admin/agentnet/network-dashboard',
  networkHealth: '/admin/agentnet/network-health',
  overview: '/admin/agentnet/overview',
  reconciliationSnapshot: '/admin/agentnet/reconciliation-snapshot',
  schemaReset: '/admin/agentnet/schema-reset',
  schemaResetMode: '/admin/agentnet/schema-reset/mode',
  schemaStatus: '/admin/agentnet/schema-status',
  testnetFixturesBindTestVaultWallet: '/admin/agentnet/testnet/fixtures/bind-test-vault-wallet',
  testnetOpsKpis: '/admin/agentnet/testnet/ops-kpis',
  testnetProfiles: '/admin/agentnet/testnet/profiles',
  testnetScenariosRunId: '/admin/agentnet/testnet/scenarios/{run_id}',
  testnetScenariosScenarioIdRun: '/admin/agentnet/testnet/scenarios/{scenario_id}/run',
  testnetWorkersRunOnce: '/admin/agentnet/testnet/workers/run-once',
} as const;

export type AdminAgentnetOpenApiPath =
  (typeof ADMIN_AGENTNET_OPENAPI_PATHS)[keyof typeof ADMIN_AGENTNET_OPENAPI_PATHS];
