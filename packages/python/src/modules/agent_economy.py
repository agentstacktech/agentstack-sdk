"""
AgentNet economy — quote/purchase compute credits, ledger reads.

TS parity: ``sdk.platform.economy``
Gene: ``sdk.economy.gen1``
"""

from __future__ import annotations

from typing import Any, Dict, Optional


class AgentEconomy:
    def __init__(self, http_client: Any) -> None:
        self._http = http_client

    async def quote_compute_credits(
        self,
        project_id: int,
        body: Dict[str, Any],
    ) -> Dict[str, Any]:
        return await self._http.post(
            f"/agentnet/{project_id}/compute-credits/quote",
            json=body,
        )

    async def purchase_compute_credits(
        self,
        project_id: int,
        body: Dict[str, Any],
    ) -> Dict[str, Any]:
        return await self._http.post(
            f"/agentnet/{project_id}/compute-credits/purchase",
            json=body,
        )

    async def get_balance(
        self,
        project_id: int,
        account_key: str,
        asset_code: str = "AGNT",
    ) -> Dict[str, Any]:
        return await self._http.get(
            f"/agentnet/{project_id}/balance",
            params={"account_key": account_key, "asset_code": asset_code},
        )

    async def run_with_agnt_credits(
        self,
        project_id: int,
        agent_id: str,
        body: Dict[str, Any],
    ) -> Dict[str, Any]:
        return await self._http.post(
            f"/projects/{project_id}/agents/{agent_id}/runs/with-agnt-credits",
            json=body,
        )
