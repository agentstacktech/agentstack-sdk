/**
 * Requires auth + PROJECT_ID. Publishes minimal HTML via hosting.quickStart.
 */
import { AgentStackSDK, resolveAgentStackApiBase } from '@agentstack/sdk';

async function main() {
  const projectId = Number(process.env.PROJECT_ID);
  if (!projectId) throw new Error('set PROJECT_ID');

  const sdk = new AgentStackSDK({ apiBase: resolveAgentStackApiBase() });
  await sdk.platform.auth.login({
    email: process.env.AGENTSTACK_EMAIL!,
    password: process.env.AGENTSTACK_PASSWORD!,
  });

  const result = await sdk.hosting.quickStart({
    project_id: projectId,
    html: '<!doctype html><html><body><h1>AgentStack SDK</h1></body></html>',
    bucket_name: process.env.HOSTING_BUCKET ?? 'sdk-demo',
    publish: true,
  });
  console.log(result);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
