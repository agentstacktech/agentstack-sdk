# Quick start

See [AGENTS.md](../AGENTS.md) for AI agents.

```bash
npm install @agentstack/sdk
```

```typescript
import { AgentStackSDK, resolveAgentStackApiBase } from '@agentstack/sdk';

const sdk = new AgentStackSDK({
  apiBase: resolveAgentStackApiBase(),
});

const catalog = sdk.getModuleCatalog();
await sdk.platform.auth.login({
  email: process.env.AGENTSTACK_EMAIL!,
  password: process.env.AGENTSTACK_PASSWORD!,
});

const projects = await sdk.platform.api.getProjects();
```

## Local development

Set `AGENTSTACK_API_BASE=http://localhost:8000/api` when running Core locally.
