# AgentStack SDK for Python (`agentstack-sdk`)

**Languages:** **English** (npm/pip readme) · [Русский extended reference](README.md)

Async Python client for AgentStack API. TypeScript SDK is the reference for AI agents and full surface area.

---

## Install

```bash
pip install agentstack-sdk
```

---

## Quick start

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

Local Core:

```bash
export AGENTSTACK_API_BASE=http://localhost:8000/api
```

---

## Modules (subset)

| Python | TypeScript |
|--------|------------|
| `sdk.auth` | `sdk.platform.auth` |
| `sdk.platform.api` | `sdk.platform.api` |
| DNA helpers | `sdk.platform.dna` (partial) |

---

## Parity & docs

- [PYTHON_SDK_PARITY.md](https://github.com/agentstacktech/AgentStack/blob/master/docs/ecosystem/PYTHON_SDK_PARITY.md)
- [SDK_INTEGRATION_FLOWS.md](../../docs/SDK_INTEGRATION_FLOWS.md) (flow **G**)
- [AGENTS.md](../../AGENTS.md)

---

## Error handling

Catch SDK exceptions; retry transient HTTP errors in your service layer.

---

## Resources

- [docs/DOC_HUB.md](../../docs/DOC_HUB.md)
- [OpenAPI](https://agentstack.tech/swagger)

**Russian extended README:** [README.md](README.md).
