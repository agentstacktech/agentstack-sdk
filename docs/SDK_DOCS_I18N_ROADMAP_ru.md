# SDK documentation i18n — roadmap

**EN:** [SDK_DOCS_I18N_ROADMAP.md](./SDK_DOCS_I18N_ROADMAP.md)  
**Политика:** [DOCS_I18N_ru.md](./DOCS_I18N_ru.md)

---

## Сделано (v2)

- [x] Diátaxis в DOC_HUB / DOC_HUB_ru
- [x] GLOSSARY EN/RU, шаблоны `docs/templates/`
- [x] DOC_SYNC_MATRIX, `check:docs-i18n-depth`, `check:docs-i18n:all`
- [x] P0: README.en, MODULAR, PROTEIN, SDK_AI_SURFACE_ru
- [x] REACT_QUERY: SDKProvider канон
- [x] Monorepo ecosystem/commerce `*_ru` stubs
- [x] AI_INDEX_ru, CHANGELOG_ru

---

## Опционально позже

- [ ] `check-docs-code-samples.mjs` — P0 snippets ⊆ examples/
- [ ] Авто `mirror-readme-for-github.mjs` в publish workflow (только mirror repo)

---

## Чеклист maintainer

1. Правка **EN** `FOO.md`.  
2. Обновление `FOO_ru.md`.  
3. `npm run check:docs-i18n:all`  
4. Не добавлять `*_ru.md` в `llms.txt`.

```bash
cd agentstack-unified-sdk
npm run generate:docs-i18n
npm run check:docs-i18n:all
```

Реестры: [I18N_DOC_REGISTRY.md](./I18N_DOC_REGISTRY.md) · [docs/sdk/I18N_DOC_REGISTRY.md](../../docs/sdk/I18N_DOC_REGISTRY.md)
