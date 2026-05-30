# Documentation style gap audit (RU legacy → EN canonical)

**Genetic tag:** `repo.platform.sdk.docs_i18n.gen1`  
**RU:** [DOC_STYLE_GAP_ru.md](./DOC_STYLE_GAP_ru.md)

Tracks where **Russian legacy README** is richer than **English canonical** (`README.en.md`). Goal: EN gets the same **structure** (goals, tree, module sections, examples) while staying integrator-safe.

| EN path | RU path | Lines EN | Lines RU | Gap type | Action |
|---------|---------|----------|----------|----------|--------|
| `README.en.md` | `README.md` | ~230 | ~704 | narrative + API sections | Expand EN (this sprint) |
| `packages/core/README.en.md` | `packages/core/README.md` | ~97 | ~1106 | per-module reference | Expand EN module guide |
| `packages/react/README.en.md` | `packages/react/README.md` | ~85 | ~666 | hooks catalog | Expand EN hooks |
| `packages/hooks/README.en.md` | `packages/hooks/README.md` | ~42 | ~295 | hook patterns | Expand EN |
| `packages/python/README.en.md` | `packages/python/README.md` | ~50 | ~269 | parity examples | Expand EN |
| `docs/MODULAR_ARCHITECTURE.md` | `*_ru.md` | ~213 | ~328 | emoji module blocks | EN has reference; RU has more prose |
| `docs/PROTEIN_SYSTEM_GUIDE.md` | `*_ru.md` | ~275 | ~495 | legacy protein depth | EN protocol-first; RU keeps deep legacy |

**Not in scope:** duplicate 1100-line core RU into EN — npm readme stays navigable; deep reference remains in RU `README.md` + [DOC_HUB.md](./DOC_HUB.md).

**CI:** `legacy-ru-path` status in [DOC_SYNC_MATRIX.md](./DOC_SYNC_MATRIX.md) — ratio N/A; minimum EN line counts in `check-docs-i18n-depth.mjs`.

**Maintainers:** after expanding EN, run `npm run check:docs-i18n:all`.
