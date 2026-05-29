# Quick start

**RU:** [quick-start_ru.md](./quick-start_ru.md)

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

## Environment variables

| Variable | When | Value |
|----------|------|--------|
| `AGENTSTACK_API_BASE` | Node, scripts, examples | Production: `https://agentstack.tech/api` (or omit — `resolveAgentStackApiBase()` default) |
| `AGENTSTACK_API_KEY` | Automation | Project API key |
| `AGENTSTACK_EMAIL` / `AGENTSTACK_PASSWORD` | Examples | Login for integration tests |
| `AGENTSTACK_PROJECT_ID` | Examples / automation | Active project scope (`sdk.updateProjectId`) |
| `VITE_API_BASE_URL` | Vite SPA | `https://agentstack.tech/api` (monorepo also accepts `VITE_API_BASE`) |

## Local development

Set `AGENTSTACK_API_BASE=http://localhost:8000/api` when running Core locally.
