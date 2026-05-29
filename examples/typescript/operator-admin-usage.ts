/**
 * Platform-operator samples only — NOT for npm tenant integrators.
 * Requires SDKConfig.sdkAudience: 'platform_operator' (AgentStack monorepo ops).
 *
 * @see docs/INTEGRATOR_SCOPE.md
 */
import { AgentStackSDK } from '@agentstack/sdk';

const sdk = new AgentStackSDK({
  apiBase: process.env.AGENTSTACK_API_BASE ?? 'https://agentstack.tech/api',
  apiKey: process.env.AGENTSTACK_API_KEY ?? '',
  projectId: 1,
  sdkAudience: 'platform_operator',
});

async function operatorAdminExamples() {
  const users = await sdk.admin.getUsers({ page: 1, limit: 20 });
  console.log('Users:', users.users?.length ?? 0);
  const stats = await sdk.admin.getSystemStats();
  console.log('System stats:', stats.total_users);
}

export { operatorAdminExamples };
