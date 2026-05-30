# SDK documentation i18n — roadmap & task list

**EN:** this file · **RU:** [SDK_DOCS_I18N_ROADMAP_ru.md](./SDK_DOCS_I18N_ROADMAP_ru.md)  
**Policy:** [DOCS_I18N.md](./DOCS_I18N.md)

---

## Done (v2 sync)

- [x] Diátaxis DOC_HUB, GLOSSARY, templates, DOC_SYNC_MATRIX
- [x] `check:docs-i18n:all` (parity + depth + urls + symbols)
- [x] P0 content: README.en, MODULAR, PROTEIN, package README.en, SDK_AI_SURFACE_ru
- [x] REACT_QUERY: `SDKProvider` canonical; llms.txt curated P0
- [x] Monorepo `*_ru` stubs (ecosystem, commerce, protocol quickstart)
- [x] AI_INDEX_ru navigator, CHANGELOG_ru

---

## Optional later

- [x] `check-docs-code-samples.mjs` — P0 EN fenced TS / examples links
- [x] `check-docs-legacy-ru-api.mjs` — block removed APIs in `packages/*/README.md`
- [ ] Auto-run `mirror-readme-for-github.mjs` in mirror publish workflow (mirror repo only)

---

## Maintainer checklist

1. Edit **English** `FOO.md` first.  
2. Update `FOO_ru.md`.  
3. `npm run check:docs-i18n:all`  
4. Never add `*_ru.md` to `llms.txt`.

```bash
cd agentstack-unified-sdk
npm run check:docs-i18n:all
```

Registries: [I18N_DOC_REGISTRY.md](./I18N_DOC_REGISTRY.md) · monorepo [docs/sdk/I18N_DOC_REGISTRY.md](../../docs/sdk/I18N_DOC_REGISTRY.md)
