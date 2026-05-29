# Submodule — краткая справка для потребителя

**Genetic tag:** `repo.platform.sdk.submodule.gen1`  
**EN:** [SUBMODULE_CONSUMER.md](./SUBMODULE_CONSUMER.md)

Вендоринг `@agentstack/sdk` через git submodule вместо npm.  
**Все пути установки:** [SDK_INTEGRATION_FLOWS_ru.md](./SDK_INTEGRATION_FLOWS_ru.md) (поток **B**).

## Скрипты (в этом репозитории)

| Скрипт | Назначение |
|--------|------------|
| `scripts/submodule-add-sdk.mjs` | `git submodule add` + `sdk.lock.json` |
| `scripts/link-sdk-deps.mjs` | `file:` в `package.json` приложения |
| `scripts/doctor-sdk-submodule.mjs` | Drift + проверка `dist` |
| `scripts/bootstrap-submodule-consumer.mjs` | Всё сразу |

Запуск из **корня вашего app** (`--target .`). После submodule скрипты лежат в `vendor/agentstack-sdk/scripts/…`.

## Типовая структура

```
your-app/
  vendor/agentstack-sdk/    # submodule → agentstacktech/agentstack-sdk
  sdk.lock.json
  package.json              # "@agentstack/sdk": "file:vendor/.../packages/core"
```

Полный гайд (monorepo): [docs/sdk/SDK_SUBMODULE_INTEGRATION.md](../../docs/sdk/SDK_SUBMODULE_INTEGRATION.md)

## Пример `.gitmodules`

См. [`.gitmodules.example`](../.gitmodules.example).
