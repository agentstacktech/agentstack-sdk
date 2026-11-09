# commerce/settlement — AI Index

**Genetic code:** `sdk.commerce.settlement.gen1`

| File | Role |
|------|------|
| `walletCredit.ts` | `isPaymentWalletCredited`, `isWalletCreditOk` — ledger receipt SoT |
| `pollWalletCredit.ts` | `pollUntilWalletCredit` — shared poll loop for top-up + widgets |
| `index.ts` | Public exports for `@agentstack/sdk/commerce/settlement` |

**Rule:** Provider `status=completed` is not spendable until `wallet_credit=ok` (L0 personal or L2 treasury). Embed hosts must poll `payments.get` or checkout session until credited.

**Consumers:** `commerceTopUpRecipe`, `CheckoutClient.pollUntilTerminal` (+ `returnLastOnTimeout`), SPA `waitForWalletCredit`, widget `paymentReceipt.ts`, embed `commerce.surface.complete` with `wallet_credit=ok`.
