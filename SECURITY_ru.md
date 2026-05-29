# Политика безопасности

**EN:** [SECURITY.md](./SECURITY.md)

## Поддерживаемые версии

Исправления для текущей линии платформы (`AGENTSTACK_CORE_VERSION` в monorepo).

## Сообщить об уязвимости

Приватно:

- https://github.com/agentstacktech/agentstack-sdk/security/advisories
- Не создавайте публичные issues для эксплуатируемых уязвимостей.

## Секреты

Не коммитьте API keys / JWT. Используйте `AGENTSTACK_API_BASE`, `sdk.platform.auth.login`.
