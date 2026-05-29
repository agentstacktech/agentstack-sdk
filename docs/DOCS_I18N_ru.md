# Документация SDK — английский / русский (i18n)

**Genetic tag:** `repo.platform.sdk.docs_i18n.gen1`  
**EN:** [DOCS_I18N.md](./DOCS_I18N.md)

## Приоритет

| Правило | Смысл |
|---------|--------|
| **Канон** | **Английский** — для AI (`llms.txt`), npm-зеркала, новых правок |
| **Русский** | файл `*_ru.md` или `README.md` (исторический нарратив) |
| **Перекрёстные ссылки** | В начале каждой пары: `**EN:**` / `**RU:**` |
| **Код и API** | Одинаковы в обоих языках (идентификаторы, env, URL) |

## Имена файлов

| Шаблон | Роль |
|--------|------|
| `FOO.md` | Канон на английском |
| `FOO_ru.md` | Русское зеркало |
| `README.en.md` | README на английском (GitHub для международной аудитории) |
| `README.md` | README на русском + ссылка на `README.en.md` |

`AGENTS.md` остаётся только на английском в `llms.txt`; для людей — [AGENTS_ru.md](../AGENTS_ru.md).

## Что переводить

| Уровень | Документы | RU |
|---------|-----------|-----|
| **P0** | Интеграция, scope, projectId, submodule, quick-start, хаб | Обязательно |
| **P1** | AGENTS, integrator guide | Обязательно (нарратив) |
| **P2** | Architecture, React, protein | EN сначала; RU при правках |
| **P3** | Длинный auto-reference | Только EN |

## Workflow для maintainers

1. Сначала правите **английский** файл.
2. В том же PR обновляете **`_ru.md`** (или помечаете `pair-stub` в манифесте — не дольше одного релиза).
3. `npm run generate:docs-i18n` → `npm run check:docs-i18n`.
4. Обновите [DOC_HUB_ru.md](./DOC_HUB_ru.md) при новой паре.

## CI

- `check:docs-i18n` — зеркало, ссылка в шапке, грубый паритет секций `##` (допуск ±6).
- `llms.txt` — **только английские пути**.

## Реестр

Авто: [i18n-manifest.json](./i18n-manifest.json) · таблица: [I18N_DOC_REGISTRY.md](./I18N_DOC_REGISTRY.md).
