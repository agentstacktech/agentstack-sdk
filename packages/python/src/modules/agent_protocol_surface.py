"""
AgentProtocol facade — Python parity stub.

TS SDK: `sdk.protocol` (REST + commands + snapshots).
See `docs/AGENT_PROTOCOL.md` and `docs/ecosystem/PYTHON_SDK_PARITY.md`.
"""

from __future__ import annotations

from typing import Any, TYPE_CHECKING

if TYPE_CHECKING:
    from ..client.agent_http import AgentHTTPClient


class AgentProtocolSurface:
    __slots__ = ("_http",)

    def __init__(self, http_client: "AgentHTTPClient") -> None:
        self._http = http_client

    async def path_search_stub(self, _needle: str) -> list[dict[str, Any]]:
        raise NotImplementedError("AgentProtocolSurface — use TS sdk.protocol")
