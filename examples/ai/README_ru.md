# AI examples

**EN:** [README.md](./README.md)

Запуск с `npx tsx` из `agentstack-unified-sdk` после `npm run build` в `packages/core`.

## Окружение

| Env | Значение |
|-----|----------|
| Production | omit → `https://agentstack.tech/api` |
| Local Core | `AGENTSTACK_API_BASE=http://localhost:8000/api` |

`AGENTSTACK_PROJECT_ID` — см. [PROJECT_CONTEXT_ru.md](../../docs/PROJECT_CONTEXT_ru.md).

## Локально

```bash
export AGENTSTACK_EMAIL=you@example.com
export AGENTSTACK_PASSWORD=secret
npx tsx examples/ai/00-bootstrap.ts
```

| Скрипт | Назначение |
|--------|------------|
| `00-bootstrap.ts` | catalog + login |
| `01-catalog-print.ts` | JSON каталог |
| `02-validate-manifest.ts` | UAM zod |
| `04-run-task-capability.ts` | task port demo |
