# SDK commerce/hosted — AI Index

**Genetic tag:** `sdk.commerce.hosted.gen1`

Universal hosted commerce runtime for **any** tenant `/s/{pid}/` surface (showcase archetypes are one consumer).

| File | Role |
|------|------|
| `sessionVault.ts` | `vertical:token` session vault — no global `localStorage.access_token` |
| `projectContext.ts` | Resolve tenant PID from URL / boot manifest |
| `requestHeaders.ts` | `Authorization` + `X-Project-ID` + CSRF for fetch |
| `listings.ts` | `loadHostedListings` + `mapHostedListingRow` (uses `offerRow` SoT) |
| `checkoutIntent.ts` | `createHostedCheckoutIntent` → `/api/commerce/intents` (`navigate?: boolean`) |
| `sessionProbe.ts` | `probeHostedSession` → `GET /api/auth/me` with vault headers |

**Import:** `@agentstack/sdk/commerce/hosted`

**Pairs with:** `frontend.commerce.hosted_storefront.gen1` · `hosted-sdk-cdn` `hostedCommerceRuntime.ts` · `hostedWireCore.ts`
