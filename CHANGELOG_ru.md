# Changelog (RU highlights)

**EN (полный):** [CHANGELOG.md](./CHANGELOG.md)

## [Unreleased]

### Добавлено

- `@agentstack/netplay` проход 4: опрос тихой комнаты — heartbeat'ы и хэш-проверки больше не сбрасывают опрос на полную скорость, `idleMaxMs` для stackscript 1200 → 2000: оба игрока думают в пошаговой игре — 1,03 → 0,53 запроса/с на клиента.
- `@agentstack/netplay`: secret lockstep — ход в `secretStore` хранится, пока комната не прошла этот ход (раньше стирался при постановке в очередь: если раскрытие не успело уйти до перезагрузки, оно терялось и ход ждал таймера).
- `@agentstack/netplay` проход 3 (фузз: обрывы, скрытие, реванш, перезагрузки на fold / realtime / secret / authority): хэш-чекпоинты помечены матчем (перезагрузка после реванша слала хэши матча 1 как матча 2 → ложный рассинхрон); догоняющий клиент шлёт только 2 новейших неотправленных чекпоинта (раньше все → всплеск за лимит запросов, 14 → ≤3 записи в тесте); `memoryHub.disconnect` сообщает клиенту об обрыве (молчащий зритель зависал).
- `@agentstack/netplay`: ход из фоновой вкладки (игра, которая играет и в фоне) возвращает обычную частоту опроса — раньше опрос оставался на `hiddenPollMs`, хотя игрок уже считался вернувшимся.
- `@agentstack/netplay`: `Session.turnLeftMs()` — часы хода без перекоса часов (время лога комнаты + локальное время с момента его получения). `Date.now() − tickStartT` смешивал часы устройства и сервера: устройство со сдвигом в минуту или сервер с t = 0 показывали 0 с и сразу срабатывал автолок.
- `@agentstack/netplay`: фоновая вкладка опрашивает реже — `Link.pace?(ms|null)` (polling-транспорты), `away(true)` замедляет опрос до `SessionOptions.hiddenPollMs` (по умолчанию 3000 мс), при возврате — опрос сразу (батарея, мобильный трафик, лимит запросов комнаты).
- `@agentstack/netplay`: `session.inputAll(cmd)` — одна запись на устройство для всех его мест (отчёт часов на общем столе); генератор комнаты: `maxLog` (по умолчанию 100000, `LOG_FULL`), чанк лога 64 → 16.
- `@agentstack/netplay`: несколько победителей (`Outcome.winners`, команды и общая победа), команды зрителей (`GameDef.audience`, `session.audience`), фоновая вкладка (`session.away`, `bindVisibility`), команды в полосе матча (`team`, `teamName`).

### Исправлено

- StackScript-транспорт: `RETRY` (конфликт CAS комнаты) — пауза с джиттером и новый ключ идемпотентности на каждую попытку (было: 3 мгновенных повтора с тем же ключом).
- Полоса матча: `.np-bar{display:flex}` перебивал `[hidden]`, тихая полоса не пряталась (второй список игроков на телефоне).

## [0.4.18] — 2026-09-08

### Changed

- Выравнивание `@agentstack/sdk`, `@agentstack/react` и `@agentstack/hooks` с платформой **0.4.18** (`sync:agentstack-version`).

## [0.4.13] — 2026-05-28

### Добавлено

- Submodule consumer: скрипты bootstrap, `sdk.lock.json`, [SUBMODULE_CONSUMER_ru.md](docs/SUBMODULE_CONSUMER_ru.md)
- Контекст проекта: `getProjectId`, `updateProjectId`, [PROJECT_CONTEXT_ru.md](docs/PROJECT_CONTEXT_ru.md)
- Integrator scope: `sdkAudience`, guards на admin, [INTEGRATOR_SCOPE_ru.md](docs/INTEGRATOR_SCOPE_ru.md)
- Документация EN/RU: [DOCS_I18N_ru.md](docs/DOCS_I18N_ru.md), `check:docs-i18n:all`
- `AGENTS.md`, AI factory guides, `llms.txt`
- CI: docs-urls, package-exports, api-symbols

### Изменено

- Production API `https://agentstack.tech/api` везде в примерах
- README.en — канон для npm/GitHub; README.md — расширенный RU

См. [CHANGELOG.md](./CHANGELOG.md) для полного списка.
