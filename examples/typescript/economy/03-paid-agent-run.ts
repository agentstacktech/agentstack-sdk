/**
 * genetic: sdk.economy.gen1
 */
import { AgentStackSDK, economyPaidAgentRunRecipe } from '@agentstack/sdk';

async function main() {
  const sdk = new AgentStackSDK({
    apiBase: process.env.AGENTSTACK_API_BASE ?? 'https://agentstack.tech/api',
  });
  await sdk.platform.auth.login({
    email: process.env.AGENTSTACK_EMAIL!,
    password: process.env.AGENTSTACK_PASSWORD!,
  });
  const projectId = Number(process.env.PROJECT_ID ?? 1);
  const out = await economyPaidAgentRunRecipe(sdk, {
    projectId,
    agentId: process.env.AGENT_ID!,
    buyerUserId: Number(process.env.USER_ID ?? 1),
    creditsAtomic: Number(process.env.CREDITS_ATOMIC ?? 10),
    input: { task: 'demo' },
  });
  console.log(out);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
