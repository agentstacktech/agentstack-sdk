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
| `README.md` | Russian extended narrative + link to `README.en.md` (API-truth = EN) |
| `README.md` | Russian extended repo README (API-truth = `README.en.md`) |
| `packages/*/README.md` | Russian package docs |

CI: `check:docs-legacy-ru-api` blocks removed APIs in all paths above.

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
3. Run `npm run generate:docs-i18n` then `npm run check:docs-i18n:all` (parity, depth, URLs, API symbols, code samples).
4. Update [DOC_HUB.md](./DOC_HUB.md) if you add a new paired doc.

## Diátaxis (navigation)

Organize docs in [DOC_HUB.md](./DOC_HUB.md) as:

| Lane | Purpose |
|------|---------|
| **Tutorial** | First success in ~15 minutes |
| **How-to** | Solve a specific task |
| **Reference** | Facts, tables, invariants |
| **Explanation** | Why the SDK is shaped this way |

Templates: [templates/](templates/) · Terms: [GLOSSARY.md](./GLOSSARY.md)

## Naming exceptions

| Path | Language | Note |
|------|----------|------|
| `README.en.md` | EN | GitHub/npm canonical |
| `README.md` (repo root) | RU | Extended narrative — not `FOO.md` EN rule |
| `packages/*/README.md` | RU | `README.en.md` is npm readme |
| `docs/README.md` | EN | Doc tree index |

## Sync statuses (manifest)

| Status | Meaning |
|--------|---------|
| `balanced` | EN/RU line ratio 0.6–1.4 |
| `en-thin` | Expand English |
| `ru-thin` | Expand Russian |
| `legacy-ru-path` | EN in `README.en.md`; long RU in `README.md` (ratio N/A) |
| `stub` | Temporary; not allowed for P0 |
| `en-only` | No RU mirror (listed in HUB) |

Matrix: [DOC_SYNC_MATRIX.md](./DOC_SYNC_MATRIX.md) (auto-generated).

## PR checklist

1. Edit **English** first, then **`_ru.md`**
2. Same `##` headings and code blocks in both languages
3. `npm run check:docs-i18n:all`
4. Update [DOC_HUB.md](./DOC_HUB.md) if adding a doc
5. Do not add `*_ru.md` to [llms.txt](../llms.txt)

## CI

- `check:docs-i18n` — pairs, cross-links, H2 ±6
- `check:docs-i18n-depth` — line ratio + code fences for P0
- `check:docs-api-symbols` — EN integrator docs (no `sdk.admin`)
- `llms.txt` — **English only**

## Registry

[i18n-manifest.json](./i18n-manifest.json) · [I18N_DOC_REGISTRY.md](./I18N_DOC_REGISTRY.md) · [DOC_SYNC_MATRIX.md](./DOC_SYNC_MATRIX.md)
