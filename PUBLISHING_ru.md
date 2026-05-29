# Публикация

**EN:** [PUBLISHING.md](./PUBLISHING.md)

## После первого npm publish

1. **agentstack-frontend:** `"@agentstack/sdk": "^0.4.13"` вместо `file:../agentstack-unified-sdk/...`
2. **Локальная разработка:** `npm link` в `packages/core`

## Шаги npm

1. Bump: `npm version patch -w @agentstack/sdk`
2. GitHub Release → workflow publish
3. Или вручную: `npm publish -w @agentstack/sdk` с `NPM_TOKEN`

Полный runbook (mirror, subtree, i18n): [docs/sdk/SDK_MIRROR_PUBLISH_RUNBOOK_ru.md](../docs/sdk/SDK_MIRROR_PUBLISH_RUNBOOK_ru.md).

## README на GitHub mirror

В **mirror**-репозитории (не в monorepo AgentStack):

```bash
node scripts/mirror-readme-for-github.mjs --root . --apply
```

Корневой `README.md` станет английским; полный RU — `README.ru.md`.
