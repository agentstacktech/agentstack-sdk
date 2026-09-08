# AI_INDEX — sdk.agents

**Genetic tag:** `sdk.agents.gen1`

## Read first

- [AgentsFleet.ts](AgentsFleet.ts)
- [docs/adr/AGENTS_FLEET_ARCHITECTURE.md](../../../../../../docs/adr/AGENTS_FLEET_ARCHITECTURE.md)
- [docs/adr/AGENTS_UI_RUNTIME_RENAISSANCE.md](../../../../../../docs/adr/AGENTS_UI_RUNTIME_RENAISSANCE.md)

## Hot files

- `AgentsFleet.ts` — REST facade for `/api/projects/{id}/agents/*` and `/api/users/me/agents/*`
- **UI V2 helpers:** `listLlmProviders()`, `listFapTemplates()`, `previewPolicy` / `previewPolicyMine`, `previewTemplate` / `previewTemplateMine`, `updateSpecPatch` / `updateSpecPatchMine` (client `mergeAgentSpec` + GET + PUT)
- **Parity:** Python `AgentAgentsFleet` + `agent_agents_types.py` (SDK-PY-03 run helpers). Full Pydantic models remain optional.
- `forProject(id)` — chained helpers including `previewPolicy`, `previewTemplate`, `updateSpecPatch`
