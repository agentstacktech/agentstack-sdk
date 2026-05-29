# Submodule consumer quick reference

**Genetic tag:** `repo.platform.sdk.submodule.gen1`

Vendoring `@agentstack/sdk` via git submodule instead of npm.  
**All SDK install paths:** [SDK_INTEGRATION_FLOWS.md](./SDK_INTEGRATION_FLOWS.md) (flow **B**).

## Scripts (in this repo)

| Script | Purpose |
|--------|---------|
| `scripts/submodule-add-sdk.mjs` | `git submodule add` + write `sdk.lock.json` |
| `scripts/link-sdk-deps.mjs` | Set `file:` deps in your `package.json` |
| `scripts/doctor-sdk-submodule.mjs` | Drift + dist check |
| `scripts/bootstrap-submodule-consumer.mjs` | All of the above |

Run from **your app repo root** (pass `--target .`). After the submodule exists, scripts live at `vendor/agentstack-sdk/scripts/…`.

## Default layout

```
your-app/
  vendor/agentstack-sdk/    # submodule → agentstacktech/agentstack-sdk
  sdk.lock.json
  package.json              # "@agentstack/sdk": "file:vendor/.../packages/core"
```

Full guide (monorepo canonical): [docs/sdk/SDK_SUBMODULE_INTEGRATION.md](../../docs/sdk/SDK_SUBMODULE_INTEGRATION.md)

## Example `.gitmodules`

See [`.gitmodules.example`](../.gitmodules.example).
