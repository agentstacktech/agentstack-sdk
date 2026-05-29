# SDK documentation i18n — roadmap & task list

**EN:** this file · **RU:** [SDK_DOCS_I18N_ROADMAP_ru.md](./SDK_DOCS_I18N_ROADMAP_ru.md)  
**Policy:** [DOCS_I18N.md](./DOCS_I18N.md)

---

## Done (P0–P3)

- [x] All integrator + architecture doc pairs under `agentstack-unified-sdk/docs/`
- [x] Root: `CONTRIBUTING`, `PUBLISHING`, `SECURITY`, `examples/ai/README` pairs
- [x] Package `README.en.md` + npm `"readme": "README.en.md"` (core, react, hooks)
- [x] CI: `generate:docs-i18n` + `check:docs-i18n` in `ci.yml` and `agentstack-sdk-docs-ci.yml`
- [x] Monorepo registry: `docs/sdk/i18n-manifest.json` + `I18N_DOC_REGISTRY.md`
- [x] `scripts/mirror-readme-for-github.mjs` + runbook step for public mirror
- [x] `GENETIC_STARTER_SDK_SLICE_ru.md`

---

## Optional later

- [ ] `packages/hooks/README.en.md` if hooks gets a long RU README
- [ ] Auto-run `mirror-readme-for-github.mjs` in mirror publish workflow (mirror repo only)

---

## Maintainer checklist

1. Edit **English** `FOO.md` first.  
2. Update `FOO_ru.md`.  
3. `npm run generate:docs-i18n && npm run check:docs-i18n`  
4. Never add `*_ru.md` to `llms.txt`.

```bash
cd agentstack-unified-sdk
npm run generate:docs-i18n
npm run check:docs-i18n
```

Registries: [I18N_DOC_REGISTRY.md](./I18N_DOC_REGISTRY.md) · monorepo [docs/sdk/I18N_DOC_REGISTRY.md](../../docs/sdk/I18N_DOC_REGISTRY.md)
