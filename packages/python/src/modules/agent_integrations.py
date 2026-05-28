"""
Integration Hub — Python parity stub.

Prefer TypeScript `@agentstack/sdk` `AgentIntegrations` or REST `/api/integrations/*`.
See `docs/ecosystem/PYTHON_SDK_PARITY.md`.
"""

from __future__ import annotations

from typing import Any, TYPE_CHECKING

if TYPE_CHECKING:
    from ..client.agent_http import AgentHTTPClient


class AgentIntegrations:
    """Placeholder module; expand with typed REST calls as parity requires."""

    __slots__ = ("_http",)

    def __init__(self, http_client: "AgentHTTPClient") -> None:
        self._http = http_client

    async def list_connections_stub(self) -> dict[str, Any]:
        """Explicit stub — implement with GET /api/integrations/connections."""
        raise NotImplementedError("AgentIntegrations.list_connections_stub — use TS SDK or REST")
