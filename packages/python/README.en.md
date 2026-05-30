# AgentStack SDK for Python (`agentstack-sdk`)

**Languages:** **English** (this file) · [Русский](README.md)

Modular Python client for AgentStack API. TypeScript SDK is the reference for AI agents today.

## Install

```bash
pip install agentstack-sdk
```

## Quick start

```python
import asyncio
from agentstack_sdk import AgentStackSDK, SDKConfig

async def main():
    config = SDKConfig(
        api_base="https://agentstack.tech/api",
        api_key="your_api_key",
    )
    sdk = AgentStackSDK(config)
    await sdk.auth.login("user@example.com", "password")
    projects = await sdk.platform.api.get_projects()

asyncio.run(main())
```

## Modules (subset)

| Python | TypeScript equivalent |
|--------|----------------------|
| `sdk.auth` | `sdk.platform.auth` |
| `sdk.platform.api` | `sdk.platform.api` |
| DNA helpers | `sdk.platform.dna` (partial) |

## Parity

[PYTHON_SDK_PARITY.md](https://github.com/agentstacktech/AgentStack/blob/master/docs/ecosystem/PYTHON_SDK_PARITY.md) · RU: [PYTHON_SDK_PARITY_ru.md](https://github.com/agentstacktech/AgentStack/blob/master/docs/ecosystem/PYTHON_SDK_PARITY_ru.md)

Integration flows: [SDK_INTEGRATION_FLOWS.md](../../docs/SDK_INTEGRATION_FLOWS.md) (flow **G**).

## Docs

[AGENTS.md](../../AGENTS.md) · [DOC_HUB.md](../../docs/DOC_HUB.md)

Full Russian guide: [README.md](README.md).
