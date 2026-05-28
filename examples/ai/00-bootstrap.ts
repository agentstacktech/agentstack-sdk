/**
 * Discover catalog + login + list projects.
 * Env: AGENTSTACK_API_BASE, AGENTSTACK_EMAIL, AGENTSTACK_PASSWORD
 */
import { AgentStackSDK, resolveAgentStackApiBase } from '@agentstack/sdk';

async function main() {
  const sdk = new AgentStackSDK({ apiBase: resolveAgentStackApiBase() });
  const catalog = sdk.getModuleCatalog();
  console.log('productVersion', catalog.productVersion, 'modules', catalog.modules.length);

  if (process.env.AGENTSTACK_EMAIL && process.env.AGENTSTACK_PASSWORD) {
    await sdk.platform.auth.login({
      email: process.env.AGENTSTACK_EMAIL,
      password: process.env.AGENTSTACK_PASSWORD,
    });
    const projects = await sdk.platform.api.getProjects();
    console.log('projects', projects?.length ?? projects);
  } else {
    console.log('skip login — set AGENTSTACK_EMAIL and AGENTSTACK_PASSWORD');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
