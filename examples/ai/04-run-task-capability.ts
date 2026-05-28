import {
  AgentStackSDK,
  resolveAgentStackApiBase,
  registerTaskCapabilityPort,
  runTaskCapability,
  listRegisteredTaskPorts,
} from '@agentstack/sdk';

const sdk = new AgentStackSDK({ apiBase: resolveAgentStackApiBase() });

registerTaskCapabilityPort({
  taskId: 'demo.echo',
  async run(ctx) {
    return { ok: true, data: { projectId: ctx.projectId } };
  },
});

console.log('ports', listRegisteredTaskPorts());
runTaskCapability('demo.echo', { sdk, projectId: 1, audience: 'developer' }).then(console.log);
