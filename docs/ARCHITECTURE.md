# SDK architecture

**Genetic tag:** `repo.platform.sdk.unified.gen1`

## Layers

1. **AI plane** — `getModuleCatalog`, zod manifests, capability tasks  
2. **Facades** — `sdk.platform`, `sdk.protocol`, `sdk.commerce`  
3. **Domain modules** — `modules/*`, `economy/`, `commerce/`  
4. **Transport** — `HTTPClient`, optrace, relay constants  
5. **Presentation** — `@agentstack/react`, `@agentstack/hooks`

## Patterns

- **Facade** for agent-facing stability (`sdk.platform`)  
- **SRP** per module file  
- **DIP** — modules depend on `HTTPClient`, not fetch  
- **DRY** — `config/agentstackEndpoints.ts` for URLs

See [AI_INDEX.md](../AI_INDEX.md) and [../../docs/SDK_AI_SURFACE.md](../../docs/SDK_AI_SURFACE.md).
