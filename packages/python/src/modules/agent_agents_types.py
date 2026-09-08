"""Agents fleet DTO helpers — mirrors TS ``AgentsFleet`` types (sdk.agents.gen1)."""

from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional, TypedDict

AgentRunStatus = Literal[
    "queued",
    "running",
    "waiting_for_approval",
    "completed",
    "failed",
    "cancelled",
]

TERMINAL_RUN_STATUSES = frozenset({"completed", "failed", "cancelled"})


class AgentRunEventDTO(TypedDict, total=False):
    ts: str
    kind: str
    stage: str
    hlc: int
    seq: int
    data: Dict[str, Any]


class AgentRunDetailDTO(TypedDict, total=False):
    run_id: str
    agent_id: str
    project_id: int
    status: str
    stage: Optional[str]
    input: Dict[str, Any]
    output: Dict[str, Any]
    error: Optional[str]
    started_at: Optional[str]
    finished_at: Optional[str]
    approval_artifact_hash: Optional[str]
    timeline: List[AgentRunEventDTO]
    summary: Dict[str, Any]


def run_status_from_get_run_payload(payload: Optional[Dict[str, Any]]) -> Optional[str]:
    """Extract status from ``GET .../runs/{id}`` payload."""
    detail = (payload or {}).get("run_detail")
    if isinstance(detail, dict) and detail.get("status"):
        return str(detail["status"])
    row = (payload or {}).get("run")
    spec = (row or {}).get("agent_run_spec") if isinstance(row, dict) else {}
    if isinstance(spec, dict) and spec.get("status"):
        return str(spec["status"])
    return None


def is_terminal_run_status(status: Optional[str]) -> bool:
    return str(status or "") in TERMINAL_RUN_STATUSES


def approval_artifact_hash_from_detail(detail: Dict[str, Any]) -> Optional[str]:
    """Return hash required for ``approve_run`` (cockpit / audit SoT)."""
    direct = detail.get("approval_artifact_hash")
    if direct:
        return str(direct)
    review = detail.get("approval_review")
    if isinstance(review, dict) and review.get("approval_artifact_hash"):
        return str(review["approval_artifact_hash"])
    return None
