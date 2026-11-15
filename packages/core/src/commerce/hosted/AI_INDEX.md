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
| `hostedAppSession.ts` | `mintHostedAppSession` → `POST /api/hosted-apps/{pid}/session` after REST login |
| `executeHostedMcpSteps.ts` | DRY `POST /s/{pid}/mcp` batch transport (cookie mint, step assert, player errors) |
| `hostedSharedData.ts` | Lane A journal — `readHostedProjectLeaf`, `patchHostedProjectLeafCAS`, `HOSTED_BATCH_PREVIEW_SHA` |
| `hostedMcpPlayerError.ts` | `mapHostedMcpPlayerError` — `error_code` / CAS / prefix / membership UX copy |

**Import:** `@agentstack/sdk/commerce/hosted` · batch helpers `@agentstack/sdk` → `mcp/batchStepData`

**Games MP:** `stackscript/matchClient.ts` hosted reads route through `executeHostedMcpSteps` (`projects.get_my_data`); shared lobby journal → `patchHostedProjectLeafCAS`.

**Pairs with:** `frontend.commerce.hosted_storefront.gen1` · `hosted-sdk-cdn` `hostedCommerceRuntime.ts` · `hostedWireCore.ts`
