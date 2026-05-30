# Глоссарий SDK (RU)

**Genetic tag:** `repo.platform.sdk.docs_i18n.gen1`  
**EN:** [GLOSSARY.md](./GLOSSARY.md)

| Термин | Определение |
|--------|-------------|
| **интегратор** | Потребитель SDK по умолчанию (`integrator`). Без `sdk.admin`. |
| **оператор платформы** | Monorepo / ops (`platform_operator`). |
| **контекст проекта** | `projectId`, `X-Project-ID`. [PROJECT_CONTEXT_ru.md](./PROJECT_CONTEXT_ru.md). |
| **sdk.platform** | Стабильный срез для AI: auth, api, dna, protocol, … |
| **sdk.protocol** | То же, что `sdk.platform.protocol`. |
| **AgentProtocol** | REST + 8DNA + command bus + snapshots. |
| **8DNA** | Таблицы genetic data. Не тикер токена. |
| **AGNT** | Единица AgentNet (L0 ledger). |
| **agUSD** | Привязка к USD (v1). |
| **protein-команда** | Составной read через protein bus (`sdk.protein` legacy). |
| **protocol-команда** | Предпочтительно: `executeCommand`. |
| **снапшот** | JSON-кэш; `invalidateSnapshotPrefix`. |
| **каталог модулей** | `getModuleCatalog()`. |
| **матрица возможностей** | `getCapabilityMatrix()`. |
| **DNA-таблица** | `sdk.platform.dna`, `data_*_8dna`. |
| **integrator scope** | Без admin API на npm по умолчанию. |
| **production API** | `https://agentstack.tech/api`. |
| **SDKProvider** | Корень React. `AgentStackProvider` — алиас. |
| **useSDK** | Хук клиента SDK. |
| **useSDKQuery** | React Query + SDK. |
| **submodule** | `vendor/agentstack-sdk` + `sdk.lock.json`. |
| **зеркало** | `agentstacktech/agentstack-sdk`. |
| **file: зависимость** | Ссылка на `packages/core`. |
| **sdkAudience** | `integrator` или `platform_operator`. |
| **commerce** | `sdk.commerce` — shop, cart, checkout. |
| **capability task** | `@agentstack/sdk/capability-tasks`. |
| **MCP** | `https://agentstack.tech/mcp`. |
| **OpTrace** | Корреляция / телеметрия. |
| **LineageRegistry** | Lineage on-chain (не отдельный тикер). |
| **AgentNetTimelock** | Governance v1. |
| **legacy-ru-path** | EN: `README.en.md`, RU: длинный `README.md`. |
| **balanced** | Ratio 0.6–1.4 в [DOC_SYNC_MATRIX.md](./DOC_SYNC_MATRIX.md). |
| **Diátaxis** | tutorial · how-to · reference · explanation. |
| **genetic tag** | Адрес в `docs/AI_NAVIGATION_MAP.md`. |

Термины согласованы с английским глоссарием.
