# AI Index — React Commerce Hooks (`sdk.react.commerce.gen1`)

**Genetic tag:** `sdk.react.commerce.gen1`  
**Parent:** [agentstack-unified-sdk/AI_INDEX.md](../../../../AI_INDEX.md)

TanStack Query hooks wrapping `sdk.commerce` for React apps.

## Hot files

| Path | Role |
|------|------|
| `commerceQueryKeys.ts` | Stable query keys: cart, storefront, checkout, seller activation |
| `embeds/BuyButton.tsx` | Headless buy CTA with optional overlay bridge |
| `embeds/CartButton.tsx` | Cart drawer / path launcher |
| `embeds/ProductGridEmbed.tsx` | Scoped listing grid |
| `embeds/MiniShop.tsx` | Compact project vitrine section |
| `embeds/ProductQuickView.tsx` | Inline PDP panel |
| `../hooks/useCheckout.ts` | Session create/confirm/poll |
| `../hooks/useCommerceWallet.ts` | Wallet balance for checkout |
| `../hooks/useSellerActivation.ts` | `activate_selling` mutation |

## Import

```typescript
import { commerceKeys } from '@agentstack/react/commerce';
```

## Sideways

- Core facade: `sdk.commerce.facade.gen1` — `CommerceFacade.ts`
- Frontend shop: `frontend.commerce.shop.gen1`
- ADR: [COMMERCE_MONEY_LOOP.md](../../../../docs/adr/COMMERCE_MONEY_LOOP.md)
