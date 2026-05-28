/**
 * Discover tasks from module catalog and run a registered port.
 */
import {
  AgentStackSDK,
  resolveAgentStackApiBase,
  registerTaskCapabilityPort,
  runTaskCapability,
} from '@agentstack/sdk';

const sdk = new AgentStackSDK({ apiBase: resolveAgentStackApiBase() });
const tasks = sdk.getModuleCatalog().tasks;
console.log(
  'catalog tasks',
  tasks.map((t) => t.taskId),
);

registerTaskCapabilityPort({
  taskId: 'demo.discover',
  async run() {
    return { ok: true, data: { discovered: tasks.length } };
  },
});

runTaskCapability('demo.discover', { sdk, projectId: 1, audience: 'developer' }).then(console.log);
