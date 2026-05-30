# Documentation style gap audit (RU legacy → EN canonical)



**Genetic tag:** `repo.platform.sdk.docs_i18n.gen1`  

**RU:** [DOC_STYLE_GAP_ru.md](./DOC_STYLE_GAP_ru.md)



Goal: EN ≈ **95%** of RU README depth (structure, emoji, verified examples). Full line parity with 1100-line RU `packages/core/README.md` is not required — EN stays maintainable and integrator-safe (`sdk.platform.*`, no fictional APIs).



| EN path | RU path | Coverage (lines) | Notes |

|---------|---------|------------------|-------|

| `README.en.md` | `README.md` | **~95%** | Package index, integration flows |

| `packages/core/README.en.md` | `packages/core/README.md` | **~95%** | Wallets CRUD, SDK events, retry |

| `packages/react/README.en.md` | `packages/react/README.md` | **~98%** | Near parity |

| `packages/hooks/README.en.md` | `packages/hooks/README.md` | **~97%** | Near parity |

| `packages/python/README.en.md` | `packages/python/README.md` | **~95%** | id_mapper, docs, analytics parity note |

| `docs/MODULAR_ARCHITECTURE.md` | `*_ru.md` | **~95%** | Design principles block |

| `docs/PROTEIN_SYSTEM_GUIDE.md` | `*_ru.md` | **~95%** | Best practices, API reference |



**CI:** `legacy-ru-path` + `check-docs-i18n-depth.mjs` minimums (~95% of RU).



**Verify:** `npm run check:docs-i18n:all` (includes `check:docs-sdk-method-calls` — `sdk.<module>.<method>` in EN fences vs `Agent*` sources; `check:docs-api-symbols` + `check:docs-legacy-ru-api` for removed fiction).



**Legacy cleanup:** `check:docs-legacy-ru-api` on package READMEs + `docs/*_ru.md` (scheduler `runTask`, payments `updatePayment`, neural `setCache`, `getUser`, Python `sdk.platform`, …); meta: [archive/README.md](./archive/README.md).

**Last updated:** 2026-05-28 — API-aligned examples + method-call CI.
