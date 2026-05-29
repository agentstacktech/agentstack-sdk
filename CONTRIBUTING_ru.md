# Участие в AgentStack SDK

**EN:** [CONTRIBUTING.md](./CONTRIBUTING.md)

Спасибо за интерес к проекту!

## Начало

### Требования

- Node.js >= 20
- npm >= 10

### Установка

```bash
git clone https://github.com/agentstacktech/agentstack-sdk.git
cd agentstack-sdk
npm install
npm run build
```

### Тесты

```bash
npm run test
npm run check:docs-i18n
```

## Документация (i18n)

- Канон — **английский** (`FOO.md`)
- Русский — `FOO_ru.md`
- См. [docs/DOCS_I18N_ru.md](docs/DOCS_I18N_ru.md)

Перед PR: `npm run generate:docs-i18n && npm run check:docs-i18n`
