"""
Project catalog assets — CRUD + wizard presets.

TS parity: ``sdk.assets`` + ``@agentstack/sdk/commerce/assets`` deep links.
Gene: ``sdk.commerce.assets.gen1`` / ``core.commerce.assets.presets.gen1``
"""

from __future__ import annotations

from typing import Any, Dict, Optional


class AgentAssets:
    def __init__(self, http_client: Any) -> None:
        self._http = http_client

    async def list_asset_presets(self, project_id: int) -> Dict[str, Any]:
        """GET /api/projects/{project_id}/asset-presets — wizard preset fixture."""
        return await self._http.get(f"/projects/{project_id}/asset-presets")

    async def create_asset(
        self,
        project_id: int,
        body: Dict[str, Any],
    ) -> Dict[str, Any]:
        return await self._http.post(f"/projects/{project_id}/assets", data=body)

    async def get_asset(self, project_id: int, asset_id: str) -> Dict[str, Any]:
        return await self._http.get(f"/projects/{project_id}/assets/{asset_id}")

    async def list_assets(
        self,
        project_id: int,
        params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        return await self._http.get(f"/projects/{project_id}/assets", params=params or {})

    async def update_asset(
        self,
        project_id: int,
        asset_id: str,
        body: Dict[str, Any],
    ) -> Dict[str, Any]:
        return await self._http.put(
            f"/projects/{project_id}/assets/{asset_id}",
            data=body,
        )

    async def delete_asset(self, project_id: int, asset_id: str) -> Dict[str, Any]:
        return await self._http.delete(f"/projects/{project_id}/assets/{asset_id}")
