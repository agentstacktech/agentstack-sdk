# Матрица синхронизации документации SDK

**Genetic tag:** `repo.platform.sdk.docs_i18n.gen1`  
**EN (auto):** [DOC_SYNC_MATRIX.md](./DOC_SYNC_MATRIX.md)

Кратко для русскоязычных maintainers.

## Статусы

| Статус | Действие |
|--------|----------|
| **balanced** | Паритет OK (ratio 0.6–1.4) |
| **ru-thin** | Расширить `*_ru.md` |
| **en-thin** | Расширить EN (не legacy README) |
| **legacy-ru-path** | Канон EN в `README.en.md`, длинный RU в `README.md` — ratio не применяется |

## P0 gate

Перед релизом SDK:

```bash
cd agentstack-unified-sdk
npm run check:docs-i18n:all
```

Полная таблица путей и line counts — в [DOC_SYNC_MATRIX.md](./DOC_SYNC_MATRIX.md) (генерируется `npm run generate:docs-i18n`).

## Политика

[DOCS_I18N_ru.md](./DOCS_I18N_ru.md) · [DOC_HUB_ru.md](./DOC_HUB_ru.md)
