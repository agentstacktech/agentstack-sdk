/**
 * finance.pay quote + execute example.
 * Gene: sdk.finance.gen1
 */
import { AgentStack } from '@agentstack/sdk';

async function main() {
  const sdk = new AgentStack({ projectId: 1 });
  const projectId = 1;

  const quote = await sdk.finance.pay.quote(projectId, {
    intent: 'energy_pack',
    source: {
      kind: 'personal_wallet',
      project_id: 1,
      wallet_id: 'YOUR_WALLET_ID',
      currency: 'USD',
    },
    amount: 5,
    currency: 'USD',
    metadata: { pack_tier: 'small' },
  });

  const receipt = await sdk.finance.pay.execute(projectId, {
    quote_id: quote.quote_id,
    quote_hash: quote.quote_hash,
    idempotency_key: `energy-${Date.now()}`,
  });

  console.log(receipt);
}

main().catch(console.error);
