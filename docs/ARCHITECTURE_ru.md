# Архитектура SDK

**Genetic tag:** `repo.platform.sdk.unified.gen1`  
**EN:** [ARCHITECTURE.md](./ARCHITECTURE.md)

Слои SDK для интеграторов, React и AI-агентов.

---

## Слои

1. **AI plane** — `getModuleCatalog`, манифесты, capability tasks  
2. **Фасады** — `sdk.platform`, `sdk.protocol`, `sdk.commerce`  
3. **Домены** — `modules/*`, `economy/`, `commerce/`  
4. **Транспорт** — `HTTPClient`, optrace, relay  
5. **UI** — `@agentstack/react`, `@agentstack/hooks`

---

## Паттерны

- **Facade** — стабильный `sdk.platform`  
- **SRP** — модуль на домен  
- **DIP** — зависимость от `HTTPClient`  
- **DRY** — общие URL в config  

---

## Пакеты

| Пакет | Роль |
|-------|------|
| `@agentstack/sdk` | Ядро, protocol, DNA |
| `@agentstack/react` | `SDKProvider`, React Query |
| `@agentstack/hooks` | Хуки без UI |
| Python SDK | Подмножество для backend |

---

## Discovery

1. `getModuleCatalog()`  
2. `getCapabilityMatrix()`  
3. Вызов через `sdk.platform.*`  

См. [SDK_MODULE_CATALOG_ru.md](./SDK_MODULE_CATALOG_ru.md) · [SDK_AI_SURFACE_ru.md](../../docs/SDK_AI_SURFACE_ru.md).

---

## Связанные документы

[MODULAR_ARCHITECTURE_ru.md](./MODULAR_ARCHITECTURE_ru.md) · [PROTEIN_SYSTEM_GUIDE_ru.md](./PROTEIN_SYSTEM_GUIDE_ru.md) · [AI_INDEX_ru.md](../AI_INDEX_ru.md)
