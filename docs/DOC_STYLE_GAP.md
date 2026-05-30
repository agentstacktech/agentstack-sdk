# Documentation style gap audit (RU legacy → EN canonical)

**Genetic tag:** `repo.platform.sdk.docs_i18n.gen1`  
**RU:** [DOC_STYLE_GAP_ru.md](./DOC_STYLE_GAP_ru.md)

Tracks where **Russian legacy README** is richer than **English canonical** (`README.en.md`). EN now mirrors **structure, emoji section headers, and integrator-safe examples**; full 1100-line core reference stays in RU `README.md` by design.

| EN path | RU path | Lines EN (approx) | Lines RU | Gap type | Status |
|---------|---------|-------------------|----------|----------|--------|
| `README.en.md` | `README.md` | ~520 | ~704 | narrative depth | **Aligned structure**; RU has extra legacy API prose |
| `packages/core/README.en.md` | `packages/core/README.md` | ~360 | ~1106 | per-module reference | **Module guide + emoji**; deep reference = RU only |
| `packages/react/README.en.md` | `packages/react/README.md` | ~320 | ~666 | hooks catalog | **Hooks + components + SSR** |
| `packages/hooks/README.en.md` | `packages/hooks/README.md` | ~170 | ~295 | domain hooks | **AI-first + hook catalog** |
| `packages/python/README.en.md` | `packages/python/README.md` | ~95 | ~269 | examples | **Install + modules + neural** |
| `docs/MODULAR_ARCHITECTURE.md` | `*_ru.md` | ~220 | ~328 | emoji blocks | **Emoji parity + benefits** |
| `docs/PROTEIN_SYSTEM_GUIDE.md` | `*_ru.md` | ~275 | ~495 | legacy protein | EN protocol-first; RU deep legacy |

**Not in scope:** duplicate 1100-line `packages/core/README.md` into EN — npm readme stays navigable; use [DOC_HUB.md](./DOC_HUB.md) + MODULAR + RU README for exhaustive API lists.

**CI:** `legacy-ru-path` in [DOC_SYNC_MATRIX.md](./DOC_SYNC_MATRIX.md); minimum EN line counts in `check-docs-i18n-depth.mjs`.

**Maintainers:** after expanding EN, run `npm run check:docs-i18n:all`.

**Last updated:** 2026-05-28 — EN style pass (emoji headers, RU section parity).
