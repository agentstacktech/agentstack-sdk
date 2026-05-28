"""
Project safe deletion (PSDP) — Python parity.

REST: `/api/projects/{id}/deletion-*`
TS SDK: `sdk.api.getDeletionInventory`, `scheduleProjectDeletion`, …
See `docs/ecosystem/PYTHON_SDK_PARITY.md`.
"""

from __future__ import annotations

from typing import Any, TYPE_CHECKING

if TYPE_CHECKING:
    from ..client.agent_http import AgentHTTPClient


class AgentProjectsDeletion:
    __slots__ = ("_http",)

    def __init__(self, http_client: "AgentHTTPClient") -> None:
        self._http = http_client

    async def get_inventory(
        self,
        project_id: int,
        *,
        refresh: bool = False,
    ) -> dict[str, Any]:
        params = {"refresh": "true"} if refresh else {}
        return await self._http.get(
            f"/api/projects/{project_id}/deletion-inventory",
            params=params,
        )

    async def schedule(
        self,
        project_id: int,
        *,
        confirm_name: str,
        execution_token: str,
        grace_days: int = 0,
    ) -> dict[str, Any]:
        return await self._http.post(
            f"/api/projects/{project_id}/deletion-schedule",
            json={
                "confirm_name": confirm_name,
                "execution_token": execution_token,
                "grace_days": grace_days,
            },
        )

    async def cancel(self, project_id: int) -> dict[str, Any]:
        return await self._http.post(
            f"/api/projects/{project_id}/deletion-cancel",
            json={},
        )

    async def execute(
        self,
        project_id: int,
        *,
        execution_token: str,
        idempotency_key: str | None = None,
    ) -> dict[str, Any]:
        headers = {}
        if idempotency_key:
            headers["Idempotency-Key"] = idempotency_key
        return await self._http.post(
            f"/api/projects/{project_id}/deletion-execute",
            json={"execution_token": execution_token},
            headers=headers or None,
        )

    async def status(self, project_id: int) -> dict[str, Any]:
        return await self._http.get(f"/api/projects/{project_id}/deletion-status")
