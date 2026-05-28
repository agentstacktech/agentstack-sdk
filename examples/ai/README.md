# AI examples

Runnable with `npx tsx` from `agentstack-unified-sdk` after `npm run build` in `packages/core`.

## Environments

| Env | `AGENTSTACK_API_BASE` |
|-----|------------------------|
| Production (default) | *(unset)* → `https://agentstack.tech/api` |
| Local Core | `http://localhost:8000/api` |

## Local development

```bash
export AGENTSTACK_EMAIL=you@example.com
export AGENTSTACK_PASSWORD=secret
npx tsx examples/ai/00-bootstrap.ts
```

| Script | Purpose |
|--------|---------|
| `00-bootstrap.ts` | catalog + optional login |
| `01-catalog-print.ts` | JSON module catalog |
| `02-validate-manifest.ts` | UAM zod |
| `04-run-task-capability.ts` | task port demo |
