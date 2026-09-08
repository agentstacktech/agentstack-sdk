/**
 * Add funds via commerceTopUpRecipe — personal or treasury lane.
 * Gene: frontend.finance.add_funds.gen1
 */
import { createClient } from '@agentstack/sdk';
import { commerceTopUpRecipe } from '@agentstack/sdk/commerce/topup';

function idemKey(label: string): string {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function main() {
  const sdk = createClient({
    baseUrl: process.env.AGENTSTACK_BASE_URL ?? 'https://agentstack.tech/api',
    apiKey: process.env.AGENTSTACK_API_KEY,
  });

  const personal = await commerceTopUpRecipe(sdk.httpClient, {
    amount: 10,
    currency: 'USD',
    preferred_method: 'card',
    description: 'Personal wallet top-up',
  }, { idempotencyKey: idemKey('add-funds-personal') });

  console.log('personal top-up', personal.payment_id, personal.status);

  const projectId = Number(process.env.AGENTSTACK_PROJECT_ID ?? 0);
  if (projectId > 1) {
    const treasury = await commerceTopUpRecipe(sdk.httpClient, {
      amount: 25,
      currency: 'USD',
      project_id: projectId,
      preferred_method: 'card',
      description: 'Treasury top-up',
    }, { idempotencyKey: idemKey('add-funds-treasury') });
    console.log('treasury top-up', treasury.payment_id, treasury.status);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
