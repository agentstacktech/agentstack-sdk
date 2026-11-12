# @agentstack/netplay

**Генетический тег:** `sdk.netplay.gen1` · EN (канон): [README.md](README.md) · Агентам: [AGENTS.md](AGENTS.md)

Игро-независимый мультиплеер для детерминированных игр. Правила пишутся один раз чистыми функциями
(`defineGame`), а netplay даёт комнаты, лобби, места, ready/реванш, таймауты, зрителей, реконнект,
сидированный RNG, детект рассинхрона и генератор StackScript-скрипта комнаты.

**Идея:** комната — упорядоченный сервером журнал маленьких JSON-записей. Каждый клиент сворачивает
один и тот же журнал одной чистой функцией и получает одинаковые лобби, места и состояние игры.
Сервер только упорядочивает записи и ставит кто/когда — игровой логики на сервере нет.

| Режим | Для чего | Как движется состояние |
|-------|----------|------------------------|
| `lockstep` | реалтайм и одновременные ходы | `step(state, inputs[])`, когда известны входы всех мест; `secret: true` — commit–reveal |
| `fold` | гонки, асинхронные доски, открытые пошаговые игры | `apply(state, seat, cmd)` в порядке журнала |
| `authority` | скрытая информация (карты, туман) | `apply` выполняет только место 0; остальные получают приватный `view(state, seat)` |

## Быстрый старт (5 минут)

См. код в [README.md](README.md#5-minute-quickstart): `defineGame` → транспорт (`memoryHub` для тестов,
`stackscriptTransport` для AgentStack) → `createSession(...).join()` → `subscribe`/`input`/`rematch`.
Тесты: `createTable` из `@agentstack/netplay/testing`; сгенерированный скрипт комнаты прогоняется в
памяти через `loadRoomScript` + `scriptServer`.

## Что внутри

Лобби и места · несколько игроков на одном устройстве вместе с удалёнными (`locals`, `inputs([...])`) · таймауты (`presenceMs`, `turnMs`) · реванш · реконнект с `afterSeq` и exactly-once (счётчик отправителя `n`, ретраи безопасны) · `clock`/`clockMs` для таймеров в `fold`/`authority` · хэши состояния и
`snapshot.desync` · `ctx.rng`/`deriveSeed` · анти-чит (повторная валидация `input()` у всех,
commit–reveal, приватные `view` в `authority`) · input delay и `confirmed(tick)` для своего цикла.
Команды и несколько победителей (`winners: [0, 2]`, полоса матча с `team`/`teamName`) · команды зрителей —
ставки, болельщики, голосования (`GameDef.audience`, `session.audience(v)`) · фоновая вкладка
(`session.away(hidden)`, `bindVisibility(session)`): комната сразу перестаёт ждать скрытую вкладку.

## AgentStack

Раннер — клиент из основного SDK: `new AgentStackSDK({...}).stackscript(projectId, { hostedMcp: true })`
(для игроков на hosted-странице; без `hostedMcp` — с API-ключом для агентов/серверов). Скрипт комнаты:
`generateRoomScript(game, { prefix })` или `npm run gen:room -- <id> <min> <max>`; публикация — только инструментами платформы.
