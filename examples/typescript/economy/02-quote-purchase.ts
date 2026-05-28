/**
 * genetic: sdk.economy.gen1
 * Quote → purchase compute credits (AGNT).
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
  const buyerUserId = Number(process.env.USER_ID ?? 1);
  const creditsAtomic = Number(process.env.CREDITS_ATOMIC ?? 10);
  const ledger = sdk.platform.economy.ledger;

  const { quote } = await ledger.quoteComputeCredits(projectId, {
    buyer_user_id: buyerUserId,
    credits_atomic: creditsAtomic,
  });
  const purchase = await ledger.purchaseComputeCredits(projectId, {
    buyer_user_id: buyerUserId,
    credits_atomic: creditsAtomic,
    idempotency_key: `example-${Date.now()}`,
    quote_id: String((quote as { quote_id?: string }).quote_id ?? ''),
    quote_hash: String((quote as { quote_hash?: string }).quote_hash ?? ''),
    include_proof: true,
  });
  console.log(JSON.stringify({ quote, purchase }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
