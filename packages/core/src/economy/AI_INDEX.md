# AI Index — SDK Economy (`sdk.economy.gen1`)

**Genetic tag:** `sdk.economy.gen1`  
**Parent:** [agentstack-unified-sdk/AI_INDEX.md](../../../AI_INDEX.md)

## 5-minute path

1. `sdk.platform.economy` or `sdk.economy` on `AgentStackSDK`
2. Paid run: `economyPaidAgentRunRecipe(sdk, { projectId, agentId, buyerUserId, creditsAtomic, input })`
3. Cookbook: [docs/sdk/AGENTNET_ECONOMY_INTEGRATOR_COOKBOOK.md](../../../../docs/sdk/AGENTNET_ECONOMY_INTEGRATOR_COOKBOOK.md)

## Hot files

| Path | Role |
|------|------|
| `AgentEconomyFacade.ts` | Facade + `forProject` |
| `ProjectEconomyScope.ts` | Project-scoped billing / paidRun |
| `clients/LedgerClient.ts` | All `/api/agentnet/{id}/*` REST |
| `sessions/BillingSession.ts` | Quote TTL + purchase |
| `sessions/PaidAgentRunFlow.ts` | Orchestrated paid run |
| `sessions/RunBillingWatcher.ts` | Poll run until terminal |
| `sessions/ReceiptVerifier.ts` | Receipt + Merkle verify |
| `recipes/index.ts` | AI copy-paste recipes |
| `errors/EconomyError.ts` | Typed error codes |
| `workingSet/WorkingSetClient.ts` | Tier W drafts (`/api/agentnet/working-set`) |

**Not in this tree:** `/api/admin/agentnet/*` → `sdk.admin` (`modules/AgentAdmin.ts`), platform-operator only. Python: `sdk.agentnet_admin` (`packages/python/src/modules/agentnet_admin.py`). CI: `npm run check:economy-parity` in `packages/core`.

## Sideways

- Backend: `agentstack-core/services/agentcoin/`, `endpoints/agentcoin_endpoints.py`
- MCP: `mcp/tools_agentcoin.py`
- Genes: `core.economy.agentnet.gen1`, `core.agents.fleet.gen1`
