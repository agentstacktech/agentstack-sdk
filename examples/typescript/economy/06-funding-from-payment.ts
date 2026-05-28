/**
 * genetic: sdk.economy.gen1
 * Funding rail: attach AGNT purchase metadata to a payment intent (admin/BFF flows).
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
  const paymentIntentId = process.env.PAYMENT_INTENT_ID;
  if (!paymentIntentId) {
    throw new Error('PAYMENT_INTENT_ID required');
  }
  const wallet = process.env.WALLET_ADDRESS;
  if (!wallet) {
    throw new Error('WALLET_ADDRESS required');
  }
  const res = await sdk.platform.economy.funding.fundFromPayment(
    projectId,
    paymentIntentId,
    wallet,
  );
  console.log(res);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
