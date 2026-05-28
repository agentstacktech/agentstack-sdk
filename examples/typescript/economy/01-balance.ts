/**
 * genetic: sdk.economy.gen1
 * Env: AGENTSTACK_API_BASE, AGENTSTACK_EMAIL, AGENTSTACK_PASSWORD, PROJECT_ID, USER_ID
 */
import { AgentStackSDK, buildUserAgntKey } from '@agentstack/sdk';

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
  const userId = Number(process.env.USER_ID ?? 1);
  const bal = await sdk.platform.economy.ledger.getBalance(projectId, {
    accountKey: buildUserAgntKey(projectId, userId),
  });
  console.log(bal);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
