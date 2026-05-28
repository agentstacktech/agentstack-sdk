# AI Index — SDK Commerce Assets (`sdk.commerce.assets.gen1`)

**Genetic tag:** `sdk.commerce.assets.gen1`  
**Parent:** [agentstack-unified-sdk/AI_INDEX.md](../../../../AI_INDEX.md)

## Import

```typescript
import {
  buildAssetsWizardHref,
  validateAssetDraft,
  assetDraftSchema,
} from '@agentstack/sdk/commerce/assets';
```

## Hot files

| Path | Role |
|------|------|
| `schemas.ts` | Zod: `AssetDraft`, presets, wizard steps (parity with frontend lib) |
| `assetsUrlState.ts` | `parseAssetsSearchParams`, `writeAssetsSearchParams` |
| `buildAssetsWizardHref.ts` | Compass / automation deep links |
| `duplicateAsset.ts` | Clone definition via `sdk.assets` |

## REST

- `sdk.assets.listAssetPresets(projectId)` → `GET /api/projects/{id}/asset-presets`
- CRUD: `sdk.assets.createAsset`, `listAssets`, …

## Parity

- CI: `npm run check:commerce-assets-parity` in `packages/core`
- Fixture SoT: `shared/fixtures/asset_presets_v1.json`

## Sideways

- Frontend: `frontend.commerce.assets.wizard.gen1` — UI in `agentstack-frontend/src/modules/assets/`
- ADR: `docs/adr/ASSETS_WIZARD_AND_CARD_STUDIO.md`
