# Матрица ошибок для AI

**Genetic tag:** `repo.platform.sdk.ai_app_factory.gen1`  
**EN:** [AI_ERROR_ACTION_MATRIX.md](./AI_ERROR_ACTION_MATRIX.md)

| Сигнал | Действие агента |
|--------|-----------------|
| HTTP 401 | `sdk.platform.auth.login` или обновить токен |
| HTTP 403 | Проверить RBAC; заголовок `projectId` / `X-Project-ID` |
| `module_disabled:{id}` | `sdk.getCapabilityMatrix()` — не вызывать domain |
| `unknown_task_capability_port:{id}` | `registerTaskCapabilityPort` или id из `getModuleCatalog().tasks` |
| Commerce mapped errors | `mapCommerceHttpError` — retry только идемпотентный checkout |
| Network / offline | `probeAgentStackConnection(sdk)` — unified connection doc |
| Zod manifest failure | Исправить JSON по `appManifestSchema` до POST |

Не повторять 4xx, кроме 429 (rate limit) с backoff.
