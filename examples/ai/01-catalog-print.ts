import { AgentStackSDK, resolveAgentStackApiBase } from '@agentstack/sdk';

const sdk = new AgentStackSDK({ apiBase: resolveAgentStackApiBase() });
console.log(JSON.stringify(sdk.getModuleCatalog(), null, 2));
