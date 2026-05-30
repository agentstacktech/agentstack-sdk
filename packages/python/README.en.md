# AgentStack SDK for Python (`agentstack-sdk`)

**Languages:** **English** (pip readme) · [Русский extended reference](README.md)

Async Python client for AgentStack API. TypeScript SDK is the reference for AI agents and the full surface area.

---

## 📦 Install

```bash
pip install agentstack-sdk
```

---

## 🚀 Quick start

```python
import asyncio
from agentstack_sdk import AgentStackSDK, SDKConfig

async def main():
    config = SDKConfig(
        api_base="https://agentstack.tech/api",
        api_key="your_api_key",
        project_id=1,
    )
    sdk = AgentStackSDK(config)
    await sdk.auth.login("user@example.com", "password")
    projects = await sdk.platform.api.get_projects()
    print(projects)

asyncio.run(main())
```

**Local Core:**

```bash
export AGENTSTACK_API_BASE=http://localhost:8000/api
```

---

## 🏗️ Modules (subset)

| Python | TypeScript equivalent |
|--------|----------------------|
| `sdk.auth` | `sdk.platform.auth` |
| `sdk.platform.api` | `sdk.platform.api` |
| DNA helpers | `sdk.platform.dna` (partial) |
| Neural cache | `sdk.neural` (partial) |

---

## ⚙️ Configuration

```python
config = SDKConfig(
    api_base="https://agentstack.tech/api",
    api_key="your_api_key",
    project_id=1,
    timeout=30,
)
```

---

## 🧠 Neural cache (when enabled)

```python
await sdk.neural.cache.set("key", {"ok": True}, ttl=300)
value = await sdk.neural.cache.get("key")
```

---

## 🔄 Error handling

Catch SDK exceptions; retry transient HTTP errors in your service layer. Map failures using the monorepo [AI_ERROR_ACTION_MATRIX](https://github.com/agentstacktech/AgentStack/blob/master/docs/AI_ERROR_ACTION_MATRIX.md).

---

## 📚 Parity & docs

- [PYTHON_SDK_PARITY.md](https://github.com/agentstacktech/AgentStack/blob/master/docs/ecosystem/PYTHON_SDK_PARITY.md)
- [SDK_INTEGRATION_FLOWS.md](../../docs/SDK_INTEGRATION_FLOWS.md) (flow **F**)
- [AGENTS.md](../../AGENTS.md)
- [docs/DOC_HUB.md](../../docs/DOC_HUB.md)
- [OpenAPI](https://agentstack.tech/swagger)

**Russian extended README:** [README.md](README.md).
