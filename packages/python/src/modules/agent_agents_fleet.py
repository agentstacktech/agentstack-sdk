"""
Agents fleet — Python HTTP client.

REST: `/api/projects/{project_id}/agents/*`
TS SDK: `sdk.agentsFleet`
"""

from __future__ import annotations

import asyncio
from typing import Any, Callable, Dict, Optional, TYPE_CHECKING

from .agent_agents_types import (
    run_status_from_get_run_payload,
    is_terminal_run_status,
)

if TYPE_CHECKING:
    from ..client.agent_http import AgentHTTPClient


def _merge_agent_spec(
    base: Dict[str, Any],
    patch: Dict[str, Any],
) -> Dict[str, Any]:
    """Deep merge for AgentSpec patches — mirrors TS ``mergeAgentSpec``."""
    out: Dict[str, Any] = dict(base)
    for key, value in patch.items():
        current = out.get(key)
        if (
            isinstance(value, dict)
            and isinstance(current, dict)
            and not isinstance(value, list)
            and not isinstance(current, list)
        ):
            out[key] = _merge_agent_spec(current, value)
        else:
            out[key] = value
    return out


def _start_run_body(
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
    return {
        "input": input_payload or {},
        "idempotency_key": idempotency_key,
        "wait": wait,
        "wait_timeout_s": wait_timeout_s,
        "parent_run_id": parent_run_id,
        "root_run_id": root_run_id,
        "handoff_to_agent_id": handoff_to_agent_id,
        "handoff_reason": handoff_reason,
    }


def _policy_preview_body(
    *,
    capabilities: Optional[list[str]] = None,
    forbidden_tools: Optional[list[str]] = None,
    approval_required_actions: Optional[list[str]] = None,
) -> Dict[str, Any]:
    return {
        "capabilities": list(capabilities or []),
        "forbidden_tools": list(forbidden_tools or []),
        "approval_required_actions": list(approval_required_actions or []),
    }


def _template_preview_body(
    *,
    template_id: str,
    name: str = "",
    template_input: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    return {
        "template_id": template_id,
        "name": name,
        "template_input": template_input or {},
    }


class AgentAgentsFleet:
    __slots__ = ("_http",)

    def __init__(self, http_client: "AgentHTTPClient") -> None:
        self._http = http_client

    def _base(self, project_id: int) -> str:
        return f"/projects/{project_id}/agents"

    @staticmethod
    def _mine_base() -> str:
        return "/users/me/agents"

    async def list_llm_providers(self) -> Dict[str, Any]:
        """Global LLM provider catalog (constructor UI v2)."""
        return await self._http.get("/agents/llm-providers")

    async def list_fap_templates(self) -> Dict[str, Any]:
        """Global FAP policy template catalog."""
        return await self._http.get("/agents/fap-templates")

    async def preview_policy(
        self,
        project_id: int,
        *,
        capabilities: Optional[list[str]] = None,
        forbidden_tools: Optional[list[str]] = None,
        approval_required_actions: Optional[list[str]] = None,
    ) -> Dict[str, Any]:
        """Expand policy patterns to live MCP actions (project scope)."""
        return await self._http.post(
            f"{self._base(project_id)}/policy/preview",
            json=_policy_preview_body(
                capabilities=capabilities,
                forbidden_tools=forbidden_tools,
                approval_required_actions=approval_required_actions,
            ),
        )

    async def preview_policy_mine(
        self,
        *,
        capabilities: Optional[list[str]] = None,
        forbidden_tools: Optional[list[str]] = None,
        approval_required_actions: Optional[list[str]] = None,
    ) -> Dict[str, Any]:
        """Expand policy patterns for personal agents."""
        return await self._http.post(
            f"{self._mine_base()}/policy/preview",
            json=_policy_preview_body(
                capabilities=capabilities,
                forbidden_tools=forbidden_tools,
                approval_required_actions=approval_required_actions,
            ),
        )

    async def create(self, project_id: int, name: str = "Agent") -> Dict[str, Any]:
        """Create a blank project-scoped agent."""
        return await self._http.post(self._base(project_id), json={"name": name})

    async def delete(self, project_id: int, agent_id: str) -> Dict[str, Any]:
        """Delete a project-scoped agent."""
        return await self._http.delete(f"{self._base(project_id)}/{agent_id}")

    async def fork(self, project_id: int, agent_id: str) -> Dict[str, Any]:
        """Fork agent spec to a new draft row."""
        return await self._http.post(f"{self._base(project_id)}/{agent_id}/fork", json={})

    async def promote(self, project_id: int, agent_id: str) -> Dict[str, Any]:
        """Promote agent through lifecycle gates."""
        return await self._http.post(f"{self._base(project_id)}/{agent_id}/promote", json={})

    async def kill(self, project_id: int, agent_id: str) -> Dict[str, Any]:
        """Kill agent (lifecycle terminal)."""
        return await self._http.post(f"{self._base(project_id)}/{agent_id}/kill", json={})

    async def advance_rollout(self, project_id: int, agent_id: str) -> Dict[str, Any]:
        """Advance tenant rollout step when configured."""
        return await self._http.post(
            f"{self._base(project_id)}/{agent_id}/rollout/advance",
            json={},
        )

    async def trust_surface(self, project_id: int, agent_id: str) -> Dict[str, Any]:
        """Fetch trust/autonomy surface for an agent."""
        return await self._http.get(f"{self._base(project_id)}/{agent_id}/trust-surface")

    async def import_from_asset(
        self,
        project_id: int,
        *,
        asset: Dict[str, Any],
        name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Import agent from commerce asset preset."""
        return await self._http.post(
            f"{self._base(project_id)}/import-from-asset",
            json={"asset": asset, "name": name},
        )

    async def update_spec_patch(
        self,
        project_id: int,
        agent_id: str,
        patch: Dict[str, Any],
    ) -> Dict[str, Any]:
        """GET + deep-merge + PUT — mirrors TS ``updateSpecPatch``."""
        current = await self.get(project_id, agent_id)
        agent = (current or {}).get("agent") or {}
        spec = agent.get("agent_spec") if isinstance(agent.get("agent_spec"), dict) else {}
        return await self.update(project_id, agent_id, _merge_agent_spec(spec, patch))

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
            json=_template_preview_body(
                template_id=template_id,
                name=name,
                template_input=template_input,
            ),
        )

    async def preview_template_mine(
        self,
        *,
        template_id: str,
        name: str = "",
        template_input: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Preview template merge for personal agents."""
        return await self._http.post(
            f"{self._mine_base()}/templates/preview",
            json=_template_preview_body(
                template_id=template_id,
                name=name,
                template_input=template_input,
            ),
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
            json=_start_run_body(
                input_payload,
                idempotency_key=idempotency_key,
                wait=wait,
                wait_timeout_s=wait_timeout_s,
                parent_run_id=parent_run_id,
                root_run_id=root_run_id,
                handoff_to_agent_id=handoff_to_agent_id,
                handoff_reason=handoff_reason,
            ),
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
        deadline = asyncio.get_running_loop().time() + timeout_s
        last_row: Optional[Dict[str, Any]] = None
        while True:
            payload = await self.get_run(project_id, agent_id, run_id)
            row = (payload or {}).get("run")
            last_row = row if isinstance(row, dict) else last_row
            status = run_status_from_get_run_payload(payload if isinstance(payload, dict) else None)
            if is_terminal_run_status(status):
                return last_row
            if asyncio.get_running_loop().time() >= deadline:
                return last_row
            await asyncio.sleep(interval_s)

    async def automation_map(self, project_id: int) -> Dict[str, Any]:
        """Aggregate fleet automation bindings (triggers, Logic rule ids)."""
        return await self._http.get(f"{self._base(project_id)}/automation-map")

    async def compile_workflow(
        self,
        project_id: int,
        workflow: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Compile a workflow graph for preview (no persist)."""
        return await self._http.post(
            f"{self._base(project_id)}/workflow/compile-preview",
            json={"workflow": workflow or {}},
        )

    async def export_pack(self, project_id: int, agent_id: str) -> Dict[str, Any]:
        """Export agent spec bundle sans secrets."""
        return await self._http.get(f"{self._base(project_id)}/{agent_id}/export-pack")

    async def import_pack(
        self,
        project_id: int,
        *,
        agent_spec: Dict[str, Any],
        template_id: Optional[str] = None,
        name: Optional[str] = None,
        fork_on_collision: bool = True,
    ) -> Dict[str, Any]:
        """Import agent pack JSON into the fleet."""
        return await self._http.post(
            f"{self._base(project_id)}/import-pack",
            json={
                "agent_spec": agent_spec,
                "template_id": template_id,
                "name": name,
                "fork_on_collision": fork_on_collision,
            },
        )

    async def update(
        self,
        project_id: int,
        agent_id: str,
        agent_spec: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Update agent spec (re-save Automate / bindings)."""
        return await self._http.put(
            f"{self._base(project_id)}/{agent_id}",
            json={"agent_spec": agent_spec},
        )

    async def stop_run(
        self,
        project_id: int,
        agent_id: str,
        run_id: str,
        *,
        reason: Optional[str] = None,
        reviewer_note: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Stop a non-terminal run."""
        return await self._http.post(
            f"{self._base(project_id)}/{agent_id}/runs/{run_id}/stop",
            json={"reason": reason, "reviewer_note": reviewer_note},
        )

    async def fleet_diagnostics(self, project_id: int) -> Dict[str, Any]:
        """Fleet diagnostics aggregate (orchestration hub parity)."""
        return await self._http.get(f"{self._base(project_id)}/fleet/diagnostics")

    async def reconcile_run(self, project_id: int, run_uuid: str) -> Dict[str, Any]:
        """Reconcile one run row to terminal state when worker lost it."""
        return await self._http.post(
            f"{self._base(project_id)}/runs/{run_uuid}/reconcile",
        )

    async def sweep_stale_runs(
        self,
        project_id: int,
        *,
        agent_uuid: Optional[str] = None,
        limit: int = 25,
    ) -> Dict[str, Any]:
        """Sweep stale non-terminal runs (fleet repair)."""
        return await self._http.post(
            f"{self._base(project_id)}/fleet/sweep-stale-runs",
            json={"agent_uuid": agent_uuid, "limit": limit},
        )

    @staticmethod
    def workflow_run_command(agent_id: str) -> str:
        """Stable Logic command id for compiled workflow execution (AO6-11)."""
        return f"agents.workflow.run.{agent_id}"

    # ------------------------------------------------------------------
    # Personal agents — ``GET/POST /api/users/me/agents/*``
    # ------------------------------------------------------------------

    async def list_mine(self) -> Dict[str, Any]:
        return await self._http.get(self._mine_base())

    async def get_mine(self, agent_id: str) -> Dict[str, Any]:
        return await self._http.get(f"{self._mine_base()}/{agent_id}")

    async def create_mine(self, name: str = "Agent") -> Dict[str, Any]:
        return await self._http.post(self._mine_base(), json={"name": name})

    async def update_mine(self, agent_id: str, agent_spec: Dict[str, Any]) -> Dict[str, Any]:
        return await self._http.put(
            f"{self._mine_base()}/{agent_id}",
            json={"agent_spec": agent_spec},
        )

    async def delete_mine(self, agent_id: str) -> Dict[str, Any]:
        return await self._http.delete(f"{self._mine_base()}/{agent_id}")

    async def update_spec_patch_mine(
        self,
        agent_id: str,
        patch: Dict[str, Any],
    ) -> Dict[str, Any]:
        current = await self.get_mine(agent_id)
        agent = (current or {}).get("agent") or {}
        spec = agent.get("agent_spec") if isinstance(agent.get("agent_spec"), dict) else {}
        return await self.update_mine(agent_id, _merge_agent_spec(spec, patch))

    async def fork_mine(self, agent_id: str) -> Dict[str, Any]:
        return await self._http.post(f"{self._mine_base()}/{agent_id}/fork", json={})

    async def promote_mine(self, agent_id: str) -> Dict[str, Any]:
        return await self._http.post(f"{self._mine_base()}/{agent_id}/promote", json={})

    async def kill_mine(self, agent_id: str) -> Dict[str, Any]:
        return await self._http.post(f"{self._mine_base()}/{agent_id}/kill", json={})

    async def advance_rollout_mine(self, agent_id: str) -> Dict[str, Any]:
        return await self._http.post(
            f"{self._mine_base()}/{agent_id}/rollout/advance",
            json={},
        )

    async def start_run_mine(
        self,
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
            f"{self._mine_base()}/{agent_id}/runs/start",
            json=_start_run_body(
                input_payload,
                idempotency_key=idempotency_key,
                wait=wait,
                wait_timeout_s=wait_timeout_s,
                parent_run_id=parent_run_id,
                root_run_id=root_run_id,
                handoff_to_agent_id=handoff_to_agent_id,
                handoff_reason=handoff_reason,
            ),
        )

    async def list_runs_mine(
        self,
        agent_id: str,
        *,
        status: Optional[str] = None,
        since: Optional[str] = None,
        with_agc_purchase: Optional[bool] = None,
    ) -> Dict[str, Any]:
        params: Dict[str, Any] = {}
        if status:
            params["status"] = status
        if since:
            params["since"] = since
        if with_agc_purchase is not None:
            params["with_agc_purchase"] = "true" if with_agc_purchase else "false"
        return await self._http.get(
            f"{self._mine_base()}/{agent_id}/runs",
            params=params or None,
        )

    async def list_pending_approvals_mine(
        self,
        *,
        limit: int = 50,
        stale_only: bool = False,
    ) -> Dict[str, Any]:
        return await self._http.get(
            f"{self._mine_base()}/approvals/pending",
            params={"limit": limit, "stale_only": stale_only},
        )

    async def get_run_mine(self, agent_id: str, run_id: str) -> Dict[str, Any]:
        return await self._http.get(f"{self._mine_base()}/{agent_id}/runs/{run_id}")

    async def get_run_detail_mine(self, agent_id: str, run_id: str) -> Dict[str, Any]:
        payload = await self.get_run_mine(agent_id, run_id)
        detail = (payload or {}).get("run_detail")
        if not isinstance(detail, dict):
            raise RuntimeError("run_detail_unavailable")
        return detail

    async def stop_run_mine(
        self,
        agent_id: str,
        run_id: str,
        *,
        reason: Optional[str] = None,
        reviewer_note: Optional[str] = None,
    ) -> Dict[str, Any]:
        return await self._http.post(
            f"{self._mine_base()}/{agent_id}/runs/{run_id}/stop",
            json={"reason": reason, "reviewer_note": reviewer_note},
        )

    async def approve_run_mine(
        self,
        agent_id: str,
        run_id: str,
        *,
        reviewed_params: Optional[Dict[str, Any]] = None,
        reviewer_note: Optional[str] = None,
        approval_artifact_hash: Optional[str] = None,
    ) -> Dict[str, Any]:
        if not approval_artifact_hash:
            raise ValueError("approval_artifact_hash is required")
        return await self._http.post(
            f"{self._mine_base()}/{agent_id}/runs/{run_id}/approve",
            json={
                "reviewed_params": reviewed_params,
                "reviewer_note": reviewer_note,
                "approval_artifact_hash": approval_artifact_hash,
            },
        )

    async def metrics_mine(self, agent_id: str) -> Dict[str, Any]:
        return await self._http.get(f"{self._mine_base()}/{agent_id}/metrics")

    async def gates_mine(self, agent_id: str) -> Dict[str, Any]:
        return await self._http.get(f"{self._mine_base()}/{agent_id}/gates")

    async def timeline_mine(self, agent_id: str) -> Dict[str, Any]:
        return await self._http.get(f"{self._mine_base()}/{agent_id}/timeline")

    async def traces_mine(self, agent_id: str, run_id: str) -> Dict[str, Any]:
        return await self._http.get(f"{self._mine_base()}/{agent_id}/runs/{run_id}/traces")

    def stream_path_mine(self, agent_id: str, run_id: str) -> str:
        return f"{self._mine_base()}/{agent_id}/runs/{run_id}/stream"

    async def list_templates_mine(self) -> Dict[str, Any]:
        return await self._http.get(f"{self._mine_base()}/templates")

    async def create_from_template_mine(
        self,
        *,
        template_id: str,
        name: str = "Agent",
        description: str = "",
        template_input: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        return await self._http.post(
            f"{self._mine_base()}/from-template",
            json={
                "template_id": template_id,
                "name": name,
                "description": description,
                "template_input": template_input or {},
            },
        )

    def for_project(self, project_id: int) -> "ProjectAgentsFleetScope":
        """Bind ``project_id`` for chained calls (TS ``forProject`` parity)."""
        return ProjectAgentsFleetScope(self, int(project_id))


_PROJECT_SCOPE_ASYNC = frozenset(
    {
        "list",
        "get",
        "create",
        "delete",
        "fork",
        "promote",
        "kill",
        "advance_rollout",
        "trust_surface",
        "list_templates",
        "preview_template",
        "preview_policy",
        "create_from_template",
        "automation_map",
        "fleet_diagnostics",
        "reconcile_run",
        "sweep_stale_runs",
        "compile_workflow",
        "export_pack",
        "import_pack",
        "import_from_asset",
        "update",
        "update_spec_patch",
        "start_run",
        "run_with_agnt_credits",
        "list_runs",
        "list_pending_approvals",
        "get_run",
        "get_run_detail",
        "stop_run",
        "approve_run",
        "metrics",
        "gates",
        "timeline",
        "traces",
        "poll_run_until_terminal",
    }
)
_PROJECT_SCOPE_SYNC = frozenset({"stream_path"})


class ProjectAgentsFleetScope:
    """Project-bound facade — avoids repeating ``project_id`` in scripts."""

    __slots__ = ("_fleet", "project_id")

    def __init__(self, fleet: AgentAgentsFleet, project_id: int) -> None:
        self._fleet = fleet
        self.project_id = int(project_id)

    def __getattr__(self, name: str) -> Callable[..., Any]:
        if name in _PROJECT_SCOPE_SYNC:
            method = getattr(self._fleet, name)

            def bound(*args: Any, **kwargs: Any) -> Any:
                return method(self.project_id, *args, **kwargs)

            return bound
        if name in _PROJECT_SCOPE_ASYNC:
            method = getattr(self._fleet, name)

            async def bound(*args: Any, **kwargs: Any) -> Any:
                return await method(self.project_id, *args, **kwargs)

            return bound
        raise AttributeError(f"{type(self).__name__!r} has no attribute {name!r}")
