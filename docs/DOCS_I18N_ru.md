# Документация SDK — английский / русский (i18n)

**Genetic tag:** `repo.platform.sdk.docs_i18n.gen1`  
**EN:** [DOCS_I18N.md](./DOCS_I18N.md)

## Приоритет

| Правило | Смысл |
|---------|--------|
| **Канон** | **Английский** — для AI (`llms.txt`), npm, зеркала GitHub |
| **Русский** | `*_ru.md` или корневой `README.md` (расширенный нарратив) |
| **Перекрёстные ссылки** | В начале пары: `**EN:**` / `**RU:**` |
| **Код и API** | Одинаковы (идентификаторы, env, URL) |

## Имена файлов

| Шаблон | Роль |
|--------|------|
| `FOO.md` | Канон EN |
| `FOO_ru.md` | Зеркало RU |
| `README.en.md` | README EN (GitHub international) |
| `README.md` | README RU + ссылка на `README.en.md` |

**npm:** `"readme": "README.en.md"` в `packages/*/package.json`.

`AGENTS.md` — только EN в `llms.txt`; для людей — [AGENTS_ru.md](../AGENTS_ru.md).

## Что переводить

| Уровень | Документы | RU |
|---------|-----------|-----|
| **P0** | Интеграция, scope, projectId, submodule, quick-start, хаб | Обязательно |
| **P1** | AGENTS, integrator guide | Обязательно |
| **P2** | Architecture, React, protein | Пары EN + `_ru` |
| **P3** | Длинный auto-reference | Только EN |

## Workflow

1. Сначала **английский** файл.  
2. В том же PR — **`_ru.md`**.  
3. `npm run generate:docs-i18n` → `npm run check:docs-i18n:all`.  
4. Обновить [DOC_HUB_ru.md](./DOC_HUB_ru.md) при новой паре.

## Diátaxis

Полосы в [DOC_HUB_ru.md](./DOC_HUB_ru.md):

| Полоса | Назначение |
|--------|------------|
| **Tutorial** | Первый успех ~15 мин |
| **How-to** | Конкретная задача |
| **Reference** | Таблицы, инварианты |
| **Explanation** | Почему SDK устроен так |

Шаблоны: [templates/](./templates/) · термины: [GLOSSARY_ru.md](./GLOSSARY_ru.md)

## Исключения имён

| Путь | Язык | Примечание |
|------|------|------------|
| `README.en.md` | EN | Канон GitHub/npm |
| `README.md` (корень) | RU | Extended narrative |
| `packages/*/README.md` | RU | npm readme = `README.en.md` |

## Статусы sync

| Статус | Смысл |
|--------|--------|
| `balanced` | Ratio EN/RU 0.6–1.4 |
| `en-thin` | Расширить EN |
| `ru-thin` | Расширить RU |
| `legacy-ru-path` | Длинный RU `README.md`, канон EN в `README.en.md` |
| `stub` | Временно; не для P0 |

Матрица: [DOC_SYNC_MATRIX.md](./DOC_SYNC_MATRIX.md)

## PR checklist

1. EN → `_ru.md`  
2. Одинаковые `##` и блоки кода  
3. `npm run check:docs-i18n:all`  
4. Не добавлять `*_ru.md` в [llms.txt](../llms.txt)

## CI

- `check:docs-i18n` — пары, ссылки, H2 ±6  
- `check:docs-i18n-depth` — ratio + fences для P0  
- `check:docs-api-symbols` — EN integrator docs  

## Реестр

[i18n-manifest.json](./i18n-manifest.json) · [I18N_DOC_REGISTRY.md](./I18N_DOC_REGISTRY.md) · [DOC_SYNC_MATRIX.md](./DOC_SYNC_MATRIX.md)
