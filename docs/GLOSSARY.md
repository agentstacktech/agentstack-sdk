# SDK glossary (EN)

**Genetic tag:** `repo.platform.sdk.docs_i18n.gen1`  
**RU:** [GLOSSARY_ru.md](./GLOSSARY_ru.md)

| Term | Definition |
|------|------------|
| **integrator** | Default SDK consumer (`sdkAudience: integrator`). Tenant apps. No `sdk.admin`. |
| **platform operator** | Monorepo SPA / ops (`sdkAudience: platform_operator`). Admin surfaces allowed. |
| **project scope** | `projectId` + `X-Project-ID`. See [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md). |
| **sdk.platform** | Stable AI-facing slice: auth, api, dna, protocol, social, economy, … |
| **sdk.protocol** | Same as `sdk.platform.protocol` — REST + commands + snapshots. |
| **AgentProtocol** | Platform contract: REST + 8DNA + command bus + snapshots. |
| **8DNA** | Genetic data tables (`data_*_8dna`). Not a token ticker. |
| **AGNT** | AgentNet fungible unit (L0 ledger). |
| **agUSD** | AgentNet USD-pegged unit (v1). |
| **protein command** | Composed read model via protein bus (legacy path: `sdk.protein`). |
| **protocol command** | Preferred: `sdk.platform.protocol.executeCommand`. |
| **snapshot** | In-memory JSON cache; invalidate with `invalidateSnapshotPrefix`. |
| **module catalog** | `sdk.getModuleCatalog()` — modules, `accessPaths`, `aiHints`. |
| **capability matrix** | `sdk.getCapabilityMatrix()` — enabled domains. |
| **DNA table** | `sdk.platform.dna` / `DNATableWrapper` for `data_*_8dna`. |
| **integrator scope** | No `/api/admin/*`, no `sdk.admin` on npm default. |
| **production API base** | `https://agentstack.tech/api` — `resolveAgentStackApiBase()`. |
| **SDKProvider** | React root from `@agentstack/react`. `AgentStackProvider` = alias. |
| **useSDK** | Hook returning `AgentStackSDK` inside `SDKProvider`. |
| **useSDKQuery** | React Query read bound to SDK client. |
| **submodule consumer** | Vendor SDK at `vendor/agentstack-sdk` + `sdk.lock.json`. |
| **mirror repo** | Public `agentstacktech/agentstack-sdk` from monorepo subtree. |
| **file: dependency** | `npm` link to `packages/core` for monorepo / submodule. |
| **sdkAudience** | `integrator` (default) or `platform_operator`. |
| **commerce facade** | `sdk.commerce` — shop, cart, checkout, orders. |
| **capability task** | `@agentstack/sdk/capability-tasks` — headless task manifest. |
| **MCP** | `https://agentstack.tech/mcp` — automation surface. |
| **OpTrace** | Correlation / telemetry rings (server + client hooks). |
| **LineageRegistry** | On-chain lineage (not a separate governance ticker). |
| **AgentNetTimelock** | Governance v1 (no second governance fungible). |
| **legacy-ru-path** | EN in `README.en.md`, long RU in `README.md` (i18n exception). |
| **balanced** | EN/RU doc pair line ratio 0.6–1.4 in [DOC_SYNC_MATRIX.md](./DOC_SYNC_MATRIX.md). |
| **Diátaxis** | tutorial · how-to · reference · explanation lanes in [DOC_HUB.md](./DOC_HUB.md). |
| **genetic tag** | `domain.subsystem.role.gen1` — navigation address in monorepo. |

Use these terms consistently in all EN/RU doc pairs.
