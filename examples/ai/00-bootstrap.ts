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
    const envProjectId = process.env.AGENTSTACK_PROJECT_ID
      ? Number(process.env.AGENTSTACK_PROJECT_ID)
      : undefined;
    await sdk.platform.auth.login({
      email: process.env.AGENTSTACK_EMAIL,
      password: process.env.AGENTSTACK_PASSWORD,
      ...(envProjectId ? { project_id: envProjectId } : {}),
    });
    const projects = await sdk.platform.api.getProjects();
    const first = Array.isArray(projects) ? projects[0] : undefined;
    const activeId =
      envProjectId ??
      (first && typeof first === 'object' && 'id' in first
        ? Number((first as { id: number }).id)
        : undefined);
    if (activeId) {
      sdk.updateProjectId(activeId);
      console.log('active projectId', sdk.getProjectId());
    }
    console.log('projects', projects?.length ?? projects);
  } else {
    console.log('skip login — set AGENTSTACK_EMAIL and AGENTSTACK_PASSWORD');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
