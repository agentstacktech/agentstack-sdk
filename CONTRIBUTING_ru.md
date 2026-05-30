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
npm run check:docs-i18n:all
```

### Документация (i18n)

Канон — **английский**. В том же PR обновляйте `*_ru.md`. См. [docs/DOCS_I18N_ru.md](docs/DOCS_I18N_ru.md).

```bash
npm run generate:docs-i18n
npm run check:docs-i18n:all
```

### Линт

```bash
npm run lint
```

## Workflow

1. Ветка от `main`: `git checkout -b feature/your-feature`
2. Изменения в `packages/core/src/`
3. `npm run build` и `npm run test`
4. Коммиты [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` — новая возможность
   - `fix:` — исправление
   - `docs:` — документация
5. Pull Request

## Стиль кода

- [.cursorrules](.cursorrules)
- TypeScript strict
- Типы для публичного API
- Docstrings для экспортируемых символов

## Pull Request

- Фокусный diff
- Тесты зелёные
- Документация EN + RU при изменении поведения

## Вопросы

- [GitHub Issues](https://github.com/agentstacktech/agentstack-sdk/issues)
- [Swagger](https://agentstack.tech/swagger)
- [AGENTS_ru.md](./AGENTS_ru.md)
- Runbook зеркала: [SDK_MIRROR_PUBLISH_RUNBOOK_ru.md](../docs/sdk/SDK_MIRROR_PUBLISH_RUNBOOK_ru.md) (maintainers monorepo)
