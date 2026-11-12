# @agentstack/netplay — AI index

**Genetic tag:** `sdk.netplay.gen1`  
**Package:** `@agentstack/netplay` (exports `.`, `./testing`) · optional peer `@agentstack/sdk` (StackScript client)

## Hot files

| Path | Role |
|------|------|
| [src/index.ts](src/index.ts) | public barrel |
| [src/types.ts](src/types.ts) | `GameDef`, wire `Body`, `Snapshot`, `Transport` |
| [src/room.ts](src/room.ts) | pure room reducer (SoT for lobby/phase/timeouts/state) |
| [src/session.ts](src/session.ts) | client session |
| [src/generator/roomScript.ts](src/generator/roomScript.ts) | StackScript room referee generator (`sdk.netplay.room.gen1`) |
| [src/testing/index.ts](src/testing/index.ts) | `createTable` e2e harness |
| [src/lobby.ts](src/lobby.ts) | room codes, invite links, headless `createLobby` |
| [src/ui/lobby.ts](src/ui/lobby.ts) | optional DOM `mountLobby` (`/ui` entry) |

## Docs

[README.md](README.md) (quickstart) · [API.md](API.md) (every signature/default) · [README_ru.md](README_ru.md) · [AGENTS.md](AGENTS.md) (agent recipe, do/don't) · examples [tic-tac-toe](examples/tic-tac-toe.ts), [tug-of-war](examples/tug-of-war.ts) · recipe test [test/recipe.test.ts](test/recipe.test.ts)

## Sideways

- Parent SDK: [../../AI_INDEX.md](../../AI_INDEX.md) · [../../AGENTS.md](../../AGENTS.md)
- StackScript client used as transport: `sdk.stackscript(projectId, { hostedMcp? })` (`packages/core/src/stackscript/client.ts`)
