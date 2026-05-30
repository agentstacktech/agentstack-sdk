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
        neural={
            "cache": {"enabled": True, "ttl": 300},
            "events": {"enabled": True},
        },
    )
    sdk = AgentStackSDK(config)

    try:
        await sdk.auth.login("user@example.com", "password")
        projects = await sdk.api.get("/projects")
        payment = await sdk.payments.create_payment({
            "amount": 1000,
            "currency": "USD",
            "project_id": 1,
        })
        await sdk.neural.cache.set("session:1", {"ok": True})
        value = await sdk.neural.cache.get("session:1")
    finally:
        await sdk.http_client.close()

asyncio.run(main())
```

**Local Core:** `export AGENTSTACK_API_BASE=http://localhost:8000/api`

---

## 🏗️ Modular architecture

### In-process ID mapper (optional)

When running beside AgentStack core with `shared` on `PYTHONPATH`:

```python
from agentstack_sdk.id_mapper import (
    get_project_db_id,
    get_user_db_id,
    set_project,
    reload_all,
    stats,
)

get_project_db_id(logical_id)
await set_project(logical_id, db_id)
await reload_all()
print(stats())
```

No network API — in-process only for cheap logical→DB ID mapping.

### Modules

| Module | Role |
|--------|------|
| `sdk.auth` | Login, profile |
| `sdk.platform.api` | Projects |
| `sdk.payments` | Payments |
| `sdk.analytics` | Events & metrics (subset) |
| `sdk.webhooks` | Webhooks (subset) |
| `sdk.scheduler` | Scheduled tasks (subset) |
| `sdk.neural` | Cache / events (partial) |

**Platform operator:** `AgentAdmin` — monorepo only; [INTEGRATOR_SCOPE](../../docs/INTEGRATOR_SCOPE.md).

---

## 🔐 AgentAuth

```python
await sdk.auth.login("user@example.com", "password")
profile = await sdk.auth.get_profile()

api_key = await sdk.auth.create_api_key(
    name="CI key",
    project_id=1,
    scopes=["read", "write"],
)
```

---

## 💳 AgentPayments

```python
methods = await sdk.payments.get_payment_methods()
payment = await sdk.payments.create_payment({
    "amount": 1000,
    "currency": "USD",
    "description": "Order",
    "project_id": 1,
})
status = await sdk.payments.get_payment_status(payment["id"])
```

---

## 📊 AgentAnalytics

```python
metrics = await sdk.analytics.get_dashboard_metrics(project_id="1", period="7d")
stats = await sdk.analytics.get_payment_stats(period="30d")
```

Full event tracking is available in `@agentstack/sdk` (TypeScript); Python parity is partial — see [PYTHON_SDK_PARITY.md](https://github.com/agentstacktech/AgentStack/blob/master/docs/ecosystem/PYTHON_SDK_PARITY.md).

---

## 🔗 AgentWebhooks

```python
webhook = await sdk.webhooks.create_webhook(
    url="https://example.com/hook",
    events=["payment.completed"],
)
await sdk.webhooks.test_webhook(webhook["id"])
```

---

## ⏰ AgentScheduler

```python
task = await sdk.scheduler.create_task(
    name="Daily report",
    task_type="http_request",
    schedule="0 0 * * *",
)
await sdk.scheduler.run_task(task["id"])
```

---

## 🧠 AgentNeural

```python
await sdk.neural.cache.set("product:1", {"name": "Product A"}, ttl=3600)
product = await sdk.neural.cache.get("product:1")
await sdk.neural.events.emit("user_activity", {"action": "login"})
```

---

## 📚 AgentDocs (subset)

```python
help_text = await sdk.docs.get_help("auth")
results = await sdk.docs.search("webhook")
examples = await sdk.docs.get_code_examples(language="python", category="payments")
```

---

## ⚙️ Configuration

```python
from agentstack import AgentStackSDK, SDKConfig

sdk = AgentStackSDK(
    api_base="https://agentstack.tech/api",
    api_key="your_api_key",
    project_id=1,
    timeout=30,
    retry_attempts=3,
    enable_caching=True,
    enable_metrics=True,
    neural={
        "cache": {"enabled": True, "ttl": 300, "max_size": 1000},
        "events": {"enabled": True, "buffer_size": 10000},
    },
    retry={"attempts": 3, "delay": 1000, "backoff": "exponential"},
    cache={"enabled": True, "ttl": 300},
    logging={"level": "info", "enabled": True},
)
```

Local development:

```python
sdk = AgentStackSDK(api_base="http://localhost:8000/api", api_key="dev-key", project_id=1)
```

---

## 🔄 Error handling

```python
from aiohttp import ClientResponseError

try:
    await sdk.auth.login("user@example.com", "wrong_password")
except ClientResponseError as e:
    print(f"HTTP {e.status}: {e.message}")
except Exception as e:
    print(f"Unexpected: {e}")
```

Retry transient 5xx responses in your service layer with exponential backoff.

---

## 🔧 Utilities

```python
healthy = await sdk.health_check()
status = await sdk.get_status()
metrics = await sdk.get_metrics()
await sdk.clear_cache()
```

---

## 📝 Requirements

- Python 3.8+
- aiohttp 3.8.0+
- asyncio (stdlib)
- python-dateutil 2.8.0+ (when parsing SDK timestamps in apps)

Install: `pip install agentstack-sdk` (see [PyPI](https://pypi.org/project/agentstack-sdk/) when published).

Async usage: create one `AgentStackSDK` per process and reuse it across `await` calls; close the client on shutdown if your wrapper exposes `close()`.

---

## 📚 Parity & docs

- [PYTHON_SDK_PARITY.md](https://github.com/agentstacktech/AgentStack/blob/master/docs/ecosystem/PYTHON_SDK_PARITY.md)
- [SDK_INTEGRATION_FLOWS.md](../../docs/SDK_INTEGRATION_FLOWS.md) (flow **F**)
- [AGENTS.md](../../AGENTS.md)
- [docs/DOC_HUB.md](../../docs/DOC_HUB.md)
- [OpenAPI](https://agentstack.tech/swagger)

## 🤝 Support

- Platform: https://agentstack.tech
- [GitHub Issues](https://github.com/agentstacktech/agentstack-sdk/issues)
- [PYTHON_SDK_PARITY.md](https://github.com/agentstacktech/AgentStack/blob/master/docs/ecosystem/PYTHON_SDK_PARITY.md)

## 📄 License

MIT

**Russian extended README:** [README.md](README.md).
