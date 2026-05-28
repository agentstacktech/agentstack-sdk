# AI error action matrix

**Genetic tag:** `repo.platform.sdk.ai_app_factory.gen1`

| Signal | Agent action |
|--------|----------------|
| HTTP 401 | `sdk.platform.auth.login` or refresh token |
| HTTP 403 | Check RBAC; verify `projectId` header |
| `module_disabled:{id}` | Read `sdk.getCapabilityMatrix()` — do not call domain |
| `unknown_task_capability_port:{id}` | `registerTaskCapabilityPort` or pick from `getModuleCatalog().tasks` |
| Commerce mapped errors | Use `mapCommerceHttpError` — retry idempotent checkout only |
| Network / offline | `probeAgentStackConnection(sdk)` — see SDK unified connection doc |
| Zod manifest failure | Fix JSON against `appManifestSchema` before POST |

Do not retry 4xx except 429 (rate limit) with backoff.
