/**
 * genetic: sdk.economy.gen1
 * Verify an agent run receipt (optional anchor claim).
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
  const receiptJson = process.env.RECEIPT_JSON;
  if (!receiptJson) {
    throw new Error('RECEIPT_JSON required (run output.receipt object)');
  }
  const receipt = JSON.parse(receiptJson) as Record<string, unknown>;
  const result = await sdk.platform.economy.proofs.verifyReceipt(projectId, {
    receipt,
    declared_hash: process.env.RECEIPT_HASH,
    anchor_claim:
      process.env.ANCHOR_CLAIM_JSON != null
        ? (JSON.parse(process.env.ANCHOR_CLAIM_JSON) as Record<string, unknown>)
        : undefined,
  });
  console.log(result);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
