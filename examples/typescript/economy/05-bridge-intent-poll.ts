/**
 * genetic: sdk.economy.gen1
 * Poll bridge intent status via BridgeIntentTracker.
 */
import { AgentStackSDK } from '@agentstack/sdk';

async function main() {
  const sdk = new AgentStackSDK({
    apiBase: process.env.AGENTSTACK_API_BASE ?? 'https://agentstack.tech/api',
    projectId: Number(process.env.PROJECT_ID ?? 1),
  });
  await sdk.platform.auth.login({
    email: process.env.AGENTSTACK_EMAIL!,
    password: process.env.AGENTSTACK_PASSWORD!,
  });
  const projectId = Number(process.env.PROJECT_ID ?? 1);
  const intentId = process.env.BRIDGE_INTENT_ID;
  if (!intentId) {
    throw new Error('BRIDGE_INTENT_ID required');
  }
  const id = Number(intentId);
  const final = await sdk.platform.economy.bridgeTracker.pollUntil(
    projectId,
    id,
    (row) => {
      const st = String(row.status ?? '').toLowerCase();
      return st === 'finalized' || st === 'failed' || st === 'cancelled';
    },
    { intervalMs: 2000, timeoutMs: 120_000 },
  );
  console.log(final);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
