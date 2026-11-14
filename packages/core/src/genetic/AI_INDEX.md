# SDK — tenant project genome types

**Genetic tag:** `core.genetic.project_genome.gen1` (wire DTOs; execution on platform)

## Hot files

| Path | Role |
|------|------|
| `projectGenome.ts` | `ProjectGenomeSnapshot`, nodes, edges, meta |
| `getProjectGenomeSnapshot.ts` | REST `GET /projects/:id/genetic/snapshot` |
| `index.ts` | `@agentstack/sdk/genetic` re-exports |

Consumers: hosted apps and SPA may import types only; reads go through REST or MCP on the platform.