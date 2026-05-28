"""
AgentNet platform-operator REST (`/api/admin/agentnet/*`).

Not for tenant integrators — ecosystem owner / AgentStack ops (typically project_id=1).
TS parity: ``AgentAdmin`` on ``sdk.admin`` (not on ``sdk.platform``).

Tenant apps use ``AgentEconomy`` (`/api/agentnet/{project_id}/*`) only.
Gene: ``sdk.economy.gen1``
"""

from __future__ import annotations

from typing import Any, Dict, Optional
from urllib.parse import quote

from ..client.agent_http import AgentHTTPClient

_PREFIX = "/admin/agentnet"


class AgentNetAdmin:
    """Platform-operator AgentNet control plane — never mix with tenant ``AgentEconomy``."""

    def __init__(self, client: AgentHTTPClient) -> None:
        self._http = client

    async def get_overview(self) -> Dict[str, Any]:
        return await self._http.get(f"{_PREFIX}/overview")

    async def get_network_health(self, project_id: int = 1) -> Dict[str, Any]:
        return await self._http.get(
            f"{_PREFIX}/network-health",
            params={"project_id": project_id},
        )

    async def get_network_dashboard(self, project_id: int = 1) -> Dict[str, Any]:
        return await self._http.get(
            f"{_PREFIX}/network-dashboard",
            params={"project_id": project_id},
        )

    async def get_demo_evidence_bundle(self, project_id: int = 1) -> Dict[str, Any]:
        return await self._http.get(
            f"{_PREFIX}/demo-evidence-bundle",
            params={"project_id": project_id},
        )

    async def get_hub_snapshot(
        self,
        project_id: int = 1,
        *,
        exclude_blanks: bool = True,
    ) -> Dict[str, Any]:
        return await self._http.get(
            f"{_PREFIX}/hub-snapshot",
            params={
                "project_id": project_id,
                "exclude_blanks": "false" if exclude_blanks is False else "true",
            },
        )

    async def get_grant_metrics(self) -> Dict[str, Any]:
        return await self._http.get(f"{_PREFIX}/grant-metrics")

    async def get_reconciliation_snapshot(self, project_id: int = 1) -> Dict[str, Any]:
        return await self._http.get(
            f"{_PREFIX}/reconciliation-snapshot",
            params={"project_id": project_id},
        )

    async def get_genome_lineage(self, entity_id: str) -> Dict[str, Any]:
        encoded = quote(entity_id, safe="")
        return await self._http.get(f"{_PREFIX}/genome/{encoded}")

    async def get_schema_status(self) -> Dict[str, Any]:
        return await self._http.get(f"{_PREFIX}/schema-status")

    async def get_chain_surface(self) -> Dict[str, Any]:
        return await self._http.get(f"{_PREFIX}/chain-surface")
