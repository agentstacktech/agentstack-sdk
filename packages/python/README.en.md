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

## Parity

See monorepo [PYTHON_SDK_PARITY.md](https://github.com/agentstacktech/AgentStack/blob/master/docs/ecosystem/PYTHON_SDK_PARITY.md).

Integration flows: [SDK_INTEGRATION_FLOWS.md](../../docs/SDK_INTEGRATION_FLOWS.md) (flow **G**).

Full Russian guide: [README.md](README.md).
