"""
Agents fleet — Python HTTP client.

REST: `/api/projects/{project_id}/agents/*`
TS SDK: `sdk.agentsFleet`
"""

from __future__ import annotations

import asyncio
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
        """List project-scoped agents."""
        return await self._http.get(self._base(project_id))

    async def get(self, project_id: int, agent_id: str) -> Dict[str, Any]:
        """Get one project-scoped agent."""
        return await self._http.get(f"{self._base(project_id)}/{agent_id}")

    async def list_templates(self, project_id: int) -> Dict[str, Any]:
        """List built-in templates for structured creation."""
        return await self._http.get(f"{self._base(project_id)}/templates")

    async def preview_template(
        self,
        project_id: int,
        *,
        template_id: str,
        name: str = "",
        template_input: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Preview an AgentSpec created from a template without persisting it."""
        return await self._http.post(
            f"{self._base(project_id)}/templates/preview",
            json={
                "template_id": template_id,
                "name": name,
                "template_input": template_input or {},
            },
        )

    async def create_from_template(
        self,
        project_id: int,
        *,
        template_id: str,
        name: str = "Agent",
        description: str = "",
        template_input: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Create an agent using the template catalog."""
        return await self._http.post(
            f"{self._base(project_id)}/from-template",
            json={
                "template_id": template_id,
                "name": name,
                "description": description,
                "template_input": template_input or {},
            },
        )

    async def start_run(
        self,
        project_id: int,
        agent_id: str,
        input_payload: Optional[Dict[str, Any]] = None,
        *,
        idempotency_key: Optional[str] = None,
        wait: bool = False,
        wait_timeout_s: float = 0.0,
        parent_run_id: Optional[str] = None,
        root_run_id: Optional[str] = None,
        handoff_to_agent_id: Optional[str] = None,
        handoff_reason: Optional[str] = None,
    ) -> Dict[str, Any]:
        return await self._http.post(
            f"{self._base(project_id)}/{agent_id}/runs/start",
            json={
                "input": input_payload or {},
                "idempotency_key": idempotency_key,
                "wait": wait,
                "wait_timeout_s": wait_timeout_s,
                "parent_run_id": parent_run_id,
                "root_run_id": root_run_id,
                "handoff_to_agent_id": handoff_to_agent_id,
                "handoff_reason": handoff_reason,
            },
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
        status: Optional[str] = None,
        since: Optional[str] = None,
        with_agc_purchase: Optional[bool] = None,
    ) -> Dict[str, Any]:
        """List runs with the same filters as REST/TS SDK."""
        params: Dict[str, Any] = {}
        if status:
            params["status"] = status
        if since:
            params["since"] = since
        if with_agc_purchase is not None:
            params["with_agc_purchase"] = "true" if with_agc_purchase else "false"
        return await self._http.get(
            f"{self._base(project_id)}/{agent_id}/runs",
            params=params or None,
        )

    async def list_pending_approvals(
        self,
        project_id: int,
        *,
        limit: int = 50,
        stale_only: bool = False,
    ) -> Dict[str, Any]:
        """List project-scoped runs waiting for human approval."""
        return await self._http.get(
            f"{self._base(project_id)}/approvals/pending",
            params={"limit": limit, "stale_only": stale_only},
        )

    async def get_run(self, project_id: int, agent_id: str, run_id: str) -> Optional[Dict[str, Any]]:
        """Return a run row by id."""
        return await self._http.get(f"{self._base(project_id)}/{agent_id}/runs/{run_id}")

    async def get_run_detail(self, project_id: int, agent_id: str, run_id: str) -> Dict[str, Any]:
        """Return normalized RunDetailDTO for cockpit/audit consumers."""
        payload = await self.get_run(project_id, agent_id, run_id)
        detail = (payload or {}).get("run_detail")
        if not isinstance(detail, dict):
            raise RuntimeError("run_detail_unavailable")
        return detail

    async def traces(self, project_id: int, agent_id: str, run_id: str) -> Dict[str, Any]:
        """Fetch run traces/events."""
        return await self._http.get(f"{self._base(project_id)}/{agent_id}/runs/{run_id}/traces")

    async def timeline(self, project_id: int, agent_id: str) -> Dict[str, Any]:
        """Fetch version timeline for an agent."""
        return await self._http.get(f"{self._base(project_id)}/{agent_id}/timeline")

    async def metrics(self, project_id: int, agent_id: str) -> Dict[str, Any]:
        """Fetch agent metrics."""
        return await self._http.get(f"{self._base(project_id)}/{agent_id}/metrics")

    async def gates(self, project_id: int, agent_id: str) -> Dict[str, Any]:
        """Fetch promotion/activation gates."""
        return await self._http.get(f"{self._base(project_id)}/{agent_id}/gates")

    async def approve_run(
        self,
        project_id: int,
        agent_id: str,
        run_id: str,
        *,
        reviewed_params: Optional[Dict[str, Any]] = None,
        reviewer_note: Optional[str] = None,
        approval_artifact_hash: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Approve a run waiting for a human checkpoint."""
        if not approval_artifact_hash:
            raise ValueError("approval_artifact_hash is required")
        return await self._http.post(
            f"{self._base(project_id)}/{agent_id}/runs/{run_id}/approve",
            json={
                "reviewed_params": reviewed_params,
                "reviewer_note": reviewer_note,
                "approval_artifact_hash": approval_artifact_hash,
            },
        )

    def stream_path(self, project_id: int, agent_id: str, run_id: str) -> str:
        """Return the relative SSE stream path for caller-managed streaming."""
        return f"{self._base(project_id)}/{agent_id}/runs/{run_id}/stream"

    async def poll_run_until_terminal(
        self,
        project_id: int,
        agent_id: str,
        run_id: str,
        *,
        timeout_s: float = 120.0,
        interval_s: float = 2.0,
    ) -> Optional[Dict[str, Any]]:
        """Poll a run until it reaches a terminal status or timeout."""
        terminal = {"completed", "failed", "cancelled"}
        deadline = asyncio.get_running_loop().time() + timeout_s
        while True:
            payload = await self.get_run(project_id, agent_id, run_id)
            row = (payload or {}).get("run")
            spec = (row or {}).get("agent_run_spec") or {}
            if spec.get("status") in terminal:
                return row
            if asyncio.get_running_loop().time() >= deadline:
                return row
            await asyncio.sleep(interval_s)
