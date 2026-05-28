"""
Project support — Python parity stub.

REST: `/api/support/*`
TS SDK: `sdk.support`
See `docs/ecosystem/PYTHON_SDK_PARITY.md`.
"""

from __future__ import annotations

from typing import Any, TYPE_CHECKING

if TYPE_CHECKING:
    from ..client.agent_http import AgentHTTPClient


class AgentSupport:
    __slots__ = ("_http",)

    def __init__(self, http_client: "AgentHTTPClient") -> None:
        self._http = http_client

    async def list_threads_stub(self, _project_id: int) -> dict[str, Any]:
        raise NotImplementedError("AgentSupport — use TS sdk.support or REST")
