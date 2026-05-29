# SDK documentation — English / Russian (i18n)

**Genetic tag:** `repo.platform.sdk.docs_i18n.gen1`  
**RU:** [DOCS_I18N_ru.md](./DOCS_I18N_ru.md)

## Priority

| Rule | Detail |
|------|--------|
| **Canonical language** | **English** — default for AI (`llms.txt`), npm mirror, new edits |
| **Russian** | `*_ru.md` sibling or `README.md` (legacy narrative) |
| **Cross-links** | First ~15 lines of every paired doc: `**EN:**` / `**RU:**` |
| **Code & APIs** | Identical in both languages (identifiers, env vars, URLs) |

## File naming

| Pattern | Role |
|---------|------|
| `FOO.md` | English canonical (under `docs/` or repo root) |
| `FOO_ru.md` | Russian mirror |
| `README.en.md` | English repo README (GitHub default for international) |
| `README.md` | Russian README + link to `README.en.md` |

**npm package pages:** `packages/*/package.json` sets `"readme": "README.en.md"` so npmjs.com shows English. Russian package docs stay in `README.md` per package.

Exception: `AGENTS.md` stays English-only in `llms.txt`; optional `AGENTS_ru.md` for human readers.

## What to translate

| Tier | Docs | RU required |
|------|------|-------------|
| **P0** | Integration, scope, project context, submodule, quick-start, doc hub | Yes — full pairs |
| **P1** | `AGENTS_ru.md`, `AI_INTEGRATOR_GUIDE_ru.md` | Yes — narrative |
| **P2** | Architecture, React, protein, module catalog | EN `FOO.md` + `FOO_ru.md` (legacy RU files were moved to `_ru`) |
| **P3** | Long reference (auto-generated API) | EN only |

## Maintainer workflow

1. Edit **English** file first.
2. Update **`_ru.md`** in the same PR (or add `pair-stub` note in manifest if RU lags — max one release).
3. Run `npm run generate:docs-i18n` then `npm run check:docs-i18n`.
4. Update [DOC_HUB.md](./DOC_HUB.md) if you add a new paired doc.

## CI

- `check:docs-i18n` — mirror exists, header cross-link, rough `##` section parity (tolerance ±6).
- `llms.txt` — **English paths only** (do not add `*_ru.md`).

## Registry

Auto-generated: [i18n-manifest.json](./i18n-manifest.json) · human table: [I18N_DOC_REGISTRY.md](./I18N_DOC_REGISTRY.md).
