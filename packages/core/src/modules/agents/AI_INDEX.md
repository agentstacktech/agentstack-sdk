# AI_INDEX — sdk.agents

**Genetic tag:** `sdk.agents.gen1`

## Read first

- [AgentsFleet.ts](AgentsFleet.ts)
- [docs/adr/AGENTS_FLEET_ARCHITECTURE.md](../../../../docs/adr/AGENTS_FLEET_ARCHITECTURE.md)

## Hot files

- `AgentsFleet.ts` — REST facade for `/api/projects/{id}/agents/*` and `/api/users/me/agents/*`
- **UI V2 helpers:** `listLlmProviders()`, `listFapTemplates()`, `previewPolicy` / `previewPolicyMine`, `previewTemplate` / `previewTemplateMine`, `updateSpecPatch` / `updateSpecPatchMine` (client `mergeAgentSpec` + GET + PUT)
- `forProject(id)` — chained helpers including `previewPolicy`, `previewTemplate`, `updateSpecPatch`
