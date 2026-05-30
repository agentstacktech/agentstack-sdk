# SDK glossary (EN)

**Genetic tag:** `repo.platform.sdk.docs_i18n.gen1`  
**RU:** [GLOSSARY_ru.md](./GLOSSARY_ru.md)

| Term | Definition |
|------|------------|
| **integrator** | Default SDK consumer (`sdkAudience: integrator`). Tenant apps on AgentStack. No `sdk.admin`. |
| **platform operator** | AgentStack ops / monorepo SPA (`sdkAudience: platform_operator`). May use admin surfaces. |
| **project scope** | Active `projectId` / `X-Project-ID` for tenant APIs. See [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md). |
| **8DNA** | Platform genetic data tables (`data_*_8dna`). Not a fungible token ticker. |
| **AGNT / agUSD** | AgentNet economy units (v1). See monorepo economy docs. |
| **protein command** | High-level composed read via `sdk.protein` / legacy protein API. |
| **protocol** | Preferred command bus: `sdk.platform.protocol` (`executeCommand`, snapshots). |
| **module catalog** | `sdk.getModuleCatalog()` — discover modules before calling APIs. |
| **capability matrix** | `sdk.getCapabilityMatrix()` — skip disabled domains. |
| **AgentProtocol** | REST + DNA + commands + snapshots. Spec: monorepo `docs/AGENT_PROTOCOL_QUICKSTART.md`. |
| **production API base** | `https://agentstack.tech/api` via `resolveAgentStackApiBase()`. |
| **SDKProvider** | React provider from `@agentstack/react` (integrator docs). `AgentStackProvider` is an alias. |

Use these terms consistently in all EN/RU doc pairs.
