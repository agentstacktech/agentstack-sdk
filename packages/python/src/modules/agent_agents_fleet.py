"""
Agents fleet — Python HTTP client.

REST: `/api/projects/{project_id}/agents/*`
TS SDK: `sdk.agentsFleet`
"""

from __future__ import annotations

from typing import Any, Dict, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from ..client.agent_http import AgentHTTPClient


class AgentAgentsFleet:
    __slots__ = ("_http",)

    def __init__(self, http_client: "AgentHTTPClient") -> None:
        self._http = http_client

    def _base(self, project_id: int) -> str:
        return f"/projects/{project_id}/agents"

    async def list(self, project_id: int) -> Dict[str, Any]:
        return await self._http.get(self._base(project_id))

    async def start_run(
        self,
        project_id: int,
        agent_id: str,
        input_payload: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        return await self._http.post(
            f"{self._base(project_id)}/{agent_id}/runs/start",
            json={"input": input_payload or {}},
        )

    async def run_with_agnt_credits(
        self,
        project_id: int,
        agent_id: str,
        body: Dict[str, Any],
    ) -> Dict[str, Any]:
        return await self._http.post(
            f"{self._base(project_id)}/{agent_id}/runs/with-agnt-credits",
            json=body,
        )

    async def list_runs(
        self,
        project_id: int,
        agent_id: str,
        *,
        with_agc_purchase: Optional[bool] = None,
    ) -> Dict[str, Any]:
        params: Dict[str, Any] = {}
        if with_agc_purchase is not None:
            params["with_agc_purchase"] = "true" if with_agc_purchase else "false"
        return await self._http.get(
            f"{self._base(project_id)}/{agent_id}/runs",
            params=params or None,
        )
